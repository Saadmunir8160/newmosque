namespace MosqueOS.API.Models.PrayerEditor;

public class PrayerEditorDashboardResponse
{
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public DateOnly Today { get; set; }
    public string? TodayStatus { get; set; }
    public int DraftDays { get; set; }
    public int PublishedDays { get; set; }
    public int JumuahSlots { get; set; }
    public bool HasRamadanTimetable { get; set; }
    public string? RamadanStatus { get; set; }
    public int SpecialTimingsCount { get; set; }
}

public class PublishPrayerDateRequest
{
    public DateOnly Date { get; set; }
}

public class PublishPrayerMonthRequest
{
    public int Year { get; set; }
    public int Month { get; set; }
}

public class GenerateFromTemplateRequest
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    /// <summary>When false, skips existing Published days instead of overwriting them.</summary>
    public bool OverwritePublished { get; set; }
    /// <summary>When true, skips any existing row (draft or published). Takes precedence over OverwritePublished.</summary>
    public bool SkipExisting { get; set; }
    /// <summary>When true, generated/updated rows are Published; otherwise Draft.</summary>
    public bool Publish { get; set; }
    /// <summary>When true, returns what would happen without writing to the database.</summary>
    public bool Preview { get; set; }
}

public class GenerateFromTemplatePreviewRow
{
    public DateOnly Date { get; set; }
    public string Action { get; set; } = "skip"; // create | update | skip
    public string? Reason { get; set; }
}

public class GenerateFromTemplateResponse
{
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public bool Preview { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<GenerateFromTemplatePreviewRow> Rows { get; set; } = new();
}
