namespace MosqueOS.Domain.Entities
{
    public class PrayerTimesDaily : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public DateOnly Date { get; set; }

        public TimeOnly FajrStart { get; set; }
        public TimeOnly FajrJamaat { get; set; }
        public TimeOnly DhuhrStart { get; set; }
        public TimeOnly DhuhrJamaat { get; set; }
        public TimeOnly AsrStart { get; set; }
        public TimeOnly AsrJamaat { get; set; }
        public TimeOnly MaghribStart { get; set; }
        public TimeOnly MaghribJamaat { get; set; }
        public TimeOnly IshaStart { get; set; }
        public TimeOnly IshaJamaat { get; set; }

        public PublishStatus Status { get; set; } = PublishStatus.Published;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }
    }

    public class JumuahTime : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public int SlotNumber { get; set; } = 1;
        public TimeOnly KhutbahTime { get; set; }
        public TimeOnly JamaatTime { get; set; }
    }

    public class PrayerException : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public DateOnly Date { get; set; }
        public string Prayer { get; set; } = string.Empty;
        public TimeOnly OverrideValue { get; set; }
        public string? Reason { get; set; }
    }

    public class PrayerTimeAuditLog : BaseEntity
    {
        public int MosqueId { get; set; }
        public DateOnly? Date { get; set; }
        public string ChangedById { get; set; } = string.Empty;
        public string ChangeDescription { get; set; } = string.Empty;
        public string? ActionType { get; set; }
    }

    public class RamadanTimetable : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public int Year { get; set; }
        public string? HijriYear { get; set; }
        public string Title { get; set; } = "Ramadan Timetable";
        public PublishStatus Status { get; set; } = PublishStatus.Draft;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }

        public ICollection<RamadanDayEntry> Days { get; set; } = new List<RamadanDayEntry>();
    }

    public class RamadanDayEntry : BaseEntity
    {
        public int TimetableId { get; set; }
        public RamadanTimetable? Timetable { get; set; }
        public int DayNumber { get; set; }
        public DateOnly Date { get; set; }
        public TimeOnly SuhoorEnd { get; set; }
        public TimeOnly IftarJamaat { get; set; }
        public TimeOnly? TaraweehJamaat { get; set; }
        public string? Notes { get; set; }
    }

    public class PrayerSpecialTiming : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public DateOnly Date { get; set; }
        public string Label { get; set; } = string.Empty;
        public TimeOnly Time { get; set; }
        public string? Notes { get; set; }
        public bool IsRamadan { get; set; }
    }

    /// <summary>Recurring jamaah template for auto-generating daily prayer time rows (spec 3.2).</summary>
    public class JamaahTemplate : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Name { get; set; } = string.Empty;
        /// <summary>JSON-serialised recurring rules: e.g. { dayOfWeek, offsetMinutes, prayer }.</summary>
        public string? RecurringRulesJson { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
