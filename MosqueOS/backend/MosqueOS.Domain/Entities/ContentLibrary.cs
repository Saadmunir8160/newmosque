using MosqueOS.Domain;

namespace MosqueOS.Domain.Entities
{
    public class ContentArticle : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Summary { get; set; }
        public string Body { get; set; } = string.Empty;
        public LibraryItemType ItemType { get; set; } = LibraryItemType.Article;
        public string? ResourceUrl { get; set; }
        public ContentPublishStatus Status { get; set; } = ContentPublishStatus.Draft;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }
        public string? AuthorId { get; set; }
    }

    public class MediaAsset : BaseEntity
    {
        public string FileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public MediaAssetType MediaType { get; set; }
        public string Url { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public string? UploadedById { get; set; }
    }

    public class ContentWorkflowLog : BaseEntity
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public ContentPublishStatus FromStatus { get; set; }
        public ContentPublishStatus ToStatus { get; set; }
        public string? ActorId { get; set; }
        public string? Comment { get; set; }
    }
}
