using MosqueOS.Domain;

namespace MosqueOS.API.Models.Janaza
{
    public class JanazaListItem
    {
        public int Id { get; set; }
        public int MosqueId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateOnly DateOfDeath { get; set; }
        public DateOnly JanazaDate { get; set; }
        public TimeOnly JanazaTime { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? BurialLocation { get; set; }
        public string? Notes { get; set; }
        public string? MosqueSiteUrl { get; set; }
        public PublishStatus Status { get; set; }
        public string? PostedByName { get; set; }
        public string? PostedByInitials { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public bool NotificationRequested { get; set; }
    }

    public class UpsertJanazaRequest
    {
        public string Name { get; set; } = string.Empty;
        public DateOnly DateOfDeath { get; set; }
        public DateOnly JanazaDate { get; set; }
        public TimeOnly JanazaTime { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? BurialLocation { get; set; }
        public string? Notes { get; set; }
        public string? MosqueSiteUrl { get; set; }
        public PublishStatus? Status { get; set; }
        /// <summary>Optional: request push notification to mosque followers (queued stub in v1).</summary>
        public bool NotifyFollowers { get; set; }
    }
}
