namespace MosqueOS.Domain.Entities
{
    public class Student : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? UserId { get; set; }
        public ApplicationUser? User { get; set; }

        public ICollection<Guardian> Guardians { get; set; } = new List<Guardian>();
        public ICollection<Enrolment> Enrolments { get; set; } = new List<Enrolment>();
    }

    public class Guardian : BaseEntity
    {
        public string UserId { get; set; } = string.Empty;
        public ApplicationUser? User { get; set; }
        public int StudentId { get; set; }
        public Student? Student { get; set; }
        public string Relationship { get; set; } = string.Empty;
    }

    public class MadrassahClass : BaseEntity
    {
        public int MosqueId { get; set; }
        public Mosque? Mosque { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? TeacherId { get; set; }
        public ApplicationUser? Teacher { get; set; }
        public string? Schedule { get; set; }

        public ICollection<Enrolment> Enrolments { get; set; } = new List<Enrolment>();
        public ICollection<AttendanceSession> Sessions { get; set; } = new List<AttendanceSession>();
    }

    public class Enrolment : BaseEntity
    {
        public int StudentId { get; set; }
        public Student? Student { get; set; }
        public int ClassId { get; set; }
        public MadrassahClass? Class { get; set; }
        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
        public EnrolmentStatus Status { get; set; } = EnrolmentStatus.Active;
    }

    public class AttendanceSession : BaseEntity
    {
        public int ClassId { get; set; }
        public MadrassahClass? Class { get; set; }
        public DateOnly Date { get; set; }
        public string? Notes { get; set; }

        public ICollection<AttendanceRecord> Records { get; set; } = new List<AttendanceRecord>();
    }

    public class AttendanceRecord : BaseEntity
    {
        public int SessionId { get; set; }
        public AttendanceSession? Session { get; set; }
        public int StudentId { get; set; }
        public Student? Student { get; set; }
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    }

    public class Fee : BaseEntity
    {
        public int StudentId { get; set; }
        public Student? Student { get; set; }
        public decimal Amount { get; set; }
        public DateOnly DueDate { get; set; }
        public DateTime? PaidAt { get; set; }
        public FeeStatus Status { get; set; } = FeeStatus.Unpaid;
    }

    public class ProgressNote : BaseEntity
    {
        public int StudentId { get; set; }
        public Student? Student { get; set; }
        public int ClassId { get; set; }
        public MadrassahClass? Class { get; set; }
        public string Note { get; set; } = string.Empty;
        public string? CreatedById { get; set; }
    }
}
