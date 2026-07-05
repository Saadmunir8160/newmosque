using MosqueOS.Domain;

namespace MosqueOS.Domain.Entities
{
    public class RitualGuide : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public RitualGuideType Type { get; set; } = RitualGuideType.Wudu;
        public ContentPublishStatus Status { get; set; } = ContentPublishStatus.Published;
        public DateTime? PublishedAt { get; set; }
        public string? PublishedById { get; set; }

        public ICollection<RitualStep> Steps { get; set; } = new List<RitualStep>();
    }

    public class RitualStep : BaseEntity
    {
        public int GuideId { get; set; }
        public RitualGuide? Guide { get; set; }
        public int OrderIndex { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int? DuaId { get; set; }
        public Dua? Dua { get; set; }
    }
}
