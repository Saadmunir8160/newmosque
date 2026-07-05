namespace MosqueOS.Domain.Entities
{
    public class Event : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public string? Location { get; set; }
        public string? Speaker { get; set; }
        /// <summary>Stored for v2; not enforced in v1.</summary>
        public bool IsRecurring { get; set; }
        public EventStatus Status { get; set; } = EventStatus.Scheduled;
        public EventType EventType { get; set; } = EventType.General;
        /// <summary>Optional link to a guided reading sequence (Awrad module).</summary>
        public int? WirdCollectionId { get; set; }
        public WirdCollection? WirdCollection { get; set; }
    }
}
