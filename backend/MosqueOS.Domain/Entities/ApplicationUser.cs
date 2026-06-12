using Microsoft.AspNetCore.Identity;

namespace MosqueOS.Domain.Entities
{
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;

        // Personalisation (spec section 4)
        public Tariqa Tariqa { get; set; } = Tariqa.General;
        public UserLevel Level { get; set; } = UserLevel.Beginner;
        public DisplayPreference DisplayPreference { get; set; } = DisplayPreference.ArabicTranslation;
        public WirdMode WirdMode { get; set; } = WirdMode.Full;

        // Mosque preferences (spec 4.3)
        public int? HomeMosqueId { get; set; }
        public Mosque? HomeMosque { get; set; }
        public int SearchRadiusKm { get; set; } = 10;

        /// <summary>Comma-separated interests: DHIKR, LEARNING, COMMUNITY.</summary>
        public string? Interests { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
