namespace MosqueOS.API.Models.Ritual
{
    public class RitualGuideListItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public int StepCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpsertRitualGuideRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "Wudu";
    }

    public class UpsertRitualStepRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int OrderIndex { get; set; }
        public string? ImageUrl { get; set; }
        public int? DuaId { get; set; }
    }
}
