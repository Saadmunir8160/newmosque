namespace MosqueOS.Domain.Entities
{
    public class Mosque : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Postcode { get; set; } = string.Empty;
        public string Country { get; set; } = "United Kingdom";
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string Timezone { get; set; } = "Europe/London";
        public string? MapLocation { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public MosqueStatus Status { get; set; } = MosqueStatus.Unclaimed;
        public string? OwnerId { get; set; }
        public ApplicationUser? Owner { get; set; }

        public ICollection<MosqueSetting> Settings { get; set; } = new List<MosqueSetting>();
    }

    /// <summary>Module feature flag per mosque (e.g. "PrayerTimes" enabled/disabled).</summary>
    public class MosqueSetting : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string ModuleKey { get; set; } = string.Empty;
        public bool IsEnabled { get; set; } = true;
    }
}
