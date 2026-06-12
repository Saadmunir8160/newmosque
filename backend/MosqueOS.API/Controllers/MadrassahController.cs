using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/madrassah")]
    [ApiController]
    [Authorize]
    public class MadrassahController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public MadrassahController(ApplicationDbContext db) => _db = db;

        // ---- Students ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("students")]
        public async Task<IActionResult> GetStudents() =>
            Ok(await _db.Students.AsNoTracking().Include(s => s.Guardians).OrderBy(s => s.Name).ToListAsync());

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students")]
        public async Task<IActionResult> CreateStudent([FromBody] Student student)
        {
            student.Id = 0;
            _db.Students.Add(student);
            await _db.SaveChangesAsync();
            return Ok(student);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPut("students/{id:int}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] Student input)
        {
            var student = await _db.Students.FindAsync(id);
            if (student == null) return NotFound();

            student.Name = input.Name;
            student.DateOfBirth = input.DateOfBirth;
            student.Gender = input.Gender;
            student.UserId = input.UserId;
            student.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(student);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students/{studentId:int}/guardians")]
        public async Task<IActionResult> AddGuardian(int studentId, [FromBody] Guardian guardian)
        {
            guardian.Id = 0;
            guardian.StudentId = studentId;
            _db.Guardians.Add(guardian);
            await _db.SaveChangesAsync();
            return Ok(guardian);
        }

        // ---- Classes ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses() =>
            Ok(await _db.MadrassahClasses.AsNoTracking()
                .Include(c => c.Enrolments).ThenInclude(e => e.Student)
                .ToListAsync());

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("classes")]
        public async Task<IActionResult> CreateClass([FromBody] MadrassahClass cls)
        {
            cls.Id = 0;
            _db.MadrassahClasses.Add(cls);
            await _db.SaveChangesAsync();
            return Ok(cls);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("classes/{classId:int}/enrol/{studentId:int}")]
        public async Task<IActionResult> Enrol(int classId, int studentId)
        {
            if (await _db.Enrolments.AnyAsync(e => e.ClassId == classId && e.StudentId == studentId))
                return Conflict(new { message = "Student already enrolled." });

            var enrolment = new Enrolment { ClassId = classId, StudentId = studentId };
            _db.Enrolments.Add(enrolment);
            await _db.SaveChangesAsync();
            return Ok(enrolment);
        }

        // ---- Attendance ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("classes/{classId:int}/sessions")]
        public async Task<IActionResult> CreateSession(int classId, [FromBody] AttendanceSession session)
        {
            session.Id = 0;
            session.ClassId = classId;
            _db.AttendanceSessions.Add(session);
            await _db.SaveChangesAsync();
            return Ok(session);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("sessions/{sessionId:int}/attendance")]
        public async Task<IActionResult> RecordAttendance(int sessionId, [FromBody] List<AttendanceRecordDto> records)
        {
            var session = await _db.AttendanceSessions
                .Include(s => s.Records)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return NotFound();

            foreach (var dto in records)
            {
                var existing = session.Records.FirstOrDefault(r => r.StudentId == dto.StudentId);
                if (existing != null)
                {
                    existing.Status = dto.Status;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    session.Records.Add(new AttendanceRecord
                    {
                        SessionId = sessionId,
                        StudentId = dto.StudentId,
                        Status = dto.Status
                    });
                }
            }

            await _db.SaveChangesAsync();
            return Ok(session.Records);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("classes/{classId:int}/sessions")]
        public async Task<IActionResult> GetSessions(int classId) =>
            Ok(await _db.AttendanceSessions.AsNoTracking()
                .Include(s => s.Records)
                .Where(s => s.ClassId == classId)
                .OrderByDescending(s => s.Date)
                .ToListAsync());

        // ---- Fees ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students/{studentId:int}/fees")]
        public async Task<IActionResult> CreateFee(int studentId, [FromBody] Fee fee)
        {
            fee.Id = 0;
            fee.StudentId = studentId;
            _db.Fees.Add(fee);
            await _db.SaveChangesAsync();
            return Ok(fee);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("fees/{feeId:int}/mark-paid")]
        public async Task<IActionResult> MarkFeePaid(int feeId)
        {
            var fee = await _db.Fees.FindAsync(feeId);
            if (fee == null) return NotFound();

            fee.Status = FeeStatus.Paid;
            fee.PaidAt = DateTime.UtcNow;
            fee.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(fee);
        }

        // ---- Progress notes ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students/{studentId:int}/progress-notes")]
        public async Task<IActionResult> AddProgressNote(int studentId, [FromBody] ProgressNote note)
        {
            note.Id = 0;
            note.StudentId = studentId;
            note.CreatedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _db.ProgressNotes.Add(note);
            await _db.SaveChangesAsync();
            return Ok(note);
        }

        // ---- Parent portal ----

        /// <summary>Parents see attendance, fees, and progress for their own children only.</summary>
        [HttpGet("my-children")]
        public async Task<IActionResult> MyChildren()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var children = await _db.Guardians.AsNoTracking()
                .Where(g => g.UserId == userId)
                .Select(g => g.Student!)
                .ToListAsync();

            var result = new List<object>();
            foreach (var child in children)
            {
                var attendance = await _db.AttendanceRecords.AsNoTracking()
                    .Where(r => r.StudentId == child.Id)
                    .GroupBy(r => r.Status)
                    .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                var fees = await _db.Fees.AsNoTracking()
                    .Where(f => f.StudentId == child.Id)
                    .ToListAsync();

                var notes = await _db.ProgressNotes.AsNoTracking()
                    .Where(n => n.StudentId == child.Id)
                    .OrderByDescending(n => n.CreatedAt)
                    .ToListAsync();

                result.Add(new { student = child, attendance, fees, progressNotes = notes });
            }

            return Ok(result);
        }

        // ---- Dashboard ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var totalStudents = await _db.Students.CountAsync();
            var totalClasses = await _db.MadrassahClasses.CountAsync();
            var totalRecords = await _db.AttendanceRecords.CountAsync();
            var presentRecords = await _db.AttendanceRecords
                .CountAsync(r => r.Status == AttendanceStatus.Present);
            var unpaidFees = await _db.Fees.CountAsync(f => f.Status == FeeStatus.Unpaid);

            return Ok(new
            {
                totalStudents,
                totalClasses,
                attendanceRate = totalRecords == 0 ? 0 : Math.Round(100.0 * presentRecords / totalRecords, 1),
                unpaidFees
            });
        }
    }

    public class AttendanceRecordDto
    {
        public int StudentId { get; set; }
        public AttendanceStatus Status { get; set; }
    }
}
