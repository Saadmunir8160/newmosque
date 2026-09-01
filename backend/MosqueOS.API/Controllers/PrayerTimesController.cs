using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.PrayerEditor;
using MosqueOS.API.Services;
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
    private readonly JamaahTemplateService _templates;

    public PrayerTimesController(IUnitOfWork unitOfWork, JamaahTemplateService templates)
    {
        _unitOfWork = unitOfWork;
        _templates = templates;
    }

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
            .CountAsync(j => j.MosqueId == mosqueId && !j.IsDeleted);

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
    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
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
            .Where(e => e.MosqueId == mosqueId && e.Date == target && !e.IsDeleted)
            .ToListAsync();

        var effective = exceptions.Count == 0
            ? row
            : PrayerTimesHelper.CloneWithExceptions(row, exceptions);

        return Ok(new { times = effective, exceptions });
    }

    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
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

        var from = new DateOnly(year, month, 1);
        var to = from.AddMonths(1).AddDays(-1);
        var exceptions = await _unitOfWork.Repository<PrayerException>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && !e.IsDeleted && e.Date >= from && e.Date <= to)
            .ToListAsync();

        if (exceptions.Count == 0)
            return Ok(rows);

        var byDate = exceptions.GroupBy(e => e.Date).ToDictionary(g => g.Key, g => g.ToList());
        var effective = rows.Select(r =>
            byDate.TryGetValue(r.Date, out var exs)
                ? PrayerTimesHelper.CloneWithExceptions(r, exs)
                : r).ToList();
        return Ok(effective);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPut("daily")]
    public async Task<IActionResult> UpsertDaily(int mosqueId, [FromBody] PrayerTimesDaily input, [FromQuery] bool publish = false)
    {
        var row = await _unitOfWork.Repository<PrayerTimesDaily>().Query()
            .FirstOrDefaultAsync(p => p.MosqueId == mosqueId && p.Date == input.Date);

        string? oldValue = null;
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
            oldValue = FormatDailyTimes(row);
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

        var newValue = FormatDailyTimes(row);
        await LogAuditAsync(mosqueId, input.Date, "Daily",
            publish ? $"Published daily times for {input.Date:yyyy-MM-dd}" : $"Saved draft daily times for {input.Date:yyyy-MM-dd}",
            oldValue, newValue);

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

    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
    [HttpGet("jumuah")]
    public async Task<IActionResult> GetJumuah(int mosqueId) =>
        Ok(await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
            .Where(j => j.MosqueId == mosqueId && !j.IsDeleted)
            .OrderBy(j => j.SlotNumber)
            .ToListAsync());

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpPost("jumuah")]
    public async Task<IActionResult> AddJumuah(int mosqueId, [FromBody] JumuahTime slot)
    {
        if (slot.SlotNumber is < 1 or > 3)
            return BadRequest(new { message = "Jumuah slot must be 1, 2, or 3." });

        // Soft-deleted rows must not block re-adding the same slot number
        if (await _unitOfWork.Repository<JumuahTime>().QueryNoTracking()
            .AnyAsync(j => j.MosqueId == mosqueId && j.SlotNumber == slot.SlotNumber && !j.IsDeleted))
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
            .FirstOrDefaultAsync(j => j.Id == slotId && j.MosqueId == mosqueId && !j.IsDeleted);
        if (slot == null) return NotFound();

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
            .FirstOrDefaultAsync(j => j.Id == slotId && j.MosqueId == mosqueId && !j.IsDeleted);
        if (slot == null) return NotFound();

        _unitOfWork.Repository<JumuahTime>().Remove(slot);
        await LogAuditAsync(mosqueId, null, "Jumuah", $"Removed Jumuah slot {slot.SlotNumber}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    // ---- Exceptions ----

    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
    [HttpGet("exceptions")]
    public async Task<IActionResult> GetExceptions(int mosqueId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _unitOfWork.Repository<PrayerException>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && !e.IsDeleted);
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
            $"Added prayer exception: {ex.Prayer} → {ex.OverrideValue} ({ex.Reason})",
            null, $"{ex.Prayer}={ex.OverrideValue:HH\\:mm}");
        await _unitOfWork.SaveChangesAsync();
        return Ok(ex);
    }

    [Authorize(Roles = Roles.PrayerTimesManagers)]
    [HttpDelete("exceptions/{exceptionId:int}")]
    public async Task<IActionResult> DeleteException(int mosqueId, int exceptionId)
    {
        var ex = await _unitOfWork.Repository<PrayerException>().Query()
            .FirstOrDefaultAsync(e => e.Id == exceptionId && e.MosqueId == mosqueId && !e.IsDeleted);
        if (ex == null) return NotFound();

        _unitOfWork.Repository<PrayerException>().Remove(ex);
        await LogAuditAsync(mosqueId, ex.Date, "Exception", $"Removed prayer exception for {ex.Prayer}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    // ---- Ramadan ----

    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
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

    [AllowAnonymous] // ✅ FIX: Guest users ke liye allow karo
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

    // ---- Jamaah Templates (recurring / seasonal template system, Module 3.2) ----

    [HttpGet("jamaah-templates")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> GetTemplates(int mosqueId) =>
        Ok(await _templates.ListAsync(mosqueId));

    [HttpGet("jamaah-templates/resolve")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> ResolveTemplate(int mosqueId, [FromQuery] DateOnly? date)
    {
        var d = date ?? TodayLondon();
        var resolved = await _templates.ResolveForDateAsync(mosqueId, d);
        return Ok(new { date = d, template = resolved });
    }

    [HttpPost("jamaah-templates")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> CreateTemplate(int mosqueId, [FromBody] JamaahTemplateUpsertRequest req)
    {
        var (result, error) = await _templates.CreateAsync(mosqueId, req);
        if (error != null) return BadRequest(new { message = error });
        await LogAuditAsync(mosqueId, null, "Template", $"Created jamaah template '{result!.Template.Name}'");
        await _unitOfWork.SaveChangesAsync();
        return Ok(result);
    }

    [HttpPut("jamaah-templates/{templateId:int}")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> UpdateTemplate(int mosqueId, int templateId, [FromBody] JamaahTemplateUpsertRequest req)
    {
        var (result, error) = await _templates.UpdateAsync(mosqueId, templateId, req);
        if (error == "Template not found.") return NotFound(new { message = error });
        if (error != null) return BadRequest(new { message = error });
        await LogAuditAsync(mosqueId, null, "Template", $"Updated jamaah template '{result!.Template.Name}'");
        await _unitOfWork.SaveChangesAsync();
        return Ok(result);
    }

    [HttpPost("jamaah-templates/{templateId:int}/duplicate")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> DuplicateTemplate(int mosqueId, int templateId)
    {
        var (result, error) = await _templates.DuplicateAsync(mosqueId, templateId);
        if (error != null) return NotFound(new { message = error });
        await LogAuditAsync(mosqueId, null, "Template", $"Duplicated jamaah template '{result!.Name}'");
        await _unitOfWork.SaveChangesAsync();
        return Ok(result);
    }

    [HttpDelete("jamaah-templates/{templateId:int}")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> DeleteTemplate(int mosqueId, int templateId)
    {
        var error = await _templates.DeleteAsync(mosqueId, templateId);
        if (error != null) return NotFound(new { message = error });
        await LogAuditAsync(mosqueId, null, "Template", $"Deleted jamaah template #{templateId}");
        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("jamaah-templates/{templateId:int}/active")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> SetTemplateActive(int mosqueId, int templateId, [FromBody] JamaahTemplateSetActiveRequest req)
    {
        var (result, error) = await _templates.SetActiveAsync(mosqueId, templateId, req.IsActive);
        if (error != null) return NotFound(new { message = error });
        await LogAuditAsync(mosqueId, null, "Template",
            $"{(req.IsActive ? "Activated" : "Deactivated")} jamaah template '{result!.Name}'");
        await _unitOfWork.SaveChangesAsync();
        return Ok(result);
    }

    /// <summary>Generate daily prayer rows from a jamaah template for a date range (Module 3.2 M5).</summary>
    [HttpPost("jamaah-templates/{templateId:int}/generate")]
    [Authorize(Roles = Roles.Admins)]
    public async Task<IActionResult> GenerateFromTemplate(int mosqueId, int templateId, [FromBody] GenerateFromTemplateRequest req)
    {
        if (req.To < req.From)
            return BadRequest(new { message = "To date must be on or after From date." });
        if (req.To.DayNumber - req.From.DayNumber > 366)
            return BadRequest(new { message = "Date range cannot exceed 366 days." });

        var template = await _unitOfWork.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId && !t.IsDeleted);
        if (template == null) return NotFound();
        if (!template.IsActive)
            return BadRequest(new { message = "Template is inactive. Activate it before generating." });

        if (!TryResolveTemplateTimes(template, out var times, out var parseError))
            return BadRequest(new { message = parseError });

        // Preview uses no-tracking snapshot so we never mutate existing entities accidentally.
        var existing = req.Preview
            ? await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
                .Where(p => p.MosqueId == mosqueId && p.Date >= req.From && p.Date <= req.To)
                .ToListAsync()
            : await _unitOfWork.Repository<PrayerTimesDaily>().Query()
                .Where(p => p.MosqueId == mosqueId && p.Date >= req.From && p.Date <= req.To)
                .ToListAsync();
        var byDate = existing.ToDictionary(p => p.Date);

        var created = 0;
        var updated = 0;
        var skipped = 0;
        var previewRows = new List<GenerateFromTemplatePreviewRow>();
        var status = req.Publish ? PublishStatus.Published : PublishStatus.Draft;
        var userId = UserId();
        var now = DateTime.UtcNow;

        for (var d = req.From; d <= req.To; d = d.AddDays(1))
        {
            if (!JamaahTemplateService.ShouldGenerateOnDate(template, d))
            {
                skipped++;
                if (req.Preview)
                    previewRows.Add(new GenerateFromTemplatePreviewRow { Date = d, Action = "skip", Reason = "Outside template rules" });
                continue;
            }

            if (byDate.TryGetValue(d, out var row))
            {
                if (req.SkipExisting)
                {
                    skipped++;
                    if (req.Preview)
                        previewRows.Add(new GenerateFromTemplatePreviewRow { Date = d, Action = "skip", Reason = "Existing row" });
                    continue;
                }

                if (row.Status == PublishStatus.Published && !req.OverwritePublished)
                {
                    skipped++;
                    if (req.Preview)
                        previewRows.Add(new GenerateFromTemplatePreviewRow { Date = d, Action = "skip", Reason = "Published (overwrite off)" });
                    continue;
                }

                if (!req.Preview)
                {
                    row.FajrStart = times.FajrStart;
                    row.FajrJamaat = times.FajrJamaat;
                    row.DhuhrStart = times.DhuhrStart;
                    row.DhuhrJamaat = times.DhuhrJamaat;
                    row.AsrStart = times.AsrStart;
                    row.AsrJamaat = times.AsrJamaat;
                    row.MaghribStart = times.MaghribStart;
                    row.MaghribJamaat = times.MaghribJamaat;
                    row.IshaStart = times.IshaStart;
                    row.IshaJamaat = times.IshaJamaat;
                    row.Status = status;
                    row.UpdatedAt = now;
                    if (req.Publish)
                    {
                        row.PublishedAt = now;
                        row.PublishedById = userId;
                    }
                }

                updated++;
                if (req.Preview)
                    previewRows.Add(new GenerateFromTemplatePreviewRow { Date = d, Action = "update", Reason = row.Status.ToString() });
            }
            else
            {
                if (!req.Preview)
                {
                    _unitOfWork.Repository<PrayerTimesDaily>().Add(new PrayerTimesDaily
                    {
                        MosqueId = mosqueId,
                        Date = d,
                        FajrStart = times.FajrStart,
                        FajrJamaat = times.FajrJamaat,
                        DhuhrStart = times.DhuhrStart,
                        DhuhrJamaat = times.DhuhrJamaat,
                        AsrStart = times.AsrStart,
                        AsrJamaat = times.AsrJamaat,
                        MaghribStart = times.MaghribStart,
                        MaghribJamaat = times.MaghribJamaat,
                        IshaStart = times.IshaStart,
                        IshaJamaat = times.IshaJamaat,
                        Status = status,
                        PublishedAt = req.Publish ? now : null,
                        PublishedById = req.Publish ? userId : null,
                    });
                }

                created++;
                if (req.Preview)
                    previewRows.Add(new GenerateFromTemplatePreviewRow { Date = d, Action = "create" });
            }
        }

        if (!req.Preview)
        {
            await LogAuditAsync(mosqueId, req.From, "TEMPLATE_APPLIED",
                $"Applied template '{template.Name}' ({req.From:yyyy-MM-dd} → {req.To:yyyy-MM-dd}): created {created}, updated {updated}, skipped {skipped}",
                null, $"created={created};updated={updated};skipped={skipped}");
            await _unitOfWork.SaveChangesAsync();
        }

        var verb = req.Preview ? "Preview" : "Template applied";
        return Ok(new GenerateFromTemplateResponse
        {
            Created = created,
            Updated = updated,
            Skipped = skipped,
            Preview = req.Preview,
            Message = $"{verb}. Create {created}, update {updated}, skip {skipped}.",
            Rows = req.Preview ? previewRows : [],
        });
    }

    private static bool TryResolveTemplateTimes(
        JamaahTemplate template,
        out PrayerTimesHelper.TemplateTimes times,
        out string? error)
    {
        if (PrayerTimesHelper.TryParseTemplateTimes(template.RecurringRulesJson, out times, out error))
            return true;

        var prayers = template.Prayers?
            .Where(p => !p.IsDeleted)
            .ToDictionary(p => p.PrayerName, StringComparer.OrdinalIgnoreCase)
            ?? new Dictionary<string, JamaahTemplatePrayer>(StringComparer.OrdinalIgnoreCase);

        if (prayers.Count == 0)
        {
            times = default;
            error ??= "Template has no prayer times configured.";
            return false;
        }

        TimeOnly Get(string name, bool start)
        {
            if (!prayers.TryGetValue(name, out var p))
                return default;
            return start ? p.StartTime : p.JamaatTime;
        }

        times = new PrayerTimesHelper.TemplateTimes(
            Get("Fajr", true),
            Get("Fajr", false),
            Get("Dhuhr", true),
            Get("Dhuhr", false),
            Get("Asr", true),
            Get("Asr", false),
            Get("Maghrib", true),
            Get("Maghrib", false),
            Get("Isha", true),
            Get("Isha", false),
            Array.Empty<int>());
        error = null;
        return true;
    }

    private async Task LogAuditAsync(
        int mosqueId,
        DateOnly? date,
        string actionType,
        string description,
        string? oldValue = null,
        string? newValue = null)
    {
        // PrayerTimeAuditLogs.Date is NOT NULL in SQL; use today when the action is not date-scoped (Jumuah, templates, etc.)
        _unitOfWork.Repository<PrayerTimeAuditLog>().Add(new PrayerTimeAuditLog
        {
            MosqueId = mosqueId,
            Date = date ?? TodayLondon(),
            ChangedById = UserId(),
            ActionType = actionType,
            ChangeDescription = description,
            OldValue = oldValue,
            NewValue = newValue,
        });
        await Task.CompletedTask;
    }

    private static string FormatDailyTimes(PrayerTimesDaily row) =>
        $"Fajr {row.FajrStart:HH\\:mm}/{row.FajrJamaat:HH\\:mm}; " +
        $"Dhuhr {row.DhuhrStart:HH\\:mm}/{row.DhuhrJamaat:HH\\:mm}; " +
        $"Asr {row.AsrStart:HH\\:mm}/{row.AsrJamaat:HH\\:mm}; " +
        $"Maghrib {row.MaghribStart:HH\\:mm}/{row.MaghribJamaat:HH\\:mm}; " +
        $"Isha {row.IshaStart:HH\\:mm}/{row.IshaJamaat:HH\\:mm}";

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