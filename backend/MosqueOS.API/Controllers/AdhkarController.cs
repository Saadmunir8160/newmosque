using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Adhkar;
using MosqueOS.API.Models.Common;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/adhkar")]
    [ApiController]
    public class AdhkarController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public AdhkarController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        // ---- Library ----

        [HttpGet("items")]
        public async Task<IActionResult> GetItems([FromQuery] string? category)
        {
            var query = _unitOfWork.Repository<AdhkarItem>().QueryNoTracking()
                .Where(a => !string.IsNullOrWhiteSpace(a.Title) && a.Status == ContentPublishStatus.Published);
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
            return Ok(await query.OrderBy(a => a.Title).ToListAsync());
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] AdhkarItem item)
        {
            item.Id = 0;
            if (item.Status == 0)
                item.Status = ContentPublishStatus.Draft;
            _unitOfWork.Repository<AdhkarItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("items/{id:int}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] AdhkarItem input)
        {
            var item = await _unitOfWork.Repository<AdhkarItem>().FindAsync(id);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.ArabicText = input.ArabicText;
            item.Transliteration = input.Transliteration;
            item.Translation = input.Translation;
            item.DefaultCount = input.DefaultCount;
            item.Category = input.Category;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("items/{id:int}/publish")]
        public async Task<IActionResult> PublishItem(int id)
        {
            var item = await _unitOfWork.Repository<AdhkarItem>().FindAsync(id);
            if (item == null) return NotFound();
            item.Status = ContentPublishStatus.Published;
            item.PublishedAt = DateTime.UtcNow;
            item.PublishedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            item.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        // ---- Personal adhkar list ----

        [Authorize]
        [HttpGet("mine")]
        public async Task<IActionResult> Mine([FromQuery] bool relevantOnly = false)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var query = _unitOfWork.Repository<UserAdhkar>().QueryNoTracking()
                .Include(u => u.AdhkarItem)
                .Where(u => u.UserId == userId);

            if (relevantOnly)
            {
                var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
                var today = DateOnly.FromDateTime(now);
                var isFriday = now.DayOfWeek == DayOfWeek.Friday;
                var isRamadan = await IsRamadanAsync(today);
                var hasSpecialEvent = await HasSpecialEventTodayAsync(today);

                query = query.Where(u =>
                    u.Occasion == AdhkarOccasion.Always
                    || (isFriday && u.Occasion == AdhkarOccasion.Friday)
                    || (isRamadan && u.Occasion == AdhkarOccasion.Ramadan)
                    || (hasSpecialEvent && u.Occasion == AdhkarOccasion.SpecialEvent));
            }

            var items = await query.ToListAsync();
            var todayUtc = DateOnly.FromDateTime(DateTime.UtcNow);
            var ids = items.Select(i => i.Id).ToList();
            var logs = await _unitOfWork.Repository<UserAdhkarLog>().QueryNoTracking()
                .Where(l => ids.Contains(l.UserAdhkarId) && l.Date == todayUtc)
                .ToListAsync();

            return Ok(items.Select(i => new MyAdhkarItemResponse
            {
                UserAdhkar = i,
                TodayCount = logs.FirstOrDefault(l => l.UserAdhkarId == i.Id)?.CountCompleted ?? 0
            }));
        }

        /// <summary>Minimal summary for My Wird page card — full detail lives on Adhkar Dashboard (spec 3.8).</summary>
        [Authorize]
        [HttpGet("mine/summary")]
        public async Task<IActionResult> MineSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var items = await _unitOfWork.Repository<UserAdhkar>().QueryNoTracking()
                .Where(u => u.UserId == userId)
                .ToListAsync();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ids = items.Select(i => i.Id).ToList();
            var logs = await _unitOfWork.Repository<UserAdhkarLog>().QueryNoTracking()
                .Where(l => ids.Contains(l.UserAdhkarId) && l.Date == today)
                .ToListAsync();

            var totalTarget = items.Sum(i => i.TargetCount);
            var totalDone = logs.Sum(l => l.CountCompleted);
            var completeItems = items.Count(i =>
            {
                var done = logs.FirstOrDefault(l => l.UserAdhkarId == i.Id)?.CountCompleted ?? 0;
                return done >= i.TargetCount;
            });

            return Ok(new AdhkarSummaryResponse
            {
                ItemCount = items.Count,
                CompletedItemCount = completeItems,
                TodayCompleted = totalDone,
                TodayTarget = totalTarget,
                ProgressLabel = totalTarget == 0 ? "0/0" : $"{totalDone}/{totalTarget}"
            });
        }

        [Authorize]
        [HttpPost("mine")]
        public async Task<IActionResult> AddToMine([FromBody] UserAdhkar item)
        {
            item.Id = 0;
            item.UserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

            if (item.AdhkarItemId.HasValue)
            {
                var exists = await _unitOfWork.Repository<UserAdhkar>().QueryNoTracking()
                    .AnyAsync(u => u.UserId == item.UserId && u.AdhkarItemId == item.AdhkarItemId);
                if (exists)
                    return Conflict(new ApiMessageResponse { Message = "This dhikr is already on your daily list." });
            }

            if (item.TargetCount <= 0) item.TargetCount = 1;
            _unitOfWork.Repository<UserAdhkar>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize]
        [HttpPut("mine/{id:int}")]
        public async Task<IActionResult> UpdateMine(int id, [FromBody] UpdateMyAdhkarRequest input)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var item = await _unitOfWork.Repository<UserAdhkar>().Query()
                .FirstOrDefaultAsync(u => u.Id == id && u.UserId == userId);
            if (item == null) return NotFound();

            if (input.TargetCount.HasValue && input.TargetCount.Value > 0)
                item.TargetCount = input.TargetCount.Value;
            if (input.PrayerSlot.HasValue)
                item.PrayerSlot = input.PrayerSlot;
            if (input.ClearPrayerSlot == true)
                item.PrayerSlot = null;
            if (input.Occasion.HasValue)
                item.Occasion = input.Occasion.Value;
            if (input.CustomTitle != null)
                item.CustomTitle = input.CustomTitle;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize]
        [HttpDelete("mine/{id:int}")]
        public async Task<IActionResult> RemoveFromMine(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var item = await _unitOfWork.Repository<UserAdhkar>().Query().FirstOrDefaultAsync(u => u.Id == id && u.UserId == userId);
            if (item == null) return NotFound();

            var logs = _unitOfWork.Repository<UserAdhkarLog>().Query().Where(l => l.UserAdhkarId == id);
            _unitOfWork.Repository<UserAdhkarLog>().RemoveRange(logs);
            _unitOfWork.Repository<UserAdhkar>().Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>+1 / +10 counter interaction. Returns running total like 43/50.</summary>
        [Authorize]
        [HttpPost("mine/{id:int}/increment")]
        public async Task<IActionResult> Increment(int id, [FromQuery] int by = 1)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var item = await _unitOfWork.Repository<UserAdhkar>().Query().FirstOrDefaultAsync(u => u.Id == id && u.UserId == userId);
            if (item == null) return NotFound();
            if (by != 1 && by != 10) by = 1;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var log = await _unitOfWork.Repository<UserAdhkarLog>().Query()
                .FirstOrDefaultAsync(l => l.UserAdhkarId == id && l.Date == today);

            if (log == null)
            {
                log = new UserAdhkarLog { UserAdhkarId = id, Date = today, CountCompleted = 0 };
                _unitOfWork.Repository<UserAdhkarLog>().Add(log);
            }

            log.CountCompleted = Math.Min(log.CountCompleted + by, item.TargetCount);
            log.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            return Ok(new AdhkarIncrementResponse
            {
                Completed = log.CountCompleted,
                Target = item.TargetCount,
                IsComplete = log.CountCompleted >= item.TargetCount,
                ProgressLabel = $"{log.CountCompleted}/{item.TargetCount}"
            });
        }

        private async Task<bool> IsRamadanAsync(DateOnly today)
        {
            var publishedIds = await _unitOfWork.Repository<RamadanTimetable>().QueryNoTracking()
                .Where(t => t.Status == PublishStatus.Published)
                .Select(t => t.Id)
                .ToListAsync();
            if (publishedIds.Count == 0) return false;
            return await _unitOfWork.Repository<RamadanDayEntry>().QueryNoTracking()
                .AnyAsync(d => d.Date == today && publishedIds.Contains(d.TimetableId));
        }

        private async Task<bool> HasSpecialEventTodayAsync(DateOnly today)
        {
            return await _unitOfWork.Repository<Event>().QueryNoTracking()
                .AnyAsync(e => e.Date == today && e.Status == EventStatus.Scheduled);
        }
    }
}
