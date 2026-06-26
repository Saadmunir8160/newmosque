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
