namespace MosqueOS.Domain.Entities
{
    /// <summary>A single reusable passage: dhikr, salawat, Qur'an portion, dua, poem.</summary>
    public class ContentItem : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string ArabicText { get; set; } = string.Empty;
        public string? Transliteration { get; set; }
        public string? Translation { get; set; }
        public int RepeatCount { get; set; } = 1;
        public string? AudioUrl { get; set; }
        public string? SourceRef { get; set; }
        public ContentItemType Type { get; set; } = ContentItemType.Dhikr;
        public ContentPublishStatus Status { get; set; } = ContentPublishStatus.Published;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }
    }

    public class WirdCollection : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public Tariqa Tariqa { get; set; } = Tariqa.General;
        public WirdCollectionType Type { get; set; } = WirdCollectionType.Daily;
        public string? RecommendedTime { get; set; }
        public string? Description { get; set; }
        public ContentPublishStatus Status { get; set; } = ContentPublishStatus.Published;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }

        public ICollection<WirdStep> Steps { get; set; } = new List<WirdStep>();
    }

    public class WirdStep : BaseEntity
    {
        public int CollectionId { get; set; }
        public WirdCollection? Collection { get; set; }
        public int ContentItemId { get; set; }
        public ContentItem? ContentItem { get; set; }
        public int OrderIndex { get; set; }
        public string? CustomInstructions { get; set; }
    }

    public class UserWirdSchedule : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public PrayerSlot PrayerSlot { get; set; }
        public int CollectionId { get; set; }
        public WirdCollection? Collection { get; set; }
        public WirdMode Mode { get; set; } = WirdMode.Full;
    }

    public class UserWirdProgress : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public int CollectionId { get; set; }
        public WirdCollection? Collection { get; set; }
        public bool Completed { get; set; }
        public DateTime? LastCompletedAt { get; set; }
    }
}
