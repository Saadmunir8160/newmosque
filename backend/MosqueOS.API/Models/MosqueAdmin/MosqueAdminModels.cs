namespace MosqueOS.API.Models.MosqueAdmin;

public class MosqueAdminDashboardResponse
{
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public DateTime SyncedAt { get; set; }
    public MosqueAdminStats Stats { get; set; } = new();
    public MosqueAdminCharts Charts { get; set; } = new();
    public IReadOnlyList<MosqueAdminActivityItem> RecentActivity { get; set; } = Array.Empty<MosqueAdminActivityItem>();
    public MosqueAdminPrayerSummary? TodayPrayer { get; set; }
}

public class MosqueAdminStats
{
    public int TotalMembers { get; set; }
    public int TotalStudents { get; set; }
    public int TotalTeachers { get; set; }
    public int UpcomingEvents { get; set; }
    public int ActiveCommunities { get; set; }
    public int PendingParticipationRequests { get; set; }
    public int ActiveAnnouncements { get; set; }
}

public class MosqueAdminCharts
{
    public IReadOnlyList<ChartPoint> MonthlyAttendance { get; set; } = Array.Empty<ChartPoint>();
    public IReadOnlyList<ChartPoint> EventParticipation { get; set; } = Array.Empty<ChartPoint>();
    public IReadOnlyList<ChartPoint> StudentGrowth { get; set; } = Array.Empty<ChartPoint>();
    public IReadOnlyList<ChartPoint> FeeCollection { get; set; } = Array.Empty<ChartPoint>();
}

public class ChartPoint
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
}

public class MosqueAdminActivityItem
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime At { get; set; }
}

public class MosqueAdminPrayerSummary
{
    public string? Fajr { get; set; }
    public string? Dhuhr { get; set; }
    public string? Asr { get; set; }
    public string? Maghrib { get; set; }
    public string? Isha { get; set; }
}

public class MosqueAdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public IReadOnlyList<string> Roles { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMosqueUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class UpdateMosqueUserRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
}

public class SetUserActiveRequest
{
    public bool Active { get; set; }
}

public class MosqueAdminReportResponse
{
    public string ReportType { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public IReadOnlyList<MosqueAdminReportRow> Rows { get; set; } = Array.Empty<MosqueAdminReportRow>();
    public MosqueAdminReportSummary Summary { get; set; } = new();
}

public class MosqueAdminReportRow
{
    public string Label { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal Value { get; set; }
    public string? Detail { get; set; }
    public DateTime? Date { get; set; }
}

public class MosqueAdminReportSummary
{
    public int TotalRows { get; set; }
    public decimal TotalValue { get; set; }
}

public class ParticipationStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
