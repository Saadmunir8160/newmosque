using MosqueOS.Domain;

namespace MosqueOS.API.Models.Teacher;

public class TeacherDashboardResponse
{
    public int TotalClasses { get; set; }
    public int TotalStudents { get; set; }
    public double AttendanceRate { get; set; }
    public int PendingGrades { get; set; }
    public List<TeacherActivityItem> RecentActivity { get; set; } = new();
}

public class TeacherActivityItem
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public DateTime At { get; set; }
}

public class ClassReportRow
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int Present { get; set; }
    public int Absent { get; set; }
    public int Late { get; set; }
    public double AttendanceRate { get; set; }
}

public class CreateProgressRequest
{
    public int ClassId { get; set; }
    public StudentProgressType ProgressType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? SurahOrTopic { get; set; }
    public decimal? Score { get; set; }
    public DateOnly? RecordDate { get; set; }
}

public class CreateAssignmentRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? ResourceUrl { get; set; }
    public string? ResourceFileName { get; set; }
}

public class GradeAssignmentRequest
{
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
    public AssignmentGradeStatus Status { get; set; } = AssignmentGradeStatus.Graded;
}
