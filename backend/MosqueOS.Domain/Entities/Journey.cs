namespace MosqueOS.Domain.Entities
{
    public class JourneyGuide : BaseEntity
    {
        public JourneyType Type { get; set; }
        public string Title { get; set; } = string.Empty;

        public ICollection<JourneyStage> Stages { get; set; } = new List<JourneyStage>();
    }

    public class JourneyStage : BaseEntity
    {
        public int GuideId { get; set; }
        public JourneyGuide? Guide { get; set; }
        public int OrderIndex { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        /// <summary>Relevant duas/readings for this stage (text; can reference Dua ids).</summary>
        public string? Duas { get; set; }
        public string? Notes { get; set; }
    }
}
