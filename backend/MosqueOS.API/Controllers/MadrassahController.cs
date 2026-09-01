using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Madrassah;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/madrassah")]
    [ApiController]
    [Authorize]
    public class MadrassahController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public MadrassahController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        // ---- Students ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("students")]
        public async Task<IActionResult> GetStudents([FromQuery] int? mosqueId, [FromQuery] string? search = null)
        {
            IQueryable<Student> query = _unitOfWork.Repository<Student>().QueryNoTracking().Include(s => s.Guardians);
            if (mosqueId.HasValue)
            {
                var classIds = await _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
                    .Where(c => c.MosqueId == mosqueId.Value).Select(c => c.Id).ToListAsync();
                var studentIds = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
                    .Where(e => classIds.Contains(e.ClassId))
                    .Select(e => e.StudentId).Distinct().ToListAsync();
                query = query.Where(s => studentIds.Contains(s.Id));
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(s => s.Name.Contains(term));
            }
            return Ok(await query.OrderBy(s => s.Name).ToListAsync());
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students")]
        public async Task<IActionResult> CreateStudent([FromBody] Student student)
        {
            student.Id = 0;
            _unitOfWork.Repository<Student>().Add(student);
            await _unitOfWork.SaveChangesAsync();
            return Ok(student);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPut("students/{id:int}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] Student input)
        {
            var student = await _unitOfWork.Repository<Student>().FindAsync(id);
            if (student == null) return NotFound();

            student.Name = input.Name;
            student.DateOfBirth = input.DateOfBirth;
            student.Gender = input.Gender;
            student.UserId = input.UserId;
            student.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(student);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("students/{studentId:int}/guardians")]
        public async Task<IActionResult> AddGuardian(int studentId, [FromBody] Guardian guardian)
        {
            guardian.Id = 0;
            guardian.StudentId = studentId;
            _unitOfWork.Repository<Guardian>().Add(guardian);
            await _unitOfWork.SaveChangesAsync();
            return Ok(guardian);
        }

        // ---- Classes ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses([FromQuery] int? mosqueId, [FromQuery] string? search = null)
        {
            var query = _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
                .Include(c => c.Enrolments).ThenInclude(e => e.Student)
                .AsQueryable();
            if (mosqueId.HasValue) query = query.Where(c => c.MosqueId == mosqueId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(c => c.Name.Contains(term));
            }
            return Ok(await query.ToListAsync());
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("classes")]
        public async Task<IActionResult> CreateClass([FromBody] MadrassahClass cls)
        {
            cls.Id = 0;
            _unitOfWork.Repository<MadrassahClass>().Add(cls);
            await _unitOfWork.SaveChangesAsync();
            return Ok(cls);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("classes/{classId:int}/enrol/{studentId:int}")]
        public async Task<IActionResult> Enrol(int classId, int studentId)
        {
            if (await _unitOfWork.Repository<Enrolment>().Query().AnyAsync(e => e.ClassId == classId && e.StudentId == studentId))
                return Conflict(new { message = "Student already enrolled." });

            var enrolment = new Enrolment { ClassId = classId, StudentId = studentId };
            _unitOfWork.Repository<Enrolment>().Add(enrolment);
            await _unitOfWork.SaveChangesAsync();
            return Ok(enrolment);
        }

        // ---- Attendance ----

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("classes/{classId:int}/sessions")]
        public async Task<IActionResult> CreateSession(int classId, [FromBody] AttendanceSession session)
        {
            session.Id = 0;
            session.ClassId = classId;
            _unitOfWork.Repository<AttendanceSession>().Add(session);
            await _unitOfWork.SaveChangesAsync();
            return Ok(session);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpPost("sessions/{sessionId:int}/attendance")]
        public async Task<IActionResult> RecordAttendance(int sessionId, [FromBody] List<AttendanceRecordRequest> records)
        {
            var session = await _unitOfWork.Repository<AttendanceSession>().Query()
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

            await _unitOfWork.SaveChangesAsync();
            return Ok(session.Records);
        }

        [Authorize(Roles = Roles.MadrassahManagers)]
        [HttpGet("classes/{classId:int}/sessions")]
        public async Task<IActionResult> GetSessions(int classId) =>
            Ok(await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
                .Include(s => s.Records)
                .Where(s => s.ClassId == classId)
                .OrderByDescending(s => s.Date)
                .ToListAsync());

        // ---- Fees ----

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("students/{studentId:int}/fees")]
        public async Task<IActionResult> CreateFee(int studentId, [FromBody] Fee fee)
        {
            fee.Id = 0;
            fee.StudentId = studentId;
            _unitOfWork.Repository<Fee>().Add(fee);
            await _unitOfWork.SaveChangesAsync();
            return Ok(fee);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("fees/{feeId:int}/mark-paid")]
        public async Task<IActionResult> MarkFeePaid(int feeId)
        {
            var fee = await _unitOfWork.Repository<Fee>().FindAsync(feeId);
            if (fee == null) return NotFound();

            fee.Status = FeeStatus.Paid;
            fee.PaidAt = DateTime.UtcNow;
            fee.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
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
            _unitOfWork.Repository<ProgressNote>().Add(note);
            await _unitOfWork.SaveChangesAsync();
            return Ok(note);
        }

        // ---- Parent portal ----

        /// <summary>Parents see attendance, fees, and progress for their own children only.</summary>
        [HttpGet("my-children")]
        public async Task<IActionResult> MyChildren()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var children = await _unitOfWork.Repository<Guardian>().QueryNoTracking()
                .Where(g => g.UserId == userId)
                .Select(g => g.Student!)
                .ToListAsync();

            var result = new List<object>();
            foreach (var child in children)
            {
                var attendance = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
                    .Where(r => r.StudentId == child.Id)
                    .GroupBy(r => r.Status)
                    .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                var fees = await _unitOfWork.Repository<Fee>().QueryNoTracking()
                    .Where(f => f.StudentId == child.Id)
                    .ToListAsync();

                var notes = await _unitOfWork.Repository<ProgressNote>().QueryNoTracking()
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
        public async Task<IActionResult> Dashboard([FromQuery] int? mosqueId)
        {
            var classQuery = _unitOfWork.Repository<MadrassahClass>().Query();
            if (mosqueId.HasValue) classQuery = classQuery.Where(c => c.MosqueId == mosqueId);

            var classIds = await classQuery.Select(c => c.Id).ToListAsync();
            var totalClasses = classIds.Count;

            var studentIds = await _unitOfWork.Repository<Enrolment>().Query()
                .Where(e => classIds.Contains(e.ClassId) && e.Status == EnrolmentStatus.Active)
                .Select(e => e.StudentId).Distinct().ToListAsync();
            var totalStudents = studentIds.Count;

            var sessionIds = await _unitOfWork.Repository<AttendanceSession>().Query()
                .Where(s => classIds.Contains(s.ClassId))
                .Select(s => s.Id).ToListAsync();

            var totalRecords = await _unitOfWork.Repository<AttendanceRecord>().Query()
                .CountAsync(r => sessionIds.Contains(r.SessionId));
            var presentRecords = await _unitOfWork.Repository<AttendanceRecord>().Query()
                .CountAsync(r => sessionIds.Contains(r.SessionId) && r.Status == AttendanceStatus.Present);

            var unpaidFees = await _unitOfWork.Repository<Fee>().Query()
                .CountAsync(f => studentIds.Contains(f.StudentId) && f.Status == FeeStatus.Unpaid);

            return Ok(new
            {
                totalStudents,
                totalClasses,
                attendanceRate = totalRecords == 0 ? 0 : Math.Round(100.0 * presentRecords / totalRecords, 1),
                unpaidFees
            });
        }
    }
}
