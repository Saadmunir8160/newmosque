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
        public string? YoutubeUrl { get; set; }
        public string? TwitterUrl { get; set; }
        /// <summary>JSON social_links document: { "links": [ { "platform", "url", "label?" } ] }.</summary>
        public string? SocialLinksJson { get; set; }
        public string? ShortDescription { get; set; }
        public string? Description { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public bool AllowClaimRequests { get; set; } = true;
        public bool RequireManualApproval { get; set; } = true;
        public bool PublicProfileEnabled { get; set; } = true;
        public bool IsDraft { get; set; }
        /// <summary>JSON array of facility keys, e.g. ["Parking","WuduArea"].</summary>
        public string? FacilitiesJson { get; set; }
        /// <summary>JSON object for prayer calculation method, adjustments, jumuah times.</summary>
        public string? PrayerSettingsJson { get; set; }
        /// <summary>JSON array of gallery image URLs.</summary>
        public string? GalleryJson { get; set; }
        public string? LogoUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string Timezone { get; set; } = "Europe/London";
        public string? MapLocation { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int? EstablishedYear { get; set; }
        public int? Capacity { get; set; }
        public string? Vision { get; set; }
        public string? History { get; set; }
        public string? ParkingInfo { get; set; }
        /// <summary>JSON array of service keys, e.g. ["DailyPrayers","Jumuah"].</summary>
        public string? ServicesJson { get; set; }
        /// <summary>JSON: leadership[], stats overrides for public profile.</summary>
        public string? ProfileJson { get; set; }
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
