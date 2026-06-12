using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/prayer-times")]
    [ApiController]
    public class PrayerTimesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public PrayerTimesController(ApplicationDbContext db) => _db = db;

        /// <summary>Public daily timetable. Defaults to today (Europe/London).</summary>
        [HttpGet("daily")]
        public async Task<IActionResult> GetDaily(int mosqueId, [FromQuery] DateOnly? date)
        {
            var target = date ?? TodayLondon();
            var row = await _db.PrayerTimesDaily.AsNoTracking()
                .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == target);

            if (row == null) return NotFound(new { message = "No prayer times for this date." });

            var exceptions = await _db.PrayerExceptions.AsNoTracking()
                .Where(e => e.MosqueId == mosqueId && e.Date == target)
                .ToListAsync();

            return Ok(new { times = row, exceptions });
        }

        /// <summary>Public monthly timetable.</summary>
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthly(int mosqueId, [FromQuery] int year, [FromQuery] int month)
        {
            if (year == 0 || month == 0)
            {
                var today = TodayLondon();
                year = today.Year;
                month = today.Month;
            }

            var rows = await _db.PrayerTimesDaily.AsNoTracking()
                .Where(p => p.MosqueId == mosqueId && p.Date.Year == year && p.Date.Month == month)
                .OrderBy(p => p.Date)
                .ToListAsync();

            return Ok(rows);
        }

        [Authorize(Roles = Roles.PrayerTimesManagers)]
        [HttpPut("daily")]
        public async Task<IActionResult> UpsertDaily(int mosqueId, [FromBody] PrayerTimesDaily input)
        {
            var row = await _db.PrayerTimesDaily
                .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == input.Date);

            if (row == null)
            {
                input.MosqueId = mosqueId;
                input.Id = 0;
                _db.PrayerTimesDaily.Add(input);
                row = input;
            }
            else
            {
                row.FajrStart = input.FajrStart; row.FajrJamaat = input.FajrJamaat;
                row.DhuhrStart = input.DhuhrStart; row.DhuhrJamaat = input.DhuhrJamaat;
                row.AsrStart = input.AsrStart; row.AsrJamaat = input.AsrJamaat;
                row.MaghribStart = input.MaghribStart; row.MaghribJamaat = input.MaghribJamaat;
                row.IshaStart = input.IshaStart; row.IshaJamaat = input.IshaJamaat;
                row.UpdatedAt = DateTime.UtcNow;
            }

            // Audit trail (spec section 9)
            _db.PrayerTimeAuditLogs.Add(new PrayerTimeAuditLog
            {
                MosqueId = mosqueId,
                Date = input.Date,
                ChangedById = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown",
                ChangeDescription = $"Daily prayer times upserted for {input.Date:yyyy-MM-dd}"
            });

            await _db.SaveChangesAsync();
            return Ok(row);
        }

        // ---- Jumuah ----

        [HttpGet("jumuah")]
        public async Task<IActionResult> GetJumuah(int mosqueId) =>
            Ok(await _db.JumuahTimes.AsNoTracking()
                .Where(j => j.MosqueId == mosqueId)
                .OrderBy(j => j.SlotNumber)
                .ToListAsync());

        [Authorize(Roles = Roles.PrayerTimesManagers)]
        [HttpPost("jumuah")]
        public async Task<IActionResult> AddJumuah(int mosqueId, [FromBody] JumuahTime slot)
        {
            slot.MosqueId = mosqueId;
            slot.Id = 0;
            _db.JumuahTimes.Add(slot);
            await _db.SaveChangesAsync();
            return Ok(slot);
        }

        [Authorize(Roles = Roles.PrayerTimesManagers)]
        [HttpDelete("jumuah/{slotId:int}")]
        public async Task<IActionResult> DeleteJumuah(int mosqueId, int slotId)
        {
            var slot = await _db.JumuahTimes
                .FirstOrDefaultAsync(j => j.Id == slotId && j.MosqueId == mosqueId);
            if (slot == null) return NotFound();

            _db.JumuahTimes.Remove(slot);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---- Exceptions (Ramadan, special dates) ----

        [Authorize(Roles = Roles.PrayerTimesManagers)]
        [HttpPost("exceptions")]
        public async Task<IActionResult> AddException(int mosqueId, [FromBody] PrayerException ex)
        {
            ex.MosqueId = mosqueId;
            ex.Id = 0;
            _db.PrayerExceptions.Add(ex);
            await _db.SaveChangesAsync();
            return Ok(ex);
        }

        [Authorize(Roles = Roles.PrayerTimesManagers)]
        [HttpDelete("exceptions/{exceptionId:int}")]
        public async Task<IActionResult> DeleteException(int mosqueId, int exceptionId)
        {
            var ex = await _db.PrayerExceptions
                .FirstOrDefaultAsync(e => e.Id == exceptionId && e.MosqueId == mosqueId);
            if (ex == null) return NotFound();

            _db.PrayerExceptions.Remove(ex);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpGet("audit-log")]
        public async Task<IActionResult> GetAuditLog(int mosqueId) =>
            Ok(await _db.PrayerTimeAuditLogs.AsNoTracking()
                .Where(a => a.MosqueId == mosqueId)
                .OrderByDescending(a => a.CreatedAt)
                .Take(100)
                .ToListAsync());

        private static DateOnly TodayLondon()
        {
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london));
        }
    }
}
