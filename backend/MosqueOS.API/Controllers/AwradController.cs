using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/awrad")]
    [ApiController]
    public class AwradController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public AwradController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        // ---- Collections ----

        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections([FromQuery] Tariqa? tariqa, [FromQuery] WirdCollectionType? type)
        {
            var query = _unitOfWork.Repository<WirdCollection>().QueryNoTracking().AsQueryable();
            if (tariqa.HasValue) query = query.Where(c => c.Tariqa == tariqa || c.Tariqa == Tariqa.General);
            if (type.HasValue) query = query.Where(c => c.Type == type);
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        /// <summary>Full guided reading: ordered steps with Arabic, transliteration, translation, audio.</summary>
        [HttpGet("collections/{id:int}")]
        public async Task<IActionResult> GetCollection(int id)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Include(c => c.Steps.OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.ContentItem)
                .FirstOrDefaultAsync(c => c.Id == id);
            return collection == null ? NotFound() : Ok(collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections")]
        public async Task<IActionResult> CreateCollection([FromBody] WirdCollection collection)
        {
            collection.Id = 0;
            _unitOfWork.Repository<WirdCollection>().Add(collection);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCollection), new { id = collection.Id }, collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections/{id:int}/steps")]
        public async Task<IActionResult> AddStep(int id, [FromBody] WirdStep step)
        {
            step.Id = 0;
            step.CollectionId = id;
            _unitOfWork.Repository<WirdStep>().Add(step);
            await _unitOfWork.SaveChangesAsync();
            return Ok(step);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpDelete("steps/{stepId:int}")]
        public async Task<IActionResult> DeleteStep(int stepId)
        {
            var step = await _unitOfWork.Repository<WirdStep>().FindAsync(stepId);
            if (step == null) return NotFound();
            _unitOfWork.Repository<WirdStep>().Remove(step);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        // ---- Content items ----

        [HttpGet("content-items")]
        public async Task<IActionResult> GetContentItems() =>
            Ok(await _unitOfWork.Repository<ContentItem>().QueryNoTracking().OrderBy(c => c.Title).ToListAsync());

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("content-items")]
        public async Task<IActionResult> CreateContentItem([FromBody] ContentItem item)
        {
            item.Id = 0;
            _unitOfWork.Repository<ContentItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("content-items/{id:int}")]
        public async Task<IActionResult> UpdateContentItem(int id, [FromBody] ContentItem input)
        {
            var item = await _unitOfWork.Repository<ContentItem>().FindAsync(id);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.ArabicText = input.ArabicText;
            item.Transliteration = input.Transliteration;
            item.Translation = input.Translation;
            item.RepeatCount = input.RepeatCount;
            item.AudioUrl = input.AudioUrl;
            item.SourceRef = input.SourceRef;
            item.Type = input.Type;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        // ---- Personal wird schedule (Wird Builder) ----

        [Authorize]
        [HttpGet("my-schedule")]
        public async Task<IActionResult> MySchedule()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Include(s => s.Collection)
                .Where(s => s.UserId == userId)
                .ToListAsync());
        }

        [Authorize]
        [HttpPost("my-schedule")]
        public async Task<IActionResult> SetSchedule([FromBody] UserWirdSchedule schedule)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var existing = await _unitOfWork.Repository<UserWirdSchedule>().Query()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.PrayerSlot == schedule.PrayerSlot);

            if (existing != null)
            {
                existing.CollectionId = schedule.CollectionId;
                existing.Mode = schedule.Mode;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                schedule.Id = 0;
                schedule.UserId = userId;
                _unitOfWork.Repository<UserWirdSchedule>().Add(schedule);
            }

            await _unitOfWork.SaveChangesAsync();
            return Ok(new { message = "Schedule saved." });
        }

        [Authorize]
        [HttpDelete("my-schedule/{slot}")]
        public async Task<IActionResult> RemoveFromSchedule(PrayerSlot slot)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var existing = await _unitOfWork.Repository<UserWirdSchedule>().Query()
                .FirstOrDefaultAsync(s => s.UserId == userId && s.PrayerSlot == slot);
            if (existing == null) return NotFound();

            _unitOfWork.Repository<UserWirdSchedule>().Remove(existing);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        // ---- Progress ----

        [Authorize]
        [HttpPost("collections/{id:int}/complete")]
        public async Task<IActionResult> MarkComplete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var progress = await _unitOfWork.Repository<UserWirdProgress>().Query()
                .FirstOrDefaultAsync(p => p.UserId == userId && p.CollectionId == id);

            if (progress == null)
            {
                progress = new UserWirdProgress { UserId = userId, CollectionId = id };
                _unitOfWork.Repository<UserWirdProgress>().Add(progress);
            }

            progress.Completed = true;
            progress.LastCompletedAt = DateTime.UtcNow;
            progress.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(progress);
        }

        /// <summary>Recommended-now logic: surface the right wird by time of day / day of week (spec 3.7).</summary>
        [Authorize]
        [HttpGet("recommended-now")]
        public async Task<IActionResult> RecommendedNow()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
            var slot = ResolveSlot(now);

            var scheduled = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Include(s => s.Collection)
                .FirstOrDefaultAsync(s => s.UserId == userId && s.PrayerSlot == slot);

            if (scheduled != null)
                return Ok(new { slot = slot.ToString(), collection = scheduled.Collection, mode = scheduled.Mode.ToString() });

            // Fall back to tariqa default
            var user = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking().FirstAsync(u => u.Id == userId);
            var fallback = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Where(c => c.Type == WirdCollectionType.Daily)
                .OrderBy(c => c.Tariqa == user.Tariqa ? 0 : c.Tariqa == Tariqa.General ? 1 : 2)
                .FirstOrDefaultAsync();

            return Ok(new { slot = slot.ToString(), collection = fallback, mode = user.WirdMode.ToString() });
        }

        private static PrayerSlot ResolveSlot(DateTime now)
        {
            if (now.DayOfWeek == DayOfWeek.Thursday && now.Hour >= 18) return PrayerSlot.ThursdayNight;
            if (now.DayOfWeek == DayOfWeek.Friday && now.Hour >= 6 && now.Hour < 18) return PrayerSlot.FridayReading;

            return now.Hour switch
            {
                < 5 => PrayerSlot.BeforeFajr,
                < 9 => PrayerSlot.MorningAdhkar,
                < 14 => PrayerSlot.AfterDhuhr,
                < 17 => PrayerSlot.AfterAsr,
                < 20 => PrayerSlot.EveningAdhkar,
                < 22 => PrayerSlot.AfterIsha,
                _ => PrayerSlot.BeforeSleep
            };
        }
    }
}
