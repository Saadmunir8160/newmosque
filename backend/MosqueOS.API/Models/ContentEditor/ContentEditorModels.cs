using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Models.ContentEditor
{
    public class ContentEditorDashboardResponse
    {
        public int AwradCollections { get; set; }
        public int Duas { get; set; }
        public int AdhkarItems { get; set; }
        public int LibraryItems { get; set; }
        public int MediaAssets { get; set; }
        public int DraftCount { get; set; }
        public int InReviewCount { get; set; }
        public int ApprovedCount { get; set; }
        public int PublishedCount { get; set; }
        public int SentBackCount { get; set; }
        public List<ContentEditorActivityItem> RecentActivity { get; set; } = new();
    }

    public class ContentEditorActivityItem
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string Title { get; set; } = string.Empty;
        public ContentPublishStatus FromStatus { get; set; }
        public ContentPublishStatus ToStatus { get; set; }
        public DateTime At { get; set; }
    }

    public class ContentReviewItem
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public string Title { get; set; } = string.Empty;
        public ContentPublishStatus Status { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? Category { get; set; }
        public int StepCount { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }

    public class WorkflowTransitionRequest
    {
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public ContentPublishStatus ToStatus { get; set; }
        public string? Comment { get; set; }
    }

    public class WirdCollectionDetailResponse
    {
        public WirdCollection Collection { get; set; } = null!;
        public List<WirdCollectionItemRow> Items { get; set; } = new();
        public WirdCollectionStats Stats { get; set; } = new();
        public List<CollectionActivityItem> RecentActivity { get; set; } = new();
        public CollectionAnalyticsBundle Analytics { get; set; } = new();
        public List<CollectionMemberPreview> RecentMembers { get; set; } = new();
        public List<CollectionMemberRow> Members { get; set; } = new();
    }

    public class WirdCollectionItemRow
    {
        public int StepId { get; set; }
        public int OrderIndex { get; set; }
        public int ContentItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int Count { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? LastUpdated { get; set; }
    }

    public class WirdCollectionStats
    {
        public int TotalItems { get; set; }
        public int TotalMembers { get; set; }
        public int ActiveToday { get; set; }
        public double CompletionRate { get; set; }
        public double EngagementRate { get; set; }
        public double MemberGrowthPercent { get; set; }
        public int Views { get; set; }
        public int Completions { get; set; }
        public DateTime? LastUpdated { get; set; }
        public double TotalItemsTrend { get; set; }
        public double TotalMembersTrend { get; set; }
        public double ActiveTodayTrend { get; set; }
        public double CompletionRateTrend { get; set; }
        public double EngagementRateTrend { get; set; }
    }

    public class CollectionActivityItem
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserInitials { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public DateTime At { get; set; }
    }

    public class CollectionAnalyticsPoint
    {
        public string Date { get; set; } = string.Empty;
        public int Usage { get; set; }
        public int Completions { get; set; }
        public int Members { get; set; }
    }

    public class CollectionAnalyticsBundle
    {
        public int Views { get; set; }
        public int Completions { get; set; }
        public double Engagement { get; set; }
        public double Growth { get; set; }
        public List<CollectionAnalyticsPoint> DailyTrend { get; set; } = new();
    }

    public class CollectionMemberPreview
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
    }

    public class CollectionMemberRow
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
        public DateTime? LastActiveAt { get; set; }
        public bool Completed { get; set; }
    }

    public class BulkCollectionItemActionRequest
    {
        public string Action { get; set; } = string.Empty;
        public List<int> StepIds { get; set; } = new();
    }

    public class UpsertCollectionItemRequest
    {
        public string ItemName { get; set; } = string.Empty;
        public string Type { get; set; } = "Dhikr";
        public int Count { get; set; } = 1;
        public string Category { get; set; } = "General";
        public string Status { get; set; } = "Published";
    }
}
