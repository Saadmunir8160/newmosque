using MosqueOS.Domain;

namespace MosqueOS.API.Models.Muqaddam;

public class MuqaddamDashboardResponse
{
    public int AssignedCommunities { get; set; }
    public int TotalMurids { get; set; }
    public int UpcomingGatherings { get; set; }
    public int PendingFollowUps { get; set; }
    public double ParticipationRate { get; set; }
    public List<MuqaddamActivityItem> RecentActivity { get; set; } = new();
}

public class MuqaddamActivityItem
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime At { get; set; }
}

public class CreateCommunityRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? MosqueId { get; set; }
    public bool IsPublic { get; set; } = true;
}

public class UpdateCommunityRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsPublic { get; set; }
}

public class AddMemberRequest
{
    public string Email { get; set; } = string.Empty;
    public CommunityRole Role { get; set; } = CommunityRole.Member;
}

public class CreateGuidanceNoteRequest
{
    public int CommunityId { get; set; }
    public string MuridUserId { get; set; } = string.Empty;
    public GuidanceNoteType Type { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateOnly? FollowUpDate { get; set; }
}

public class CreateGatheringRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CommunityGatheringType GatheringType { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? StartTime { get; set; }
    public string? Location { get; set; }
}

public class GatheringAttendanceRequest
{
    public string UserId { get; set; } = string.Empty;
    public AttendanceStatus Status { get; set; }
}

public class MuqaddamReportRow
{
    public string Label { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int Value { get; set; }
    public string? Detail { get; set; }
}
