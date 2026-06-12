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
        public DateOnly Date { get; set; }
        public string ChangedById { get; set; } = string.Empty;
        public string ChangeDescription { get; set; } = string.Empty;
    }
}
