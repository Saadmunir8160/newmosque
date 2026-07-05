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
}

public class AddMyAdhkarRequest
{
    public int? AdhkarItemId { get; set; }
    public string? CustomTitle { get; set; }
    public int TargetCount { get; set; } = 1;
}
