using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.PrayerEditor;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers;

[Route("api/v1/mosques/{mosqueId:int}/prayer-times")]
[ApiController]
[RequireMosqueModule("PrayerTimes")]
public class PrayerTimesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public PrayerTimesController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    /// <summary>Prayer editor dashboard summary.</summary>
    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpGet("editor/dashboard")]
    public async Task<IActionResult> EditorDashboard(int mosqueId)
    {
        var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .FirstOrDefaultAsync(m => m.Id == mosqueId);
        if (mosque == null) return NotFound();

        var today = TodayLondon();
        var todayRow = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == today);

        var draftCount = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .CountAsync(p => p.MosqueId == mosqueId && p.Status == PublishStatus.Draft);
        var publishedCount = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .CountAsync(p => p.MosqueId == mosqueId && p.Status == PublishStatus.Published);

        var jumuahCount = await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
            .CountAsync(j => j.MosqueId == mosqueId);

        var ramadan = await _unitOfWork.Repository<RamadanTimetable>().QueryNoTracking()
            .FirstOrDefaultAsync(r => r.MosqueId == mosqueId && r.Year == today.Year);

        var specialCount = await _unitOfWork.Repository<PrayerSpecialTiming>().QueryNoTracking()
            .CountAsync(s => s.MosqueId == mosqueId && s.Date.Year == today.Year);

        return Ok(new PrayerEditorDashboardResponse
        {
            MosqueId = mosqueId,
            MosqueName = mosque.Name,
            Today = today,
            TodayStatus = todayRow?.Status.ToString(),
            DraftDays = draftCount,
            PublishedDays = publishedCount,
            JumuahSlots = jumuahCount,
            HasRamadanTimetable = ramadan != null,
            RamadanStatus = ramadan?.Status.ToString(),
            SpecialTimingsCount = specialCount
        });
    }

    /// <summary>Public daily timetable. Defaults to today (Europe/London). Published rows only unless editor requests draft.</summary>
    [HttpGet("daily")]
    public async Task<IActionResult> GetDaily(int mosqueId, [FromQuery] DateOnly? date, [FromQuery] bool includeDraft = false)
    {
        var target = date ?? TodayLondon();
        var query = _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .Where(p => p.MosqueId == mosqueId && p.Date == target);

        if (!includeDraft || !User.IsInRole(Roles.PrayerTimesEditor) && !User.IsInRole(Roles.SuperAdmin)
            && !User.IsInRole(Roles.MosqueOwner) && !User.IsInRole(Roles.MosqueAdmin))
        {
            query = query.Where(p => p.Status == PublishStatus.Published);
        }

        var row = await query.FirstOrDefaultAsync();
        if (row == null)
            return Ok(new { times = (PrayerTimesDaily?)null, exceptions = Array.Empty<PrayerException>() });

        var exceptions = await _unitOfWork.Repository<PrayerException>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && e.Date == target)
            .ToListAsync();

        return Ok(new { times = row, exceptions });
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthly(int mosqueId, [FromQuery] int year, [FromQuery] int month, [FromQuery] bool includeDraft = false)
    {
        if (year == 0 || month == 0)
        {
            var today = TodayLondon();
            year = today.Year;
            month = today.Month;
        }

        var query = _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .Where(p => p.MosqueId == mosqueId && p.Date.Year == year && p.Date.Month == month);

        if (!includeDraft || !IsPrayerManager())
            query = query.Where(p => p.Status == PublishStatus.Published);

        var rows = await query.OrderBy(p => p.Date).ToListAsync();
        return Ok(rows);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPut("daily")]
    public async Task<IActionResult> UpsertDaily(int mosqueId, [FromBody] PrayerTimesDaily input, [FromQuery] bool publish = false)
    {
        var row = await _unitOfWork.Repository<PrayerTimesDaily>().Query()
            .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == input.Date);

        if (row == null)
        {
            input.MosqueId = mosqueId;
            input.Id = 0;
            input.Status = publish ? PublishStatus.Published : PublishStatus.Draft;
            if (publish)
            {
                input.PublishedAt = DateTime.UtcNow;
                input.PublishedById = UserId();
            }
            _unitOfWork.Repository<PrayerTimesDaily>().Add(input);
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
            if (publish)
            {
                row.Status = PublishStatus.Published;
                row.PublishedAt = DateTime.UtcNow;
                row.PublishedById = UserId();
            }
            else if (row.Status == PublishStatus.Published)
            {
                row.Status = PublishStatus.Draft;
            }
        }

        await LogAuditAsync(mosqueId, input.Date, "Daily",
            publish ? $"Published daily times for {input.Date:yyyy-MM-dd}" : $"Saved draft daily times for {input.Date:yyyy-MM-dd}");

        await _unitOfWork.SaveChangesAsync();
        return Ok(row);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("daily/publish")]
    public async Task<IActionResult> PublishDaily(int mosqueId, [FromBody] PublishPrayerDateRequest request)
    {
        var row = await _unitOfWork.Repository<PrayerTimesDaily>().Query()
            .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == request.Date);
        if (row == null) return NotFound(new { message = "No timetable row for this date. Save draft first." });

        row.Status = PublishStatus.Published;
        row.PublishedAt = DateTime.UtcNow;
        row.PublishedById = UserId();
        row.UpdatedAt = DateTime.UtcNow;

        await LogAuditAsync(mosqueId, request.Date, "Publish", $"Published daily prayer times for {request.Date:yyyy-MM-dd}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(row);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("daily/publish-month")]
    public async Task<IActionResult> PublishMonth(int mosqueId, [FromBody] PublishPrayerMonthRequest request)
    {
        var rows = await _unitOfWork.Repository<PrayerTimesDaily>().Query()
            .Where(p => p.MosqueId == mosqueId && p.Date.Year == request.Year && p.Date.Month == request.Month)
            .ToListAsync();

        if (!rows.Any()) return NotFound(new { message = "No rows for this month." });

        var userId = UserId();
        var now = DateTime.UtcNow;
        foreach (var row in rows)
        {
            row.Status = PublishStatus.Published;
            row.PublishedAt = now;
            row.PublishedById = userId;
            row.UpdatedAt = now;
        }

        await LogAuditAsync(mosqueId, null, "Publish",
            $"Published {rows.Count} daily timetable rows for {request.Year}-{request.Month:D2}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(new { published = rows.Count });
    }

    // ---- Jumuah ----

    [HttpGet("jumuah")]
    public async Task<IActionResult> GetJumuah(int mosqueId) =>
        Ok(await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
            .Where(j => j.MosqueId == mosqueId)
            .OrderBy(j => j.SlotNumber)
            .ToListAsync());

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("jumuah")]
    public async Task<IActionResult> AddJumuah(int mosqueId, [FromBody] JumuahTime slot)
    {
        if (slot.SlotNumber is < 1 or > 3)
            return BadRequest(new { message = "Jumuah slot must be 1, 2, or 3." });

        if (await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
            .AnyAsync(j => j.MosqueId == mosqueId && j.SlotNumber == slot.SlotNumber))
            return Conflict(new { message = $"Slot {slot.SlotNumber} already exists." });

        slot.MosqueId = mosqueId;
        slot.Id = 0;
        _unitOfWork.Repository<JumuahTime>().Add(slot);

        await LogAuditAsync(mosqueId, null, "Jumuah",
            $"Added Jumuah slot {slot.SlotNumber} (khutbah {slot.KhutbahTime}, jamaat {slot.JamaatTime})");
        await _unitOfWork.SaveChangesAsync();
        return Ok(slot);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPut("jumuah/{slotId:int}")]
    public async Task<IActionResult> UpdateJumuah(int mosqueId, int slotId, [FromBody] JumuahTime input)
    {
        var slot = await _unitOfWork.Repository<JumuahTime>().Query()
            .FirstOrDefaultAsync(j => j.Id == slotId && j.MosqueId == mosqueId);
        if (slot == null) return NotFound();

        slot.SlotNumber = input.SlotNumber;
        slot.KhutbahTime = input.KhutbahTime;
        slot.JamaatTime = input.JamaatTime;
        slot.UpdatedAt = DateTime.UtcNow;

        await LogAuditAsync(mosqueId, null, "Jumuah", $"Updated Jumuah slot {slot.SlotNumber}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(slot);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpDelete("jumuah/{slotId:int}")]
    public async Task<IActionResult> DeleteJumuah(int mosqueId, int slotId)
    {
        var slot = await _unitOfWork.Repository<JumuahTime>().Query()
            .FirstOrDefaultAsync(j => j.Id == slotId && j.MosqueId == mosqueId);
        if (slot == null) return NotFound();

        _unitOfWork.Repository<JumuahTime>().Remove(slot);
        await LogAuditAsync(mosqueId, null, "Jumuah", $"Removed Jumuah slot {slot.SlotNumber}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    // ---- Exceptions ----

    [HttpGet("exceptions")]
    public async Task<IActionResult> GetExceptions(int mosqueId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _unitOfWork.Repository<PrayerException>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId);
        if (from.HasValue) query = query.Where(e => e.Date >= from);
        if (to.HasValue) query = query.Where(e => e.Date <= to);
        return Ok(await query.OrderBy(e => e.Date).ToListAsync());
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("exceptions")]
    public async Task<IActionResult> AddException(int mosqueId, [FromBody] PrayerException ex)
    {
        ex.MosqueId = mosqueId;
        ex.Id = 0;
        _unitOfWork.Repository<PrayerException>().Add(ex);
        await LogAuditAsync(mosqueId, ex.Date, "Exception",
            $"Added prayer exception: {ex.Prayer} → {ex.OverrideValue} ({ex.Reason})");
        await _unitOfWork.SaveChangesAsync();
        return Ok(ex);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpDelete("exceptions/{exceptionId:int}")]
    public async Task<IActionResult> DeleteException(int mosqueId, int exceptionId)
    {
        var ex = await _unitOfWork.Repository<PrayerException>().Query()
            .FirstOrDefaultAsync(e => e.Id == exceptionId && e.MosqueId == mosqueId);
        if (ex == null) return NotFound();

        _unitOfWork.Repository<PrayerException>().Remove(ex);
        await LogAuditAsync(mosqueId, ex.Date, "Exception", $"Removed prayer exception for {ex.Prayer}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    // ---- Ramadan ----

    [HttpGet("ramadan")]
    public async Task<IActionResult> GetRamadan(int mosqueId, [FromQuery] int? year, [FromQuery] bool includeDraft = false)
    {
        var y = year ?? TodayLondon().Year;
        var query = _unitOfWork.Repository<RamadanTimetable>().QueryNoTracking()
            .Include(r => r.Days.OrderBy(d => d.DayNumber))
            .Where(r => r.MosqueId == mosqueId && r.Year == y);

        if (!includeDraft || !IsPrayerManager())
            query = query.Where(r => r.Status == PublishStatus.Published);

        var timetable = await query.FirstOrDefaultAsync();
        return timetable == null ? NotFound() : Ok(timetable);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("ramadan")]
    public async Task<IActionResult> CreateRamadan(int mosqueId, [FromBody] RamadanTimetable input)
    {
        if (await _unitOfWork.Repository<RamadanTimetable>().Query()
            .AnyAsync(r => r.MosqueId == mosqueId && r.Year == input.Year))
            return Conflict(new { message = $"Ramadan timetable for {input.Year} already exists." });

        input.MosqueId = mosqueId;
        input.Id = 0;
        input.Status = PublishStatus.Draft;
        _unitOfWork.Repository<RamadanTimetable>().Add(input);

        await LogAuditAsync(mosqueId, null, "Ramadan", $"Created Ramadan timetable {input.Year}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(input);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPut("ramadan/{timetableId:int}/days")]
    public async Task<IActionResult> UpsertRamadanDay(int mosqueId, int timetableId, [FromBody] RamadanDayEntry day)
    {
        var timetable = await _unitOfWork.Repository<RamadanTimetable>().Query()
            .FirstOrDefaultAsync(r => r.Id == timetableId && r.MosqueId == mosqueId);
        if (timetable == null) return NotFound();

        var row = await _unitOfWork.Repository<RamadanDayEntry>().Query()
            .FirstOrDefaultAsync(d => d.TimetableId == timetableId && d.DayNumber == day.DayNumber);

        if (row == null)
        {
            day.TimetableId = timetableId;
            day.Id = 0;
            _unitOfWork.Repository<RamadanDayEntry>().Add(day);
        }
        else
        {
            row.Date = day.Date;
            row.SuhoorEnd = day.SuhoorEnd;
            row.IftarJamaat = day.IftarJamaat;
            row.TaraweehJamaat = day.TaraweehJamaat;
            row.Notes = day.Notes;
            row.UpdatedAt = DateTime.UtcNow;
        }

        timetable.Status = PublishStatus.Draft;
        timetable.UpdatedAt = DateTime.UtcNow;

        await LogAuditAsync(mosqueId, day.Date, "Ramadan", $"Updated Ramadan day {day.DayNumber}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(row ?? day);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("ramadan/{timetableId:int}/publish")]
    public async Task<IActionResult> PublishRamadan(int mosqueId, int timetableId)
    {
        var timetable = await _unitOfWork.Repository<RamadanTimetable>().Query()
            .FirstOrDefaultAsync(r => r.Id == timetableId && r.MosqueId == mosqueId);
        if (timetable == null) return NotFound();

        timetable.Status = PublishStatus.Published;
        timetable.PublishedAt = DateTime.UtcNow;
        timetable.PublishedById = UserId();
        timetable.UpdatedAt = DateTime.UtcNow;

        await LogAuditAsync(mosqueId, null, "Publish", $"Published Ramadan timetable {timetable.Year}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(timetable);
    }

    // ---- Special timings ----

    [HttpGet("special-timings")]
    public async Task<IActionResult> GetSpecialTimings(int mosqueId, [FromQuery] int? year, [FromQuery] bool ramadanOnly = false)
    {
        var y = year ?? TodayLondon().Year;
        var query = _unitOfWork.Repository<PrayerSpecialTiming>().QueryNoTracking()
            .Where(s => s.MosqueId == mosqueId && s.Date.Year == y);
        if (ramadanOnly) query = query.Where(s => s.IsRamadan);
        return Ok(await query.OrderBy(s => s.Date).ThenBy(s => s.Time).ToListAsync());
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("special-timings")]
    public async Task<IActionResult> AddSpecialTiming(int mosqueId, [FromBody] PrayerSpecialTiming timing)
    {
        timing.MosqueId = mosqueId;
        timing.Id = 0;
        _unitOfWork.Repository<PrayerSpecialTiming>().Add(timing);
        await LogAuditAsync(mosqueId, timing.Date, "Special",
            $"Added special timing: {timing.Label} at {timing.Time}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(timing);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpDelete("special-timings/{id:int}")]
    public async Task<IActionResult> DeleteSpecialTiming(int mosqueId, int id)
    {
        var timing = await _unitOfWork.Repository<PrayerSpecialTiming>().Query()
            .FirstOrDefaultAsync(s => s.Id == id && s.MosqueId == mosqueId);
        if (timing == null) return NotFound();

        _unitOfWork.Repository<PrayerSpecialTiming>().Remove(timing);
        await LogAuditAsync(mosqueId, timing.Date, "Special", $"Removed special timing: {timing.Label}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog(int mosqueId, [FromQuery] int take = 100) =>
        Ok(await _unitOfWork.Repository<PrayerTimeAuditLog>().QueryNoTracking()
            .Where(a => a.MosqueId == mosqueId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Clamp(take, 1, 500))
            .ToListAsync());

    // ---- Jamaah Templates (recurring template system, spec 3.2) ----

    [HttpGet("jamaah-templates")]
    [Authorize(Roles = Roles.PrayerTimesManagers)]
    public async Task<IActionResult> GetTemplates(int mosqueId) =>
        Ok(await _unitOfWork.Repository<JamaahTemplate>().QueryNoTracking()
            .Where(t => t.MosqueId == mosqueId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync());

    [HttpPost("jamaah-templates")]
    [Authorize(Roles = Roles.PrayerTimesManagers)]
    public async Task<IActionResult> CreateTemplate(int mosqueId, [FromBody] JamaahTemplate template)
    {
        template.Id = 0;
        template.MosqueId = mosqueId;
        _unitOfWork.Repository<JamaahTemplate>().Add(template);
        await _unitOfWork.SaveChangesAsync();
        return Ok(template);
    }

    [HttpPut("jamaah-templates/{templateId:int}")]
    [Authorize(Roles = Roles.PrayerTimesManagers)]
    public async Task<IActionResult> UpdateTemplate(int mosqueId, int templateId, [FromBody] JamaahTemplate input)
    {
        var template = await _unitOfWork.Repository<JamaahTemplate>().Query()
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId);
        if (template == null) return NotFound();

        template.Name = input.Name;
        template.RecurringRulesJson = input.RecurringRulesJson;
        template.IsActive = input.IsActive;
        template.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return Ok(template);
    }

    [HttpDelete("jamaah-templates/{templateId:int}")]
    [Authorize(Roles = Roles.PrayerTimesManagers)]
    public async Task<IActionResult> DeleteTemplate(int mosqueId, int templateId)
    {
        var template = await _unitOfWork.Repository<JamaahTemplate>().Query()
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId);
        if (template == null) return NotFound();
        _unitOfWork.Repository<JamaahTemplate>().Remove(template);
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    private async Task LogAuditAsync(int mosqueId, DateOnly? date, string actionType, string description)
    {
        _unitOfWork.Repository<PrayerTimeAuditLog>().Add(new PrayerTimeAuditLog
        {
            MosqueId = mosqueId,
            Date = date,
            ChangedById = UserId(),
            ActionType = actionType,
            ChangeDescription = description
        });
        await Task.CompletedTask;
    }

    private string UserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";

    private bool IsPrayerManager() =>
        User.IsInRole(Roles.PrayerTimesEditor) || User.IsInRole(Roles.SuperAdmin)
        || User.IsInRole(Roles.MosqueOwner) || User.IsInRole(Roles.MosqueAdmin);

    private static DateOnly TodayLondon()
    {
        var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london));
    }
}
