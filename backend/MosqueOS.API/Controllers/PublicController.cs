using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Public;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    /// <summary>Read-only public endpoints for unauthenticated guests (no registration required).</summary>
    [Route("api/v1/public")]
    [ApiController]
    [AllowAnonymous]
    public class PublicController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public PublicController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        private static bool IsPubliclyVisible(Mosque mosque) =>
            mosque is { IsDeleted: false }
            && (mosque.Status == MosqueStatus.Active || mosque.Status == MosqueStatus.Unclaimed);

        private static DateOnly TodayLondon() =>
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time")));

        // ---- Home ----

        [HttpGet("home")]
        public async Task<IActionResult> Home([FromQuery] int? mosqueId)
        {
            var id = mosqueId ?? await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Select(m => (int?)m.Id).FirstOrDefaultAsync();
            if (!id.HasValue) return Ok(new PublicHomeResponse());

            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);
            if (mosque == null) return NotFound();

            var today = TodayLondon();
            var announcements = await _unitOfWork.Repository<Announcement>().QueryNoTracking()
                .Where(a => a.MosqueId == id && a.Status == PublishStatus.Published)
                .OrderByDescending(a => a.IsFeatured)
                .ThenByDescending(a => a.PublishedAt)
                .Take(5)
                .ToListAsync();

            var events = await _unitOfWork.Repository<Event>().QueryNoTracking()
                .Where(e => e.MosqueId == id && e.Date >= today && e.Status == EventStatus.Scheduled)
                .OrderBy(e => e.Date).ThenBy(e => e.StartTime)
                .Take(5)
                .ToListAsync();

            var prayer = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
                .FirstOrDefaultAsync(p => p.MosqueId == id && p.Date == today && p.Status == PublishStatus.Published);

            return Ok(new PublicHomeResponse
            {
                Mosque = MapMosque(mosque),
                Announcements = announcements.Cast<object>().ToList(),
                UpcomingEvents = events.Cast<object>().ToList(),
                TodayPrayerTimes = prayer
            });
        }

        // ---- Mosque ----

        [HttpGet("mosques/{id:int}")]
        public async Task<IActionResult> GetMosque(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);
            if (mosque == null || !IsPubliclyVisible(mosque))
                return NotFound();
            return Ok(MapMosque(mosque));
        }

        /// <summary>Deprecated — use GET /api/v1/mosques/{slug} instead.</summary>
        [HttpGet("mosques/by-slug/{slug}")]
        public async Task<IActionResult> GetMosqueBySlug(string slug)
        {
            Response.Headers.Append("X-Deprecated-Endpoint", "Use GET /api/v1/mosques/{slug}");

            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Slug == slug && !m.IsDeleted);
            if (mosque == null)
                return NotFound();

            if (!IsPubliclyVisible(mosque))
            {
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "This mosque is not published. Use GET /api/v1/mosques/{slug} for the canonical public profile.",
                    canonicalUrl = $"/api/v1/mosques/{slug}"
                });
            }

            return Ok(MapMosque(mosque));
        }

        // ---- Prayer times ----

        [HttpGet("mosques/{mosqueId:int}/prayer-times/daily")]
        public async Task<IActionResult> DailyPrayer(int mosqueId, [FromQuery] DateOnly? date)
        {
            var target = date ?? TodayLondon();
            var row = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
                .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == target && p.Status == PublishStatus.Published);
            if (row == null)
                return Ok(new { date = target, times = (PrayerTimesDaily?)null, jumuah = Array.Empty<JumuahTime>() });

            var jumuah = await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
                .Where(j => j.MosqueId == mosqueId).OrderBy(j => j.SlotNumber).ToListAsync();

            return Ok(new { date = target, times = row, jumuah });
        }

        [HttpGet("mosques/{mosqueId:int}/prayer-times/monthly")]
        public async Task<IActionResult> MonthlyPrayer(int mosqueId, [FromQuery] int? year, [FromQuery] int? month)
        {
            var today = TodayLondon();
            var y = year ?? today.Year;
            var m = month ?? today.Month;
            var start = new DateOnly(y, m, 1);
            var end = start.AddMonths(1).AddDays(-1);

            var rows = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
                .Where(p => p.MosqueId == mosqueId && p.Date >= start && p.Date <= end && p.Status == PublishStatus.Published)
                .OrderBy(p => p.Date)
                .ToListAsync();

            return Ok(new { year = y, month = m, days = rows });
        }

        // ---- Announcements ----

        [HttpGet("mosques/{mosqueId:int}/announcements")]
        public async Task<IActionResult> Announcements(int mosqueId, [FromQuery] string? search)
        {
            var query = _unitOfWork.Repository<Announcement>().QueryNoTracking()
                .Where(a => a.MosqueId == mosqueId && a.Status == PublishStatus.Published);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(a => a.Title.Contains(term) || (a.Summary != null && a.Summary.Contains(term)));
            }
            return Ok(await query.OrderByDescending(a => a.PublishedAt).ToListAsync());
        }

        // ---- Events ----

        [HttpGet("mosques/{mosqueId:int}/events")]
        public async Task<IActionResult> Events(int mosqueId, [FromQuery] bool upcomingOnly = true, [FromQuery] string? search = null)
        {
            var query = _unitOfWork.Repository<Event>().QueryNoTracking()
                .Where(e => e.MosqueId == mosqueId && e.Status == EventStatus.Scheduled);
            if (upcomingOnly)
            {
                var today = TodayLondon();
                query = query.Where(e => e.Date >= today);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e => e.Title.Contains(term) || (e.Description != null && e.Description.Contains(term)));
            }
            return Ok(await query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync());
        }

        [HttpGet("mosques/{mosqueId:int}/events/{id:int}")]
        public async Task<IActionResult> EventDetail(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<Event>().QueryNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId && e.Status == EventStatus.Scheduled);
            return item == null ? NotFound() : Ok(item);
        }

        // ---- Janaza ----

        [HttpGet("mosques/{mosqueId:int}/janaza")]
        public async Task<IActionResult> Janaza(int mosqueId, [FromQuery] bool activeOnly = true)
        {
            var query = _unitOfWork.Repository<JanazaAnnouncement>().QueryNoTracking()
                .Where(j => j.MosqueId == mosqueId && j.Status == PublishStatus.Published);
            if (activeOnly)
            {
                var today = TodayLondon();
                query = query.Where(j => j.JanazaDate >= today);
            }
            return Ok(await query.OrderBy(j => j.JanazaDate).ThenBy(j => j.JanazaTime).ToListAsync());
        }

        // ---- Communities (read-only listing) ----

        [HttpGet("communities")]
        public async Task<IActionResult> Communities([FromQuery] int? mosqueId, [FromQuery] string? search)
        {
            var query = _unitOfWork.Repository<Community>().QueryNoTracking().Where(c => c.IsPublic);
            if (mosqueId.HasValue) query = query.Where(c => c.MosqueId == mosqueId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(c => c.Name.Contains(term) || (c.Description != null && c.Description.Contains(term)));
            }
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        // ---- Spiritual content (published only) ----

        [HttpGet("duas")]
        public async Task<IActionResult> Duas([FromQuery] string? category)
        {
            var query = _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == ContentPublishStatus.Published);
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);
            return Ok(await query.OrderBy(d => d.Category).ThenBy(d => d.Title).ToListAsync());
        }

        [HttpGet("duas/categories")]
        public async Task<IActionResult> DuaCategories() =>
            Ok(await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == ContentPublishStatus.Published)
                .Select(d => d.Category).Distinct().OrderBy(c => c).ToListAsync());

        [HttpGet("adhkar")]
        public async Task<IActionResult> Adhkar([FromQuery] string? category)
        {
            var query = _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                .Where(a => a.Status == ContentPublishStatus.Published && !string.IsNullOrWhiteSpace(a.Title));
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
            return Ok(await query.OrderBy(a => a.Title).ToListAsync());
        }

        [HttpGet("ritual-guides")]
        public async Task<IActionResult> RitualGuides([FromQuery] RitualGuideType? type)
        {
            var query = _unitOfWork.Repository<RitualGuide>().QueryNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.OrderBy(g => g.Title).ToListAsync());
        }

        [HttpGet("ritual-guides/{id:int}")]
        public async Task<IActionResult> RitualGuide(int id)
        {
            var guide = await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                .Include(g => g.Steps.OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.Dua)
                .FirstOrDefaultAsync(g => g.Id == id);
            return guide == null ? NotFound() : Ok(guide);
        }

        [HttpGet("journey-guides")]
        public async Task<IActionResult> JourneyGuides([FromQuery] JourneyType? type)
        {
            var query = _unitOfWork.Repository<JourneyGuide>().QueryNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.OrderBy(g => g.Title).ToListAsync());
        }

        [HttpGet("journey-guides/{id:int}")]
        public async Task<IActionResult> JourneyGuide(int id)
        {
            var guide = await _unitOfWork.Repository<JourneyGuide>().QueryNoTracking()
                .Include(g => g.Stages.OrderBy(s => s.OrderIndex))
                .FirstOrDefaultAsync(g => g.Id == id);
            return guide == null ? NotFound() : Ok(guide);
        }

        private static PublicMosqueSummary MapMosque(Mosque m) => new()
        {
            Id = m.Id,
            Name = m.Name,
            Slug = m.Slug,
            City = m.City,
            Address = m.Address,
            Postcode = m.Postcode,
            Phone = m.Phone,
            Email = m.Email,
            Website = m.Website,
            Description = m.Description,
            Latitude = m.Latitude,
            Longitude = m.Longitude
        };
    }
}
