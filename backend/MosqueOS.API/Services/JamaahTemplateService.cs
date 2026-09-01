using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.PrayerEditor;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class JamaahTemplateService
{
    private static readonly string[] PrayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    private readonly IUnitOfWork _uow;

    public JamaahTemplateService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<JamaahTemplateDto>> ListAsync(int mosqueId)
    {
        var rows = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .Where(t => t.MosqueId == mosqueId && !t.IsDeleted)
            .OrderBy(t => t.Priority)
            .ThenByDescending(t => t.IsDefault)
            .ThenBy(t => t.Name)
            .ToListAsync();
        return rows.Select(MapDto).ToList();
    }

    public async Task<(JamaahTemplateSaveResponse? Result, string? Error)> CreateAsync(int mosqueId, JamaahTemplateUpsertRequest req)
    {
        var err = Validate(req);
        if (err != null) return (null, err);

        if (req.IsDefault)
            await ClearDefaultAsync(mosqueId, exceptId: null);

        var entity = new JamaahTemplate { MosqueId = mosqueId };
        ApplyRequest(entity, req);
        SyncLegacyRulesJson(entity, req);
        ReplacePrayers(entity, req.Prayers);

        _uow.Repository<JamaahTemplate>().Add(entity);
        await _uow.SaveChangesAsync();

        // reload with prayers
        var saved = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .FirstAsync(t => t.Id == entity.Id);

        return (new JamaahTemplateSaveResponse
        {
            Template = MapDto(saved),
            Warnings = await BuildOverlapWarningsAsync(mosqueId, saved),
        }, null);
    }

    public async Task<(JamaahTemplateSaveResponse? Result, string? Error)> UpdateAsync(int mosqueId, int templateId, JamaahTemplateUpsertRequest req)
    {
        var err = Validate(req);
        if (err != null) return (null, err);

        var entity = await _uow.Repository<JamaahTemplate>().Query()
            .Include(t => t.Prayers)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId && !t.IsDeleted);
        if (entity == null) return (null, "Template not found.");

        if (req.IsDefault)
            await ClearDefaultAsync(mosqueId, exceptId: templateId);

        ApplyRequest(entity, req);
        SyncLegacyRulesJson(entity, req);
        ReplacePrayers(entity, req.Prayers);
        entity.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();

        var saved = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .FirstAsync(t => t.Id == entity.Id);

        return (new JamaahTemplateSaveResponse
        {
            Template = MapDto(saved),
            Warnings = await BuildOverlapWarningsAsync(mosqueId, saved),
        }, null);
    }

    public async Task<(JamaahTemplateDto? Result, string? Error)> DuplicateAsync(int mosqueId, int templateId)
    {
        var source = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId && !t.IsDeleted);
        if (source == null) return (null, "Template not found.");

        var copy = new JamaahTemplate
        {
            MosqueId = mosqueId,
            Name = $"{source.Name} (copy)",
            TemplateType = source.TemplateType,
            EffectiveFrom = source.EffectiveFrom,
            EffectiveTo = source.EffectiveTo,
            Priority = source.Priority + 1,
            IsActive = false,
            IsDefault = false,
            DaysOfWeekJson = source.DaysOfWeekJson,
            SpecificDatesJson = source.SpecificDatesJson,
            ExcludedDatesJson = source.ExcludedDatesJson,
            RecurringRulesJson = source.RecurringRulesJson,
        };
        foreach (var p in source.Prayers.OrderBy(x => x.SortOrder))
        {
            copy.Prayers.Add(new JamaahTemplatePrayer
            {
                PrayerName = p.PrayerName,
                StartTime = p.StartTime,
                JamaatTime = p.JamaatTime,
                SortOrder = p.SortOrder,
            });
        }

        _uow.Repository<JamaahTemplate>().Add(copy);
        await _uow.SaveChangesAsync();

        var saved = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .FirstAsync(t => t.Id == copy.Id);
        return (MapDto(saved), null);
    }

    public async Task<string?> DeleteAsync(int mosqueId, int templateId)
    {
        var entity = await _uow.Repository<JamaahTemplate>().Query()
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId && !t.IsDeleted);
        if (entity == null) return "Template not found.";
        _uow.Repository<JamaahTemplate>().Remove(entity);
        await _uow.SaveChangesAsync();
        return null;
    }

    public async Task<(JamaahTemplateDto? Result, string? Error)> SetActiveAsync(int mosqueId, int templateId, bool isActive)
    {
        var entity = await _uow.Repository<JamaahTemplate>().Query()
            .Include(t => t.Prayers)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.MosqueId == mosqueId && !t.IsDeleted);
        if (entity == null) return (null, "Template not found.");

        entity.IsActive = isActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return (MapDto(entity), null);
    }

    /// <summary>
    /// Whether generate should write a daily row for this date.
    /// Excluded → no. Specific dates → yes (even outside effective range).
    /// Else must be inside effective range and match days-of-week.
    /// </summary>
    public static bool ShouldGenerateOnDate(JamaahTemplate t, DateOnly date)
    {
        if (ParseDateList(t.ExcludedDatesJson).Contains(date))
            return false;

        var specific = ParseDateList(t.SpecificDatesJson);
        if (specific.Contains(date))
            return true;

        if (!InEffectiveRange(t, date))
            return false;

        var days = ParseDays(t.DaysOfWeekJson);
        if (days.Count == 0 && PrayerTimesHelper.TryParseTemplateTimes(t.RecurringRulesJson, out var legacy, out _))
            days = legacy.DaysOfWeek.ToList();
        if (days.Count == 0)
            days = [0, 1, 2, 3, 4, 5, 6];
        return days.Contains((int)date.DayOfWeek);
    }

    /// <summary>Pick the best template for a date: Ramadan first, then priority + effective range, then default.</summary>
    public async Task<JamaahTemplateDto?> ResolveForDateAsync(int mosqueId, DateOnly date)
    {
        var templates = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Include(t => t.Prayers)
            .Where(t => t.MosqueId == mosqueId && !t.IsDeleted && t.IsActive)
            .ToListAsync();

        var excluded = templates.Where(t => ParseDateList(t.ExcludedDatesJson).Contains(date)).ToList();
        var candidates = templates.Except(excluded).Where(t => AppliesOnDate(t, date)).ToList();

        var ramadan = candidates
            .Where(t => t.TemplateType == JamaahTemplateType.Ramadan)
            .OrderBy(t => t.Priority)
            .FirstOrDefault();
        if (ramadan != null) return MapDto(ramadan);

        var ranged = candidates
            .Where(t => InEffectiveRange(t, date))
            .OrderBy(t => t.Priority)
            .ThenByDescending(t => t.IsDefault)
            .FirstOrDefault();
        if (ranged != null) return MapDto(ranged);

        var def = candidates.FirstOrDefault(t => t.IsDefault) ?? candidates.OrderBy(t => t.Priority).FirstOrDefault();
        return def == null ? null : MapDto(def);
    }

    private async Task ClearDefaultAsync(int mosqueId, int? exceptId)
    {
        var defaults = await _uow.Repository<JamaahTemplate>().Query()
            .Where(t => t.MosqueId == mosqueId && t.IsDefault && !t.IsDeleted && (exceptId == null || t.Id != exceptId))
            .ToListAsync();
        foreach (var d in defaults)
        {
            d.IsDefault = false;
            d.UpdatedAt = DateTime.UtcNow;
        }
    }

    private async Task<List<string>> BuildOverlapWarningsAsync(int mosqueId, JamaahTemplate current)
    {
        var warnings = new List<string>();
        if (!current.EffectiveFrom.HasValue && !current.EffectiveTo.HasValue)
            return warnings;

        var others = await _uow.Repository<JamaahTemplate>().QueryNoTracking()
            .Where(t => t.MosqueId == mosqueId && !t.IsDeleted && t.Id != current.Id && t.IsActive)
            .ToListAsync();

        foreach (var o in others)
        {
            if (!RangesOverlap(current, o)) continue;
            if (current.TemplateType == JamaahTemplateType.Ramadan && o.TemplateType != JamaahTemplateType.Ramadan)
            {
                warnings.Add($"Overlaps seasonal template '{o.Name}' — Ramadan will override during its effective period.");
                continue;
            }
            if (o.TemplateType == JamaahTemplateType.Ramadan && current.TemplateType != JamaahTemplateType.Ramadan)
            {
                warnings.Add($"Overlaps Ramadan template '{o.Name}' — Ramadan takes precedence.");
                continue;
            }
            warnings.Add($"Date range overlaps '{o.Name}' (priority {o.Priority}). Lower priority number wins.");
        }
        return warnings;
    }

    private static bool RangesOverlap(JamaahTemplate a, JamaahTemplate b)
    {
        var aFrom = a.EffectiveFrom ?? DateOnly.MinValue;
        var aTo = a.EffectiveTo ?? DateOnly.MaxValue;
        var bFrom = b.EffectiveFrom ?? DateOnly.MinValue;
        var bTo = b.EffectiveTo ?? DateOnly.MaxValue;
        return aFrom <= bTo && bFrom <= aTo;
    }

    private static bool InEffectiveRange(JamaahTemplate t, DateOnly date)
    {
        if (t.EffectiveFrom.HasValue && date < t.EffectiveFrom.Value) return false;
        if (t.EffectiveTo.HasValue && date > t.EffectiveTo.Value) return false;
        // If no range set, treat as always-available only when default or when days match
        return true;
    }

    private static bool AppliesOnDate(JamaahTemplate t, DateOnly date)
    {
        var specific = ParseDateList(t.SpecificDatesJson);
        if (specific.Contains(date)) return true;
        var days = ParseDays(t.DaysOfWeekJson);
        if (days.Count == 0) days = [0, 1, 2, 3, 4, 5, 6];
        return days.Contains((int)date.DayOfWeek);
    }

    private static string? Validate(JamaahTemplateUpsertRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return "Template name is required.";
        if (req.Name.Trim().Length > 200)
            return "Template name must be 200 characters or fewer.";
        if (req.EffectiveFrom.HasValue && req.EffectiveTo.HasValue && req.EffectiveTo < req.EffectiveFrom)
            return "Effective To must be on or after Effective From.";
        if (req.Priority < 0 || req.Priority > 9999)
            return "Priority must be between 0 and 9999.";
        if (req.DaysOfWeek == null || req.DaysOfWeek.Count == 0)
            return "Select at least one day of week.";
        if (req.DaysOfWeek.Any(d => d is < 0 or > 6))
            return "Days of week must be 0 (Sun) through 6 (Sat).";

        var byName = req.Prayers?
            .Where(p => !string.IsNullOrWhiteSpace(p.PrayerName))
            .GroupBy(p => p.PrayerName.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];
        if (byName.Count == 0)
            return "At least one prayer time is required.";
        foreach (var g in byName)
        {
            if (!TimeOnly.TryParse(NormalizeTime(g.First().StartTime), out _) ||
                !TimeOnly.TryParse(NormalizeTime(g.First().JamaatTime), out _))
                return $"Invalid time for {g.Key}.";
        }
        return null;
    }

    private static void ApplyRequest(JamaahTemplate entity, JamaahTemplateUpsertRequest req)
    {
        entity.Name = req.Name.Trim();
        entity.TemplateType = req.TemplateType;
        entity.EffectiveFrom = req.EffectiveFrom;
        entity.EffectiveTo = req.EffectiveTo;
        entity.Priority = req.TemplateType == JamaahTemplateType.Ramadan && req.Priority >= 100
            ? 1
            : req.Priority;
        entity.IsActive = req.IsActive;
        entity.IsDefault = req.IsDefault;
        entity.DaysOfWeekJson = JsonSerializer.Serialize(req.DaysOfWeek.Distinct().OrderBy(d => d).ToList());
        entity.SpecificDatesJson = JsonSerializer.Serialize(req.SpecificDates?.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList() ?? []);
        entity.ExcludedDatesJson = JsonSerializer.Serialize(req.ExcludedDates?.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList() ?? []);
    }

    private static void ReplacePrayers(JamaahTemplate entity, List<JamaahTemplatePrayerDto> prayers)
    {
        entity.Prayers.Clear();
        var order = 0;
        foreach (var name in PrayerOrder)
        {
            var dto = prayers.FirstOrDefault(p => string.Equals(p.PrayerName, name, StringComparison.OrdinalIgnoreCase));
            if (dto == null) continue;
            entity.Prayers.Add(new JamaahTemplatePrayer
            {
                PrayerName = name,
                StartTime = TimeOnly.Parse(NormalizeTime(dto.StartTime)),
                JamaatTime = TimeOnly.Parse(NormalizeTime(dto.JamaatTime)),
                SortOrder = order++,
            });
        }
    }

    private static void SyncLegacyRulesJson(JamaahTemplate entity, JamaahTemplateUpsertRequest req)
    {
        string Get(string prayer, bool start)
        {
            var p = req.Prayers.FirstOrDefault(x => string.Equals(x.PrayerName, prayer, StringComparison.OrdinalIgnoreCase));
            var raw = p == null ? "00:00:00" : (start ? p.StartTime : p.JamaatTime);
            return NormalizeTime(raw);
        }

        var payload = new
        {
            fajrStart = Get("Fajr", true),
            fajrJamaat = Get("Fajr", false),
            dhuhrStart = Get("Dhuhr", true),
            dhuhrJamaat = Get("Dhuhr", false),
            asrStart = Get("Asr", true),
            asrJamaat = Get("Asr", false),
            maghribStart = Get("Maghrib", true),
            maghribJamaat = Get("Maghrib", false),
            ishaStart = Get("Isha", true),
            ishaJamaat = Get("Isha", false),
            daysOfWeek = req.DaysOfWeek,
        };
        entity.RecurringRulesJson = JsonSerializer.Serialize(payload);
    }

    private static JamaahTemplateDto MapDto(JamaahTemplate t)
    {
        var prayers = t.Prayers?.OrderBy(p => p.SortOrder).Select(p => new JamaahTemplatePrayerDto
        {
            PrayerName = p.PrayerName,
            StartTime = p.StartTime.ToString("HH:mm:ss"),
            JamaatTime = p.JamaatTime.ToString("HH:mm:ss"),
            SortOrder = p.SortOrder,
        }).ToList() ?? [];

        // Backfill from legacy JSON when prayers table empty
        if (prayers.Count == 0 && PrayerTimesHelper.TryParseTemplateTimes(t.RecurringRulesJson, out var times, out _))
        {
            prayers =
            [
                new() { PrayerName = "Fajr", StartTime = Fmt(times.FajrStart), JamaatTime = Fmt(times.FajrJamaat), SortOrder = 0 },
                new() { PrayerName = "Dhuhr", StartTime = Fmt(times.DhuhrStart), JamaatTime = Fmt(times.DhuhrJamaat), SortOrder = 1 },
                new() { PrayerName = "Asr", StartTime = Fmt(times.AsrStart), JamaatTime = Fmt(times.AsrJamaat), SortOrder = 2 },
                new() { PrayerName = "Maghrib", StartTime = Fmt(times.MaghribStart), JamaatTime = Fmt(times.MaghribJamaat), SortOrder = 3 },
                new() { PrayerName = "Isha", StartTime = Fmt(times.IshaStart), JamaatTime = Fmt(times.IshaJamaat), SortOrder = 4 },
            ];
        }

        var days = ParseDays(t.DaysOfWeekJson);
        if (days.Count == 0 && PrayerTimesHelper.TryParseTemplateTimes(t.RecurringRulesJson, out var legacy, out _))
            days = legacy.DaysOfWeek.ToList();

        return new JamaahTemplateDto
        {
            Id = t.Id,
            MosqueId = t.MosqueId,
            Name = t.Name,
            TemplateType = t.TemplateType,
            EffectiveFrom = t.EffectiveFrom,
            EffectiveTo = t.EffectiveTo,
            Priority = t.Priority,
            IsActive = t.IsActive,
            IsDefault = t.IsDefault,
            DaysOfWeek = days,
            SpecificDates = ParseDateList(t.SpecificDatesJson).Select(d => d.ToString("yyyy-MM-dd")).ToList(),
            ExcludedDates = ParseDateList(t.ExcludedDatesJson).Select(d => d.ToString("yyyy-MM-dd")).ToList(),
            Prayers = prayers,
            RecurringRulesJson = t.RecurringRulesJson,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
        };
    }

    private static string Fmt(TimeOnly t) => t.ToString("HH:mm:ss");

    private static string NormalizeTime(string? raw)
    {
        var v = (raw ?? "").Trim();
        if (v.Length == 5) return v + ":00";
        return v;
    }

    private static List<int> ParseDays(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<int>>(json) ?? []; }
        catch { return []; }
    }

    private static HashSet<DateOnly> ParseDateList(string? json)
    {
        var set = new HashSet<DateOnly>();
        if (string.IsNullOrWhiteSpace(json)) return set;
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json) ?? [];
            foreach (var s in list)
                if (DateOnly.TryParse(s, out var d)) set.Add(d);
        }
        catch { /* ignore */ }
        return set;
    }
}
