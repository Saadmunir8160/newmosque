using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Models.Adhkar;

public class MyAdhkarItemResponse
{
    public UserAdhkar UserAdhkar { get; set; } = null!;
    public int TodayCount { get; set; }
}

public class AdhkarIncrementResponse
{
    public int Completed { get; set; }
    public int Target { get; set; }
    public bool IsComplete { get; set; }
    public string ProgressLabel { get; set; } = string.Empty;
}

public class AdhkarSummaryResponse
{
    public int ItemCount { get; set; }
    public int CompletedItemCount { get; set; }
    public int TodayCompleted { get; set; }
    public int TodayTarget { get; set; }
    public string ProgressLabel { get; set; } = "0/0";
}

public class UpdateMyAdhkarRequest
{
    public int? TargetCount { get; set; }
    public PrayerSlot? PrayerSlot { get; set; }
    public bool? ClearPrayerSlot { get; set; }
    public AdhkarOccasion? Occasion { get; set; }
    public string? CustomTitle { get; set; }
}

public class AddMyAdhkarRequest
{
    public int? AdhkarItemId { get; set; }
    public string? CustomTitle { get; set; }
    public int TargetCount { get; set; } = 1;
}
