namespace MosqueOS.API.Models.Member;

public class MemberDashboardResponse
{
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public MemberProgressSummary Progress { get; set; } = new();
    public IReadOnlyList<MemberNotificationItem> Notifications { get; set; } = Array.Empty<MemberNotificationItem>();
}

public class MemberProgressSummary
{
    public int WirdCompletedToday { get; set; }
    public int AdhkarCompletedToday { get; set; }
    public int QuranParasCompleted { get; set; }
    public int EventsRegistered { get; set; }
    public int CommunitiesJoined { get; set; }
    public int ParticipationRegistered { get; set; }
}

public class MemberNotificationItem
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? Route { get; set; }
    public DateTime? At { get; set; }
}

public class EventRegistrationDto
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string EventTitle { get; set; } = string.Empty;
    public DateOnly EventDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}
