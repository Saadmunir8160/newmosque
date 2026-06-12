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
}
