using MosqueOS.Domain;

namespace MosqueOS.API.Models.Public
{
    public class PublicHomeResponse
    {
        public PublicMosqueSummary? Mosque { get; set; }
        public List<object> Announcements { get; set; } = new();
        public List<object> UpcomingEvents { get; set; } = new();
        public object? TodayPrayerTimes { get; set; }
    }

    public class PublicMosqueSummary
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? City { get; set; }
        public string? Address { get; set; }
        public string? Postcode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
