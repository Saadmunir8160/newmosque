namespace MosqueOS.Domain.Entities
{
    public class AdhkarItem : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string ArabicText { get; set; } = string.Empty;
        public string? Transliteration { get; set; }
        public string? Translation { get; set; }
        public int DefaultCount { get; set; } = 1;
        public string? Category { get; set; }
    }

    public class UserAdhkar : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        /// <summary>Null when the user defines a fully custom dhikr.</summary>
        public int? AdhkarItemId { get; set; }
        public AdhkarItem? AdhkarItem { get; set; }
        public string? CustomTitle { get; set; }
        public string? CustomArabicText { get; set; }
        public int TargetCount { get; set; } = 1;
        public PrayerSlot? PrayerSlot { get; set; }
        public AdhkarOccasion Occasion { get; set; } = AdhkarOccasion.Always;

        public ICollection<UserAdhkarLog> Logs { get; set; } = new List<UserAdhkarLog>();
    }

    public class UserAdhkarLog : BaseEntity
    {
        public int UserAdhkarId { get; set; }
        public UserAdhkar? UserAdhkar { get; set; }
        public DateOnly Date { get; set; }
        public int CountCompleted { get; set; }
    }
}
