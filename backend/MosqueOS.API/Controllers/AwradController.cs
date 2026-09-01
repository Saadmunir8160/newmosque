using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Awrad;
using MosqueOS.API.Models.Common;
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
            var query = _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Where(c => c.Status == ContentPublishStatus.Published);
            if (tariqa.HasValue) query = query.Where(c => c.Tariqa == tariqa || c.Tariqa == Tariqa.General);
            if (type.HasValue) query = query.Where(c => c.Type == type);
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        /// <summary>Mawlid / event sequences for Thursday-night and special-event builders (spec 3.7).</summary>
        [HttpGet("mawlid-schedules")]
        public async Task<IActionResult> GetMawlidSchedules([FromQuery] Tariqa? tariqa = null)
        {
            var query = _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Include(c => c.Steps)
                .ThenInclude(s => s.ContentItem)
                .Where(c => c.Status == ContentPublishStatus.Published
                    && (c.Type == WirdCollectionType.Event || c.Type == WirdCollectionType.Weekly)
                    && c.Steps.Any());
            if (tariqa.HasValue)
                query = query.Where(c => c.Tariqa == tariqa || c.Tariqa == Tariqa.General);
            var list = await query.OrderBy(c => c.Name).ToListAsync();
            foreach (var c in list)
                if (c.Steps != null)
                    c.Steps = c.Steps.OrderBy(s => s.OrderIndex).ToList();
            return Ok(list);
        }

        /// <summary>Full guided reading: ordered steps with Arabic, transliteration, translation, audio.
        /// Authenticated users get length adjusted by UserLevel and optional Quick mode.</summary>
        [HttpGet("collections/{id:int}")]
        public async Task<IActionResult> GetCollection(int id, [FromQuery] string? mode = null)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Include(c => c.Steps)
                .ThenInclude(s => s.ContentItem)
                .FirstOrDefaultAsync(c => c.Id == id && c.Status == ContentPublishStatus.Published);
            if (collection == null) return NotFound();

            if (collection.Steps != null)
                collection.Steps = collection.Steps.OrderBy(s => s.OrderIndex).ToList();

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);
                var effectiveMode = ParseMode(mode) ?? user?.WirdMode ?? WirdMode.Full;
                TrimStepsForUser(collection, user?.Level ?? UserLevel.Regular, effectiveMode);
            }

            return Ok(collection);
        }

        private static WirdMode? ParseMode(string? mode)
        {
            if (string.IsNullOrWhiteSpace(mode)) return null;
            if (Enum.TryParse<WirdMode>(mode, true, out var named)) return named;
            if (int.TryParse(mode, out var n) && Enum.IsDefined(typeof(WirdMode), n)) return (WirdMode)n;
            return null;
        }

        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPost("collections")]
        public async Task<IActionResult> CreateCollection([FromBody] WirdCollection collection)
        {
            collection.Id = 0;
            collection.Status = ContentPublishStatus.Draft;
            collection.PublishedAt = null;
            collection.PublishedById = null;
            _unitOfWork.Repository<WirdCollection>().Add(collection);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCollection), new { id = collection.Id }, collection);
        }

        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPut("collections/{id:int}")]
        public async Task<IActionResult> UpdateCollection(int id, [FromBody] WirdCollection input)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection == null) return NotFound();

            collection.Name = input.Name;
            collection.Tariqa = input.Tariqa;
            collection.Type = input.Type;
            collection.RecommendedTime = input.RecommendedTime;
            collection.Description = input.Description;
            collection.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(collection);
        }

        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPost("collections/{id:int}/publish")]
        public async Task<IActionResult> PublishCollection(int id)
        {
            var collection = await _unitOfWork.Repository<WirdCollection>().FindAsync(id);
            if (collection == null) return NotFound();
            collection.Status = ContentPublishStatus.Published;
            collection.PublishedAt = DateTime.UtcNow;
            collection.PublishedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            collection.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(collection);
        }

        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPost("collections/{id:int}/steps")]
        public async Task<IActionResult> AddStep(int id, [FromBody] WirdStep step)
        {
            step.Id = 0;
            step.CollectionId = id;
            _unitOfWork.Repository<WirdStep>().Add(step);
            await _unitOfWork.SaveChangesAsync();
            return Ok(step);
        }

        [Authorize(Roles = Roles.AwradManagers)]
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
            Ok(await _unitOfWork.Repository<ContentItem>().QueryNoTracking()
                .Where(c => c.Status == ContentPublishStatus.Published)
                .OrderBy(c => c.Title).ToListAsync());

        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPost("content-items")]
        public async Task<IActionResult> CreateContentItem([FromBody] ContentItem item)
        {
            item.Id = 0;
            if (item.Status == 0)
                item.Status = ContentPublishStatus.Published;
            _unitOfWork.Repository<ContentItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        /// <summary>Insert a library dua into awrad/event sequences as a content item (spec 3.9).</summary>
        [Authorize(Roles = Roles.AwradManagers)]
        [HttpPost("content-items/from-dua/{duaId:int}")]
        public async Task<IActionResult> CreateContentItemFromDua(int duaId)
        {
            var dua = await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .FirstOrDefaultAsync(d => d.Id == duaId && d.Status == ContentPublishStatus.Published);
            if (dua == null) return NotFound();

            var item = new ContentItem
            {
                Title = dua.Title,
                ArabicText = dua.ArabicText,
                Transliteration = dua.Transliteration,
                Translation = dua.Translation,
                AudioUrl = dua.AudioUrl,
                SourceRef = $"dua:{dua.Id}" + (string.IsNullOrWhiteSpace(dua.SourceRef) ? "" : $"|{dua.SourceRef}"),
                Type = ContentItemType.Dua,
                RepeatCount = 1,
                Status = ContentPublishStatus.Published,
                PublishedAt = DateTime.UtcNow
            };
            _unitOfWork.Repository<ContentItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.AwradManagers)]
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

        // ---- Personal wird schedule (Wird Builder — prayer slot assignment) ----

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
            return Ok(new ApiMessageResponse { Message = "Schedule saved." });
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
        [HttpGet("completed-today")]
        public async Task<IActionResult> CompletedToday()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ids = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => p.UserId == userId && p.Completed && p.LastCompletedAt != null
                    && DateOnly.FromDateTime(p.LastCompletedAt.Value) == today)
                .Select(p => p.CollectionId)
                .ToListAsync();
            return Ok(ids);
        }

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

        /// <summary>Recommended-now: time-of-day / day-of-week slot, tariqa defaults, level/mode aware.</summary>
        [Authorize]
        [HttpGet("recommended-now")]
        public async Task<IActionResult> RecommendedNow()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
            var slot = ResolveSlot(now);

            var user = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking()
                .FirstAsync(u => u.Id == userId);

            var scheduled = await _unitOfWork.Repository<UserWirdSchedule>().QueryNoTracking()
                .Include(s => s.Collection!)
                .ThenInclude(c => c!.Steps)
                .ThenInclude(st => st.ContentItem)
                .FirstOrDefaultAsync(s => s.UserId == userId && s.PrayerSlot == slot);

            WirdCollection? collection = scheduled?.Collection;
            var mode = scheduled?.Mode ?? user.WirdMode;

            if (collection == null)
            {
                // Thursday night / Friday: prefer Event/Weekly Mawlid-style sequences
                var preferEvent = slot is PrayerSlot.ThursdayNight or PrayerSlot.FridayReading;
                var q = _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                    .Include(c => c.Steps)
                    .ThenInclude(s => s.ContentItem)
                    .Where(c => c.Status == ContentPublishStatus.Published && c.Steps.Any());

                if (preferEvent)
                    q = q.Where(c => c.Type == WirdCollectionType.Event || c.Type == WirdCollectionType.Weekly);
                else
                    q = q.Where(c => c.Type == WirdCollectionType.Daily);

                collection = await q
                    .OrderBy(c => c.Tariqa == user.Tariqa ? 0 : c.Tariqa == Tariqa.General ? 1 : 2)
                    .ThenBy(c => c.Name)
                    .FirstOrDefaultAsync();

                // Fall back to any published daily if no event collection
                if (collection == null && preferEvent)
                {
                    collection = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                        .Include(c => c.Steps)
                        .ThenInclude(s => s.ContentItem)
                        .Where(c => c.Type == WirdCollectionType.Daily && c.Status == ContentPublishStatus.Published && c.Steps.Any())
                        .OrderBy(c => c.Tariqa == user.Tariqa ? 0 : c.Tariqa == Tariqa.General ? 1 : 2)
                        .FirstOrDefaultAsync();
                }

                if (collection?.Steps != null)
                    collection.Steps = collection.Steps.OrderBy(s => s.OrderIndex).ToList();
            }
            else if (collection.Steps != null)
            {
                collection.Steps = collection.Steps.OrderBy(s => s.OrderIndex).ToList();
            }

            if (collection != null)
                TrimStepsForUser(collection, user.Level, mode);

            return Ok(new RecommendedWirdResponse
            {
                Slot = slot.ToString(),
                Collection = collection,
                Mode = mode.ToString(),
                UserLevel = user.Level.ToString(),
                StepCount = collection?.Steps?.Count ?? 0
            });
        }

        /// <summary>BEGINNER / REGULAR / ADVANCED (+ Quick mode) adjust guided sequence length.</summary>
        internal static void TrimStepsForUser(WirdCollection collection, UserLevel level, WirdMode mode)
        {
            if (collection.Steps == null || collection.Steps.Count == 0) return;

            var ordered = collection.Steps.OrderBy(s => s.OrderIndex).ToList();
            var total = ordered.Count;
            var keep = level switch
            {
                UserLevel.Beginner => Math.Max(1, (int)Math.Ceiling(total * 0.4)),
                UserLevel.Regular => Math.Max(1, (int)Math.Ceiling(total * 0.7)),
                _ => total
            };
            if (mode == WirdMode.Quick)
                keep = Math.Max(1, (int)Math.Ceiling(keep / 2.0));

            keep = Math.Min(keep, total);
            collection.Steps = ordered.Take(keep).ToList();
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
