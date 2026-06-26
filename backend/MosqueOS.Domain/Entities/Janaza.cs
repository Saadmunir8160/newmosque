namespace MosqueOS.Domain.Entities
{
    public class JanazaAnnouncement : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateOnly DateOfDeath { get; set; }
        public DateOnly JanazaDate { get; set; }
        public TimeOnly JanazaTime { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? BurialLocation { get; set; }
        public string? Notes { get; set; }
        public string? MosqueSiteUrl { get; set; }
        public PublishStatus Status { get; set; } = PublishStatus.Published;
        public string? CreatedById { get; set; }
        public ApplicationUser? CreatedBy { get; set; }
        public DateTime? PublishedAt { get; set; }
    }

    public class ReadingCampaign : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string DeceasedName { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? CreatedById { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsArchived { get; set; }
        public int TargetReadings { get; set; } = 100_000;
        public DateTime? ArchivedAt { get; set; }

        public ICollection<ReadingAllocation> Allocations { get; set; } = new List<ReadingAllocation>();
    }

    public class ReadingAllocation : BaseEntity
    {
        public int CampaignId { get; set; }
        public ReadingCampaign? Campaign { get; set; }
        public string? UserId { get; set; }
        public ApplicationUser? User { get; set; }
        public ReadingAllocationType Type { get; set; }
        public string Description { get; set; } = string.Empty;
        public ReadingAllocationStatus Status { get; set; } = ReadingAllocationStatus.Assigned;
        public int ReadingCount { get; set; } = 1;
        public string? Region { get; set; }
    }
}
