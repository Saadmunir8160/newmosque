using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    /// <summary>Aggregated data for the Today screen (spec section 5). Adapts by time of day.</summary>
    [Route("api/v1/today")]
    [ApiController]
    public class TodayController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public TodayController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? mosqueId)
        {
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
            var today = DateOnly.FromDateTime(now);

            // Resolve mosque: query param, else the logged-in user's home mosque, else first mosque
            ApplicationUser? user = null;
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != null)
                user = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

            var resolvedMosqueId = mosqueId ?? user?.HomeMosqueId
                ?? await _unitOfWork.Repository<Mosque>().QueryNoTracking().Select(m => (int?)m.Id).FirstOrDefaultAsync();

            // 2-3. Prayer times + next prayer
            PrayerTimesDaily? prayerTimes = null;
            object? nextPrayer = null;
            if (resolvedMosqueId.HasValue)
            {
                prayerTimes = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
                    .FirstOrDefaultAsync(p => p.MosqueId == resolvedMosqueId && p.Date == today);
                if (prayerTimes != null)
                    nextPrayer = ResolveNextPrayer(prayerTimes, TimeOnly.FromDateTime(now));
            }

            // 7. Special event tonight (Mawlid etc.)
            Event? tonightEvent = null;
            if (resolvedMosqueId.HasValue)
            {
                tonightEvent = await _unitOfWork.Repository<Event>().QueryNoTracking()
                    .Include(e => e.WirdCollection)
                    .Where(e => e.MosqueId == resolvedMosqueId && e.Date == today
                             && e.Status == EventStatus.Scheduled)
                    .OrderBy(e => e.StartTime)
                    .FirstOrDefaultAsync();
            }

            // 5. Primary recommended reading (time + tariqa)
            // Prefer the user's tariqa, then General, then any daily collection
            var tariqa = user?.Tariqa ?? Tariqa.General;
            var recommendedWird = await _unitOfWork.Repository<WirdCollection>().QueryNoTracking()
                .Where(c => c.Type == WirdCollectionType.Daily)
                .OrderBy(c => c.Tariqa == tariqa ? 0 : c.Tariqa == Tariqa.General ? 1 : 2)
                .FirstOrDefaultAsync();

            // 8. Announcements (top 3 published)
            var announcements = resolvedMosqueId.HasValue
                ? await _unitOfWork.Repository<Announcement>().QueryNoTracking()
                    .Where(a => a.MosqueId == resolvedMosqueId && a.Status == PublishStatus.Published)
                    .OrderByDescending(a => a.IsFeatured)
                    .ThenByDescending(a => a.PublishedAt)
                    .Take(3)
                    .ToListAsync()
                : new List<Announcement>();

            // 9. One participation prompt
            var participationPrompt = resolvedMosqueId.HasValue
                ? await _unitOfWork.Repository<ParticipationOpportunity>().QueryNoTracking()
                    .Where(o => o.MosqueId == resolvedMosqueId && o.IsActive)
                    .OrderBy(o => o.Date)
                    .FirstOrDefaultAsync()
                : null;

            // 6. Today's Qur'an reading card (only for logged-in users with a plan)
            object? quranCard = null;
            if (userId != null)
            {
                var plan = await _unitOfWork.Repository<QuranPlan>().QueryNoTracking()
                    .Include(p => p.Progress)
                    .Where(p => p.UserId == userId)
                    .OrderByDescending(p => p.StartDate)
                    .FirstOrDefaultAsync();
                if (plan != null)
                {
                    var daysIn = today.DayNumber - plan.StartDate.DayNumber + 1;
                    var todaysPara = Math.Clamp(daysIn, 1, 30);
                    quranCard = new
                    {
                        todaysPara,
                        completedParas = plan.Progress.Count(p => p.Completed),
                        totalParas = 30
                    };
                }
            }

            // Most relevant dua right now
            var duaCategory = now.Hour switch
            {
                >= 4 and < 10 => "morning",
                >= 10 and < 18 => "general",
                >= 18 and < 22 => "after_prayer",
                _ => "sleep"
            };
            var recommendedDua = await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Category == duaCategory)
                .OrderBy(d => d.Id)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                date = today,
                dayOfWeek = now.DayOfWeek.ToString(),
                isFriday = now.DayOfWeek == DayOfWeek.Friday,
                mosqueId = resolvedMosqueId,
                prayerTimes,
                nextPrayer,
                tonightEvent,
                recommendedWird,
                recommendedDua,
                quranCard,
                announcements,
                participationPrompt
            });
        }

        private static object? ResolveNextPrayer(PrayerTimesDaily t, TimeOnly now)
        {
            var prayers = new (string Name, TimeOnly Start, TimeOnly Jamaat)[]
            {
                ("Fajr", t.FajrStart, t.FajrJamaat),
                ("Dhuhr", t.DhuhrStart, t.DhuhrJamaat),
                ("Asr", t.AsrStart, t.AsrJamaat),
                ("Maghrib", t.MaghribStart, t.MaghribJamaat),
                ("Isha", t.IshaStart, t.IshaJamaat)
            };

            foreach (var p in prayers)
            {
                if (p.Jamaat > now)
                    return new { name = p.Name, start = p.Start, jamaat = p.Jamaat };
            }
            // All prayers passed: next is tomorrow's Fajr
            return new { name = "Fajr (tomorrow)", start = t.FajrStart, jamaat = t.FajrJamaat };
        }
    }
}
