using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Models.Awrad;

public class RecommendedWirdResponse
{
    public string Slot { get; set; } = string.Empty;
    public WirdCollection? Collection { get; set; }
    public string Mode { get; set; } = string.Empty;
    public string? UserLevel { get; set; }
    public int StepCount { get; set; }
}

public class WirdCompletionResponse
{
    public int CollectionId { get; set; }
    public bool Completed { get; set; }
    public DateTime? LastCompletedAt { get; set; }
}
