using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Madrassah;
using MosqueOS.API.Models.Teacher;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/teacher")]
    [ApiController]
    [Authorize(Roles = Roles.Teacher + "," + Roles.MosqueAdmin + "," + Roles.MosqueOwner + "," + Roles.SuperAdmin)]
    public class TeacherController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public TeacherController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // ---- Dashboard ----

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var classes = await TeacherAccessHelper.MyClassesQuery(_unitOfWork, User).ToListAsync();
            var classIds = classes.Select(c => c.Id).ToList();

            var studentIds = classes
                .SelectMany(c => c.Enrolments.Where(e => e.Status == EnrolmentStatus.Active))
                .Select(e => e.StudentId).Distinct().ToList();

            var sessionIds = await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
                .Where(s => classIds.Contains(s.ClassId))
                .Select(s => s.Id).ToListAsync();

            var totalRecords = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
                .CountAsync(r => sessionIds.Contains(r.SessionId));
            var presentRecords = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
                .CountAsync(r => sessionIds.Contains(r.SessionId) && r.Status == AttendanceStatus.Present);

            var assignmentIds = await _unitOfWork.Repository<ClassAssignment>().QueryNoTracking()
                .Where(a => classIds.Contains(a.ClassId))
                .Select(a => a.Id).ToListAsync();
            var pendingGrades = await _unitOfWork.Repository<AssignmentGrade>().QueryNoTracking()
                .CountAsync(g => assignmentIds.Contains(g.AssignmentId) && g.Status != AssignmentGradeStatus.Graded);

            var recentActivity = new List<TeacherActivityItem>();

            var recentSessions = await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
                .Include(s => s.Class)
                .Where(s => classIds.Contains(s.ClassId))
                .OrderByDescending(s => s.Date)
                .Take(3)
                .ToListAsync();
            recentActivity.AddRange(recentSessions.Select(s => new TeacherActivityItem
            {
                Type = "Attendance",
                Title = $"Session recorded — {s.Class?.Name}",
                Detail = s.Date.ToString("yyyy-MM-dd"),
                At = s.CreatedAt
            }));

            var recentProgress = await _unitOfWork.Repository<StudentProgressRecord>().QueryNoTracking()
                .Include(p => p.Student)
                .Where(p => classIds.Contains(p.ClassId))
                .OrderByDescending(p => p.CreatedAt)
                .Take(3)
                .ToListAsync();
            recentActivity.AddRange(recentProgress.Select(p => new TeacherActivityItem
            {
                Type = "Progress",
                Title = $"{p.ProgressType}: {p.Title}",
                Detail = p.Student?.Name,
                At = p.CreatedAt
            }));

            return Ok(new TeacherDashboardResponse
            {
                TotalClasses = classes.Count,
                TotalStudents = studentIds.Count,
                AttendanceRate = totalRecords == 0 ? 0 : Math.Round(100.0 * presentRecords / totalRecords, 1),
                PendingGrades = pendingGrades,
                RecentActivity = recentActivity.OrderByDescending(a => a.At).Take(5).ToList()
            });
        }

        // ---- Classes ----

        [HttpGet("classes")]
        public async Task<IActionResult> GetMyClasses([FromQuery] string? search = null)
        {
            var query = TeacherAccessHelper.MyClassesQuery(_unitOfWork, User);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(c => c.Name.Contains(term));
            }
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        [HttpGet("classes/{classId:int}")]
        public async Task<IActionResult> GetClass(int classId)
        {
            var cls = await TeacherAccessHelper.GetClassIfAllowedAsync(_unitOfWork, User, classId);
            return cls == null ? Forbid() : Ok(cls);
        }

        [HttpGet("classes/{classId:int}/students")]
        public async Task<IActionResult> GetStudents(int classId, [FromQuery] string? search = null)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, classId) is IActionResult denied)
                return denied;

            var query = _unitOfWork.Repository<Enrolment>().QueryNoTracking()
                .Include(e => e.Student)
                .Where(e => e.ClassId == classId && e.Status == EnrolmentStatus.Active);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e => e.Student!.Name.Contains(term));
            }

            var students = await query.Select(e => e.Student!).OrderBy(s => s.Name).ToListAsync();
            return Ok(students);
        }

        // ---- Attendance ----

        [HttpGet("classes/{classId:int}/sessions")]
        public async Task<IActionResult> GetSessions(int classId) =>
            await GetSessionsInternal(classId);

        [HttpPost("classes/{classId:int}/sessions")]
        public async Task<IActionResult> CreateSession(int classId, [FromBody] AttendanceSession session)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, classId) is IActionResult denied)
                return denied;

            session.Id = 0;
            session.ClassId = classId;
            _unitOfWork.Repository<AttendanceSession>().Add(session);
            await _unitOfWork.SaveChangesAsync();
            return Ok(session);
        }

        [HttpPost("sessions/{sessionId:int}/attendance")]
        public async Task<IActionResult> RecordAttendance(int sessionId, [FromBody] List<AttendanceRecordRequest> records)
        {
            var session = await _unitOfWork.Repository<AttendanceSession>().Query()
                .Include(s => s.Records)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return NotFound();
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, session.ClassId) is IActionResult denied)
                return denied;

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

        private async Task<IActionResult> GetSessionsInternal(int classId)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, classId) is IActionResult denied)
                return denied;

            return Ok(await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
                .Include(s => s.Records)
                .Where(s => s.ClassId == classId)
                .OrderByDescending(s => s.Date)
                .ToListAsync());
        }

        // ---- Student Progress ----

        [HttpGet("students/{studentId:int}/progress")]
        public async Task<IActionResult> GetProgress(int studentId, [FromQuery] int classId, [FromQuery] StudentProgressType? type = null)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, classId) is IActionResult denied)
                return denied;

            var enrolled = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
                .AnyAsync(e => e.ClassId == classId && e.StudentId == studentId);
            if (!enrolled) return Forbid();

            var query = _unitOfWork.Repository<StudentProgressRecord>().QueryNoTracking()
                .Where(p => p.StudentId == studentId && p.ClassId == classId);
            if (type.HasValue) query = query.Where(p => p.ProgressType == type.Value);

            var records = await query.OrderByDescending(p => p.RecordDate ?? DateOnly.FromDateTime(p.CreatedAt)).ToListAsync();

            var notes = await _unitOfWork.Repository<ProgressNote>().QueryNoTracking()
                .Where(n => n.StudentId == studentId && n.ClassId == classId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(new { records, notes });
        }

        [HttpPost("students/{studentId:int}/progress")]
        public async Task<IActionResult> AddProgress(int studentId, [FromBody] CreateProgressRequest request)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, request.ClassId) is IActionResult denied)
                return denied;

            var enrolled = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
                .AnyAsync(e => e.ClassId == request.ClassId && e.StudentId == studentId);
            if (!enrolled) return Forbid();

            var record = new StudentProgressRecord
            {
                StudentId = studentId,
                ClassId = request.ClassId,
                ProgressType = request.ProgressType,
                Title = request.Title,
                Detail = request.Detail,
                SurahOrTopic = request.SurahOrTopic,
                Score = request.Score,
                RecordDate = request.RecordDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                CreatedById = UserId
            };
            _unitOfWork.Repository<StudentProgressRecord>().Add(record);

            if (request.ProgressType == StudentProgressType.TeacherNote && !string.IsNullOrWhiteSpace(request.Detail))
            {
                _unitOfWork.Repository<ProgressNote>().Add(new ProgressNote
                {
                    StudentId = studentId,
                    ClassId = request.ClassId,
                    Note = request.Detail,
                    CreatedById = UserId
                });
            }

            await _unitOfWork.SaveChangesAsync();
            return Ok(record);
        }

        // ---- Assignments ----

        [HttpGet("classes/{classId:int}/assignments")]
        public async Task<IActionResult> GetAssignments(int classId, [FromQuery] string? search = null)
        {
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, classId) is IActionResult denied)
                return denied;

            var query = _unitOfWork.Repository<ClassAssignment>().QueryNoTracking()
                .Include(a => a.Grades).ThenInclude(g => g.Student)
                .Where(a => a.ClassId == classId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(a => a.Title.Contains(term));
            }
            return Ok(await query.OrderByDescending(a => a.DueDate).ToListAsync());
        }

        [HttpPost("classes/{classId:int}/assignments")]
        public async Task<IActionResult> CreateAssignment(int classId, [FromBody] CreateAssignmentRequest request)
        {
            var cls = await TeacherAccessHelper.GetClassIfAllowedAsync(_unitOfWork, User, classId);
            if (cls == null) return Forbid();

            var assignment = new ClassAssignment
            {
                ClassId = classId,
                Title = request.Title,
                Description = request.Description,
                DueDate = request.DueDate,
                ResourceUrl = request.ResourceUrl,
                ResourceFileName = request.ResourceFileName,
                CreatedById = UserId
            };
            _unitOfWork.Repository<ClassAssignment>().Add(assignment);
            await _unitOfWork.SaveChangesAsync();

            foreach (var enrolment in cls.Enrolments.Where(e => e.Status == EnrolmentStatus.Active))
            {
                _unitOfWork.Repository<AssignmentGrade>().Add(new AssignmentGrade
                {
                    AssignmentId = assignment.Id,
                    StudentId = enrolment.StudentId,
                    Status = AssignmentGradeStatus.Pending
                });
            }
            await _unitOfWork.SaveChangesAsync();

            return Ok(assignment);
        }

        [HttpPut("assignments/{assignmentId:int}/grades/{studentId:int}")]
        public async Task<IActionResult> GradeAssignment(int assignmentId, int studentId, [FromBody] GradeAssignmentRequest request)
        {
            var assignment = await _unitOfWork.Repository<ClassAssignment>().QueryNoTracking()
                .FirstOrDefaultAsync(a => a.Id == assignmentId);
            if (assignment == null) return NotFound();
            if (await TeacherAccessHelper.RequireClassAccessAsync(_unitOfWork, User, assignment.ClassId) is IActionResult denied)
                return denied;

            var grade = await _unitOfWork.Repository<AssignmentGrade>().Query()
                .FirstOrDefaultAsync(g => g.AssignmentId == assignmentId && g.StudentId == studentId);
            if (grade == null) return NotFound();

            grade.Grade = request.Grade;
            grade.Feedback = request.Feedback;
            grade.Status = request.Status;
            grade.GradedById = UserId;
            grade.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(grade);
        }

        // ---- Reports ----

        [HttpGet("reports")]
        public async Task<IActionResult> Reports([FromQuery] int? classId = null)
        {
            var classes = await TeacherAccessHelper.MyClassesQuery(_unitOfWork, User).ToListAsync();
            if (classId.HasValue)
                classes = classes.Where(c => c.Id == classId.Value).ToList();

            var rows = new List<ClassReportRow>();
            foreach (var cls in classes)
            {
                var sessionIds = await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
                    .Where(s => s.ClassId == cls.Id)
                    .Select(s => s.Id).ToListAsync();

                var records = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
                    .Where(r => sessionIds.Contains(r.SessionId))
                    .ToListAsync();

                var present = records.Count(r => r.Status == AttendanceStatus.Present);
                var absent = records.Count(r => r.Status == AttendanceStatus.Absent);
                var late = records.Count(r => r.Status == AttendanceStatus.Late);
                var total = records.Count;
                var activeStudents = cls.Enrolments.Count(e => e.Status == EnrolmentStatus.Active);

                rows.Add(new ClassReportRow
                {
                    ClassId = cls.Id,
                    ClassName = cls.Name,
                    TotalStudents = activeStudents,
                    Present = present,
                    Absent = absent,
                    Late = late,
                    AttendanceRate = total == 0 ? 0 : Math.Round(100.0 * present / total, 1)
                });
            }

            return Ok(rows);
        }
    }
}
