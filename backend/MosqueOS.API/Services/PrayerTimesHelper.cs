using MosqueOS.Domain.Entities;
using System.Text.Json;

namespace MosqueOS.API.Services;

/// <summary>Applies prayer exceptions and parses jamaah template rules for Module 3.2.</summary>
public static class PrayerTimesHelper
{
    public static PrayerTimesDaily CloneWithExceptions(PrayerTimesDaily source, IEnumerable<PrayerException> exceptions)
    {
        var row = new PrayerTimesDaily
        {
            Id = source.Id,
            MosqueId = source.MosqueId,
            Date = source.Date,
            FajrStart = source.FajrStart,
            FajrJamaat = source.FajrJamaat,
            DhuhrStart = source.DhuhrStart,
            DhuhrJamaat = source.DhuhrJamaat,
            AsrStart = source.AsrStart,
            AsrJamaat = source.AsrJamaat,
            MaghribStart = source.MaghribStart,
            MaghribJamaat = source.MaghribJamaat,
            IshaStart = source.IshaStart,
            IshaJamaat = source.IshaJamaat,
            Status = source.Status,
            PublishedAt = source.PublishedAt,
            PublishedById = source.PublishedById,
            CreatedAt = source.CreatedAt,
            UpdatedAt = source.UpdatedAt,
        };

        foreach (var ex in exceptions)
            ApplyException(row, ex.Prayer, ex.OverrideValue);

        return row;
    }

    public static void ApplyException(PrayerTimesDaily row, string prayer, TimeOnly value)
    {
        switch ((prayer ?? string.Empty).Trim().ToLowerInvariant())
        {
            case "fajr":
            case "fajrjamaat":
                row.FajrJamaat = value;
                break;
            case "fajrstart":
                row.FajrStart = value;
                break;
            case "dhuhr":
            case "zuhr":
            case "dhuhrjamaat":
                row.DhuhrJamaat = value;
                break;
            case "dhuhrstart":
                row.DhuhrStart = value;
                break;
            case "asr":
            case "asrjamaat":
                row.AsrJamaat = value;
                break;
            case "asrstart":
                row.AsrStart = value;
                break;
            case "maghrib":
            case "maghribjamaat":
                row.MaghribJamaat = value;
                break;
            case "maghribstart":
                row.MaghribStart = value;
                break;
            case "isha":
            case "ishajamaat":
                row.IshaJamaat = value;
                break;
            case "ishastart":
                row.IshaStart = value;
                break;
        }
    }

    public static bool TryParseTemplateTimes(string? json, out TemplateTimes times, out string? error)
    {
        times = default;
        error = null;
        if (string.IsNullOrWhiteSpace(json))
        {
            error = "Template recurring rules JSON is required (prayer start/jamaat times).";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            times = new TemplateTimes(
                ReadTime(root, "fajrStart", "FajrStart"),
                ReadTime(root, "fajrJamaat", "FajrJamaat"),
                ReadTime(root, "dhuhrStart", "DhuhrStart"),
                ReadTime(root, "dhuhrJamaat", "DhuhrJamaat"),
                ReadTime(root, "asrStart", "AsrStart"),
                ReadTime(root, "asrJamaat", "AsrJamaat"),
                ReadTime(root, "maghribStart", "MaghribStart"),
                ReadTime(root, "maghribJamaat", "MaghribJamaat"),
                ReadTime(root, "ishaStart", "IshaStart"),
                ReadTime(root, "ishaJamaat", "IshaJamaat"),
                ReadDaysOfWeek(root));
            return true;
        }
        catch (Exception ex)
        {
            error = $"Invalid template rules JSON: {ex.Message}";
            return false;
        }
    }

    public static string BuildTemplateRulesJson(TemplateTimes times) =>
        JsonSerializer.Serialize(new
        {
            fajrStart = Format(times.FajrStart),
            fajrJamaat = Format(times.FajrJamaat),
            dhuhrStart = Format(times.DhuhrStart),
            dhuhrJamaat = Format(times.DhuhrJamaat),
            asrStart = Format(times.AsrStart),
            asrJamaat = Format(times.AsrJamaat),
            maghribStart = Format(times.MaghribStart),
            maghribJamaat = Format(times.MaghribJamaat),
            ishaStart = Format(times.IshaStart),
            ishaJamaat = Format(times.IshaJamaat),
            daysOfWeek = times.DaysOfWeek,
        });

    private static TimeOnly ReadTime(JsonElement root, string camel, string pascal)
    {
        if (root.TryGetProperty(camel, out var a) && a.ValueKind == JsonValueKind.String)
            return TimeOnly.Parse(a.GetString()!);
        if (root.TryGetProperty(pascal, out var b) && b.ValueKind == JsonValueKind.String)
            return TimeOnly.Parse(b.GetString()!);
        throw new InvalidOperationException($"Missing time field '{camel}'.");
    }

    private static int[] ReadDaysOfWeek(JsonElement root)
    {
        if (!root.TryGetProperty("daysOfWeek", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return new[] { 0, 1, 2, 3, 4, 5, 6 };
        var list = new List<int>();
        foreach (var item in arr.EnumerateArray())
            list.Add(item.GetInt32());
        return list.Count > 0 ? list.ToArray() : new[] { 0, 1, 2, 3, 4, 5, 6 };
    }

    private static string Format(TimeOnly t) => t.ToString("HH:mm:ss");

    public readonly record struct TemplateTimes(
        TimeOnly FajrStart,
        TimeOnly FajrJamaat,
        TimeOnly DhuhrStart,
        TimeOnly DhuhrJamaat,
        TimeOnly AsrStart,
        TimeOnly AsrJamaat,
        TimeOnly MaghribStart,
        TimeOnly MaghribJamaat,
        TimeOnly IshaStart,
        TimeOnly IshaJamaat,
        int[] DaysOfWeek);
}
