namespace MosqueOS.Domain.Entities
{
    public class Announcement : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public PublishStatus Status { get; set; } = PublishStatus.Draft;
        public bool IsFeatured { get; set; }
        public DateTime? PublishedAt { get; set; }
        public string? CreatedById { get; set; }
    }
}
