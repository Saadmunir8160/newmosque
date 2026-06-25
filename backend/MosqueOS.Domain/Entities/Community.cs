namespace MosqueOS.Domain.Entities
{
    public class Community : BaseEntity
    {
        public int? MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Name { get; set; } = string.Empty;
        public CommunityType Type { get; set; }
        public string? Description { get; set; }
        public bool IsPublic { get; set; } = true;

        public ICollection<CommunityMember> Members { get; set; } = new List<CommunityMember>();
        public ICollection<CommunityPost> Posts { get; set; } = new List<CommunityPost>();
        public ICollection<CommunityResource> Resources { get; set; } = new List<CommunityResource>();
    }

    public class CommunityMember : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public CommunityRole Role { get; set; } = CommunityRole.Member;
    }

    public class CommunityPost : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public string AuthorId { get; set; } = string.Empty;
        public ApplicationUser? Author { get; set; }
        public string Content { get; set; } = string.Empty;
        /// <summary>Optional hadith reference where applicable.</summary>
        public string? HadithRef { get; set; }
    }

    public class CommunityResource : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string? Type { get; set; }
    }

    public class CommunityEvent : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public int EventId { get; set; }
        public Event? Event { get; set; }
    }

    public class GuidanceNote : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public string MuridUserId { get; set; } = string.Empty;
        public ApplicationUser? Murid { get; set; }
        public GuidanceNoteType Type { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateOnly? FollowUpDate { get; set; }
        public bool IsCompleted { get; set; }
        public string? CreatedById { get; set; }
    }

    public class CommunityGathering : BaseEntity
    {
        public int CommunityId { get; set; }
        public Community? Community { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public CommunityGatheringType GatheringType { get; set; }
        public DateOnly Date { get; set; }
        public TimeOnly? StartTime { get; set; }
        public string? Location { get; set; }
        public string? CreatedById { get; set; }

        public ICollection<GatheringAttendance> Attendance { get; set; } = new List<GatheringAttendance>();
    }

    public class GatheringAttendance : BaseEntity
    {
        public int GatheringId { get; set; }
        public CommunityGathering? Gathering { get; set; }
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    }
}
