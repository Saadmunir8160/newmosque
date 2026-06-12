using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/adhkar")]
    [ApiController]
    public class AdhkarController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public AdhkarController(ApplicationDbContext db) => _db = db;

        // ---- Library ----

        [HttpGet("items")]
        public async Task<IActionResult> GetItems([FromQuery] string? category)
        {
            var query = _db.AdhkarItems.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
            return Ok(await query.OrderBy(a => a.Title).ToListAsync());
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] AdhkarItem item)
        {
            item.Id = 0;
            _db.AdhkarItems.Add(item);
            await _db.SaveChangesAsync();
            return Ok(item);
        }

        // ---- Personal adhkar list ----

        [Authorize]
        [HttpGet("mine")]
        public async Task<IActionResult> Mine([FromQuery] bool relevantOnly = false)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var query = _db.UserAdhkar.AsNoTracking()
                .Include(u => u.AdhkarItem)
                .Where(u => u.UserId == userId);

            if (relevantOnly)
            {
                // Occasion logic: surface the right adhkar at the right time (spec 3.8)
                var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
                var isFriday = now.DayOfWeek == DayOfWeek.Friday;
                query = query.Where(u =>
                    u.Occasion == AdhkarOccasion.Always ||
                    (isFriday && u.Occasion == AdhkarOccasion.Friday));
            }

            var items = await query.ToListAsync();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ids = items.Select(i => i.Id).ToList();
            var logs = await _db.UserAdhkarLogs.AsNoTracking()
                .Where(l => ids.Contains(l.UserAdhkarId) && l.Date == today)
                .ToListAsync();

            return Ok(items.Select(i => new
            {
                userAdhkar = i,
                todayCount = logs.FirstOrDefault(l => l.UserAdhkarId == i.Id)?.CountCompleted ?? 0
            }));
        }

        [Authorize]
        [HttpPost("mine")]
        public async Task<IActionResult> AddToMine([FromBody] UserAdhkar item)
        {
            item.Id = 0;
            item.UserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            _db.UserAdhkar.Add(item);
            await _db.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize]
        [HttpDelete("mine/{id:int}")]
        public async Task<IActionResult> RemoveFromMine(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var item = await _db.UserAdhkar.FirstOrDefaultAsync(u => u.Id == id && u.UserId == userId);
            if (item == null) return NotFound();

            var logs = _db.UserAdhkarLogs.Where(l => l.UserAdhkarId == id);
            _db.UserAdhkarLogs.RemoveRange(logs);
            _db.UserAdhkar.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        /// <summary>+1 / +10 counter interaction. Returns running total like 43/50.</summary>
        [Authorize]
        [HttpPost("mine/{id:int}/increment")]
        public async Task<IActionResult> Increment(int id, [FromQuery] int by = 1)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var item = await _db.UserAdhkar.FirstOrDefaultAsync(u => u.Id == id && u.UserId == userId);
            if (item == null) return NotFound();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var log = await _db.UserAdhkarLogs
                .FirstOrDefaultAsync(l => l.UserAdhkarId == id && l.Date == today);

            if (log == null)
            {
                log = new UserAdhkarLog { UserAdhkarId = id, Date = today, CountCompleted = 0 };
                _db.UserAdhkarLogs.Add(log);
            }

            log.CountCompleted = Math.Min(log.CountCompleted + by, item.TargetCount);
            log.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                completed = log.CountCompleted,
                target = item.TargetCount,
                isComplete = log.CountCompleted >= item.TargetCount
            });
        }
    }
}
