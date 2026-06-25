using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.MosqueAdmin;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers;

[Route("api/v1/mosques/{mosqueId:int}/admin")]
[ApiController]
[Authorize(Roles = Roles.Admins)]
public class MosqueAdminController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly MosqueAccessService _mosqueAccess;

    private static readonly string[] ManagedUserRoles =
    {
        Roles.Teacher, Roles.Parent, Roles.Member, Roles.PrayerTimesEditor, Roles.ContentEditor, Roles.Muqaddam
    };

    public MosqueAdminController(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        MosqueAccessService mosqueAccess)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _mosqueAccess = mosqueAccess;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(int mosqueId)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .FirstOrDefaultAsync(m => m.Id == mosqueId);
        if (mosque == null) return NotFound();

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var thirtyDaysAgo = now.AddDays(-30);

        var mosqueUsers = await _userManager.Users.AsNoTracking()
            .Where(u => u.HomeMosqueId == mosqueId)
            .ToListAsync();

        var roleCounts = new Dictionary<string, int>();
        foreach (var u in mosqueUsers)
        {
            foreach (var role in await _userManager.GetRolesAsync(u))
                roleCounts[role] = roleCounts.GetValueOrDefault(role) + 1;
        }

        var classIds = await _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Where(c => c.MosqueId == mosqueId)
            .Select(c => c.Id)
            .ToListAsync();

        var studentIds = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
            .Where(e => classIds.Contains(e.ClassId) && e.Status == EnrolmentStatus.Active)
            .Select(e => e.StudentId)
            .Distinct()
            .CountAsync();

        var upcomingEvents = await _unitOfWork.Repository<Event>().QueryNoTracking()
            .CountAsync(e => e.MosqueId == mosqueId && e.Date >= today && e.Status == EventStatus.Scheduled);

        var activeCommunities = await _unitOfWork.Repository<Community>().QueryNoTracking()
            .CountAsync(c => c.MosqueId == mosqueId);

        var pendingParticipation = await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
            .Include(r => r.Opportunity)
            .CountAsync(r => r.Opportunity!.MosqueId == mosqueId && r.Status == RegistrationStatus.Registered);

        var activeAnnouncements = await _unitOfWork.Repository<Announcement>().QueryNoTracking()
            .CountAsync(a => a.MosqueId == mosqueId && a.Status == PublishStatus.Published);

        var prayerToday = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .Where(p => p.MosqueId == mosqueId && p.Date == today)
            .FirstOrDefaultAsync();

        var attendanceChart = await BuildAttendanceChartAsync(classIds, thirtyDaysAgo);
        var eventChart = await BuildEventParticipationChartAsync(mosqueId, thirtyDaysAgo);
        var studentChart = await BuildStudentGrowthChartAsync(classIds, thirtyDaysAgo);
        var feeChart = await BuildFeeCollectionChartAsync(classIds, thirtyDaysAgo);

        var activity = await BuildRecentActivityAsync(mosqueId, mosqueUsers);

        return Ok(new MosqueAdminDashboardResponse
        {
            MosqueId = mosqueId,
            MosqueName = mosque.Name,
            SyncedAt = now,
            Stats = new MosqueAdminStats
            {
                TotalMembers = roleCounts.GetValueOrDefault(Roles.Member),
                TotalStudents = studentIds,
                TotalTeachers = roleCounts.GetValueOrDefault(Roles.Teacher),
                UpcomingEvents = upcomingEvents,
                ActiveCommunities = activeCommunities,
                PendingParticipationRequests = pendingParticipation,
                ActiveAnnouncements = activeAnnouncements
            },
            Charts = new MosqueAdminCharts
            {
                MonthlyAttendance = attendanceChart,
                EventParticipation = eventChart,
                StudentGrowth = studentChart,
                FeeCollection = feeChart
            },
            RecentActivity = activity,
            TodayPrayer = prayerToday == null ? null : new MosqueAdminPrayerSummary
            {
                Fajr = prayerToday.FajrJamaat.ToString("HH:mm"),
                Dhuhr = prayerToday.DhuhrJamaat.ToString("HH:mm"),
                Asr = prayerToday.AsrJamaat.ToString("HH:mm"),
                Maghrib = prayerToday.MaghribJamaat.ToString("HH:mm"),
                Isha = prayerToday.IshaJamaat.ToString("HH:mm")
            }
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(int mosqueId, [FromQuery] string? category, [FromQuery] string? search, [FromQuery] bool? activeOnly)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var users = await _userManager.Users.AsNoTracking()
            .Where(u => u.HomeMosqueId == mosqueId)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            users = users.Where(u =>
                u.FullName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (u.Email != null && u.Email.Contains(term, StringComparison.OrdinalIgnoreCase))
                || (u.UserName != null && u.UserName.Contains(term, StringComparison.OrdinalIgnoreCase))
                || (u.PhoneNumber != null && u.PhoneNumber.Contains(term, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }

        var result = new List<MosqueAdminUserDto>();
        foreach (var user in users)
        {
            var roles = (await _userManager.GetRolesAsync(user)).ToList();
            if (!MatchesCategory(category, roles)) continue;

            var isActive = !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow;
            if (activeOnly == true && !isActive) continue;
            if (activeOnly == false && isActive) continue;

            result.Add(new MosqueAdminUserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Phone = user.PhoneNumber,
                Roles = roles,
                IsActive = !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow,
                CreatedAt = user.CreatedAt
            });
        }

        return Ok(result);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(int mosqueId, [FromBody] CreateMosqueUserRequest dto)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();
        if (dto.Role is Roles.SuperAdmin or Roles.MosqueOwner)
            return BadRequest(new ApiMessageResponse { Message = "Cannot assign this role." });
        if (!ManagedUserRoles.Contains(dto.Role) && dto.Role != Roles.MosqueAdmin)
            return BadRequest(new ApiMessageResponse { Message = "Invalid role for mosque user." });

        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            return Conflict(new ApiMessageResponse { Message = "Email already registered." });

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.Phone,
            HomeMosqueId = mosqueId,
            EmailConfirmed = true
        };

        var create = await _userManager.CreateAsync(user, dto.Password);
        if (!create.Succeeded)
            return BadRequest(new ApiMessageResponse { Message = string.Join("; ", create.Errors.Select(e => e.Description)) });

        await _userManager.AddToRoleAsync(user, dto.Role);
        if (dto.Role != Roles.Member && !await _userManager.IsInRoleAsync(user, Roles.Member))
            await _userManager.AddToRoleAsync(user, Roles.Member);

        return Ok(new MosqueAdminUserDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Phone = user.PhoneNumber,
            Roles = (await _userManager.GetRolesAsync(user)).ToList(),
            IsActive = true,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("users/{userId}")]
    public async Task<IActionResult> UpdateUser(int mosqueId, string userId, [FromBody] UpdateMosqueUserRequest dto)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == userId && u.HomeMosqueId == mosqueId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
        if (dto.Phone != null) user.PhoneNumber = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email;

        await _userManager.UpdateAsync(user);
        return Ok(await ToUserDtoAsync(user));
    }

    [HttpPatch("users/{userId}/active")]
    public async Task<IActionResult> SetUserActive(int mosqueId, string userId, [FromBody] SetUserActiveRequest dto)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == userId && u.HomeMosqueId == mosqueId);
        if (user == null) return NotFound();

        if (dto.Active)
            await _userManager.SetLockoutEndDateAsync(user, null);
        else
            await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));

        return Ok(await ToUserDtoAsync(user));
    }

    [HttpGet("participation/pending")]
    public async Task<IActionResult> GetPendingParticipation(int mosqueId)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var rows = await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
            .Include(r => r.Opportunity)
            .Include(r => r.User)
            .Where(r => r.Opportunity!.MosqueId == mosqueId && r.Status == RegistrationStatus.Registered)
            .OrderByDescending(r => r.RegisteredAt)
            .Select(r => new
            {
                r.Id,
                r.OpportunityId,
                OpportunityTitle = r.Opportunity!.Title,
                r.UserId,
                UserName = r.User!.FullName,
                r.RegisteredAt,
                r.Status
            })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpPatch("participation/registrations/{registrationId:int}")]
    public async Task<IActionResult> UpdateParticipationStatus(
        int mosqueId, int registrationId, [FromBody] ParticipationStatusRequest dto)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var registration = await _unitOfWork.Repository<ParticipationRegistration>().Query()
            .Include(r => r.Opportunity)
            .FirstOrDefaultAsync(r => r.Id == registrationId && r.Opportunity!.MosqueId == mosqueId);
        if (registration == null) return NotFound();

        registration.Status = dto.Status.ToLowerInvariant() switch
        {
            "approved" or "confirmed" => RegistrationStatus.Confirmed,
            "rejected" or "cancelled" => RegistrationStatus.Cancelled,
            "pending" or "registered" => RegistrationStatus.Registered,
            _ => registration.Status
        };

        await _unitOfWork.SaveChangesAsync();
        return Ok(registration);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReport(
        int mosqueId,
        [FromQuery] string type = "attendance",
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null)
    {
        if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId)) return Forbid();

        var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var start = from ?? end.AddDays(-30);

        return type.ToLowerInvariant() switch
        {
            "events" => Ok(await BuildEventReportAsync(mosqueId, start, end)),
            "students" => Ok(await BuildStudentReportAsync(mosqueId)),
            "fees" => Ok(await BuildFeeReportAsync(mosqueId, start, end)),
            "communities" => Ok(await BuildCommunityReportAsync(mosqueId)),
            _ => Ok(await BuildAttendanceReportAsync(mosqueId, start, end))
        };
    }

    private static bool MatchesCategory(string? category, IReadOnlyList<string> roles)
    {
        if (string.IsNullOrWhiteSpace(category) || category.Equals("all", StringComparison.OrdinalIgnoreCase))
            return true;

        return category.ToLowerInvariant() switch
        {
            "teachers" => roles.Contains(Roles.Teacher),
            "parents" => roles.Contains(Roles.Parent),
            "members" => roles.Contains(Roles.Member),
            _ => true
        };
    }

    private async Task<MosqueAdminUserDto> ToUserDtoAsync(ApplicationUser user) => new()
    {
        Id = user.Id,
        UserName = user.UserName ?? string.Empty,
        Email = user.Email ?? string.Empty,
        FullName = user.FullName,
        Phone = user.PhoneNumber,
        Roles = (await _userManager.GetRolesAsync(user)).ToList(),
        IsActive = !user.LockoutEnd.HasValue || user.LockoutEnd <= DateTimeOffset.UtcNow,
        CreatedAt = user.CreatedAt
    };

    private async Task<IReadOnlyList<ChartPoint>> BuildAttendanceChartAsync(List<int> classIds, DateTime since)
    {
        if (classIds.Count == 0) return Array.Empty<ChartPoint>();

        var sessions = await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
            .Where(s => classIds.Contains(s.ClassId) && s.CreatedAt >= since)
            .Select(s => new { s.Id, s.Date })
            .ToListAsync();

        var sessionIds = sessions.Select(s => s.Id).ToList();
        var records = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
            .Where(r => sessionIds.Contains(r.SessionId))
            .ToListAsync();

        return sessions
            .GroupBy(s => s.Date.ToString("MMM dd"))
            .OrderBy(g => g.First().Date)
            .Select(g =>
            {
                var ids = g.Select(x => x.Id).ToHashSet();
                var dayRecords = records.Where(r => ids.Contains(r.SessionId)).ToList();
                var rate = dayRecords.Count == 0 ? 0 :
                    Math.Round(100m * dayRecords.Count(r => r.Status == AttendanceStatus.Present) / dayRecords.Count, 1);
                return new ChartPoint { Label = g.Key, Value = rate };
            })
            .ToList();
    }

    private async Task<IReadOnlyList<ChartPoint>> BuildEventParticipationChartAsync(int mosqueId, DateTime since)
    {
        var events = await _unitOfWork.Repository<Event>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && e.CreatedAt >= since)
            .OrderBy(e => e.Date)
            .Take(8)
            .ToListAsync();

        return events.Select(e => new ChartPoint
        {
            Label = e.Title.Length > 12 ? e.Title[..12] + "…" : e.Title,
            Value = 1
        }).ToList();
    }

    private async Task<IReadOnlyList<ChartPoint>> BuildStudentGrowthChartAsync(List<int> classIds, DateTime since)
    {
        if (classIds.Count == 0) return Array.Empty<ChartPoint>();

        var enrolments = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
            .Where(e => classIds.Contains(e.ClassId) && e.EnrolledAt >= since)
            .ToListAsync();

        return Enumerable.Range(0, 6).Select(i =>
        {
            var weekStart = since.AddDays(i * 5);
            var weekEnd = weekStart.AddDays(5);
            var count = enrolments.Count(e => e.EnrolledAt >= weekStart && e.EnrolledAt < weekEnd);
            return new ChartPoint { Label = $"W{i + 1}", Value = count };
        }).ToList();
    }

    private async Task<IReadOnlyList<ChartPoint>> BuildFeeCollectionChartAsync(List<int> classIds, DateTime since)
    {
        if (classIds.Count == 0) return Array.Empty<ChartPoint>();

        var studentIds = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
            .Where(e => classIds.Contains(e.ClassId))
            .Select(e => e.StudentId)
            .Distinct()
            .ToListAsync();

        var fees = await _unitOfWork.Repository<Fee>().QueryNoTracking()
            .Where(f => studentIds.Contains(f.StudentId) && f.DueDate >= DateOnly.FromDateTime(since))
            .ToListAsync();

        return fees
            .GroupBy(f => f.DueDate.ToString("MMM"))
            .Select(g => new ChartPoint
            {
                Label = g.Key,
                Value = g.Where(f => f.Status == FeeStatus.Paid).Sum(f => f.Amount)
            })
            .ToList();
    }

    private async Task<IReadOnlyList<MosqueAdminActivityItem>> BuildRecentActivityAsync(
        int mosqueId, List<ApplicationUser> mosqueUsers)
    {
        var items = new List<MosqueAdminActivityItem>();

        var announcements = await _unitOfWork.Repository<Announcement>().QueryNoTracking()
            .Where(a => a.MosqueId == mosqueId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(3)
            .ToListAsync();
        items.AddRange(announcements.Select(a => new MosqueAdminActivityItem
        {
            Type = "announcement",
            Title = "Announcement published",
            Detail = a.Title,
            At = a.CreatedAt
        }));

        var events = await _unitOfWork.Repository<Event>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(3)
            .ToListAsync();
        items.AddRange(events.Select(e => new MosqueAdminActivityItem
        {
            Type = "event",
            Title = "Event created",
            Detail = e.Title,
            At = e.CreatedAt
        }));

        items.AddRange(mosqueUsers
            .OrderByDescending(u => u.CreatedAt)
            .Take(3)
            .Select(u => new MosqueAdminActivityItem
            {
                Type = "user",
                Title = "New user registered",
                Detail = u.FullName,
                At = u.CreatedAt
            }));

        var prayerUpdate = await _unitOfWork.Repository<PrayerTimesDaily>().QueryNoTracking()
            .Where(p => p.MosqueId == mosqueId)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();
        if (prayerUpdate != null)
        {
            items.Add(new MosqueAdminActivityItem
            {
                Type = "prayer",
                Title = "Prayer time updated",
                Detail = prayerUpdate.Date.ToString("dd MMM yyyy"),
                At = prayerUpdate.UpdatedAt ?? prayerUpdate.CreatedAt
            });
        }

        return items.OrderByDescending(i => i.At).Take(8).ToList();
    }

    private async Task<MosqueAdminReportResponse> BuildAttendanceReportAsync(int mosqueId, DateOnly start, DateOnly end)
    {
        var classIds = await _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Where(c => c.MosqueId == mosqueId)
            .Select(c => c.Id)
            .ToListAsync();

        var sessions = await _unitOfWork.Repository<AttendanceSession>().QueryNoTracking()
            .Include(s => s.Class)
            .Where(s => classIds.Contains(s.ClassId) && s.Date >= start && s.Date <= end)
            .ToListAsync();

        var rows = new List<MosqueAdminReportRow>();
        foreach (var session in sessions)
        {
            var records = await _unitOfWork.Repository<AttendanceRecord>().QueryNoTracking()
                .Where(r => r.SessionId == session.Id)
                .ToListAsync();
            var present = records.Count(r => r.Status == AttendanceStatus.Present);
            rows.Add(new MosqueAdminReportRow
            {
                Label = session.Class?.Name ?? "Class",
                Category = session.Date.ToString("yyyy-MM-dd"),
                Value = present,
                Detail = $"{present}/{records.Count} present",
                Date = session.Date.ToDateTime(TimeOnly.MinValue)
            });
        }

        return new MosqueAdminReportResponse
        {
            ReportType = "attendance",
            GeneratedAt = DateTime.UtcNow,
            Rows = rows,
            Summary = new MosqueAdminReportSummary { TotalRows = rows.Count, TotalValue = rows.Sum(r => r.Value) }
        };
    }

    private async Task<MosqueAdminReportResponse> BuildEventReportAsync(int mosqueId, DateOnly start, DateOnly end)
    {
        var events = await _unitOfWork.Repository<Event>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && e.Date >= start && e.Date <= end)
            .OrderBy(e => e.Date)
            .ToListAsync();

        var rows = events.Select(e => new MosqueAdminReportRow
        {
            Label = e.Title,
            Category = e.EventType.ToString(),
            Value = 1,
            Detail = e.Location,
            Date = e.Date.ToDateTime(TimeOnly.MinValue)
        }).ToList();

        return new MosqueAdminReportResponse
        {
            ReportType = "events",
            GeneratedAt = DateTime.UtcNow,
            Rows = rows,
            Summary = new MosqueAdminReportSummary { TotalRows = rows.Count, TotalValue = rows.Count }
        };
    }

    private async Task<MosqueAdminReportResponse> BuildStudentReportAsync(int mosqueId)
    {
        var classes = await _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Where(c => c.MosqueId == mosqueId)
            .ToListAsync();

        var rows = new List<MosqueAdminReportRow>();
        foreach (var cls in classes)
        {
            var count = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
                .CountAsync(e => e.ClassId == cls.Id && e.Status == EnrolmentStatus.Active);
            rows.Add(new MosqueAdminReportRow
            {
                Label = cls.Name,
                Category = "Class",
                Value = count,
                Detail = cls.Schedule
            });
        }

        return new MosqueAdminReportResponse
        {
            ReportType = "students",
            GeneratedAt = DateTime.UtcNow,
            Rows = rows,
            Summary = new MosqueAdminReportSummary { TotalRows = rows.Count, TotalValue = rows.Sum(r => r.Value) }
        };
    }

    private async Task<MosqueAdminReportResponse> BuildFeeReportAsync(int mosqueId, DateOnly start, DateOnly end)
    {
        var classIds = await _unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Where(c => c.MosqueId == mosqueId)
            .Select(c => c.Id)
            .ToListAsync();

        var studentIds = await _unitOfWork.Repository<Enrolment>().QueryNoTracking()
            .Where(e => classIds.Contains(e.ClassId))
            .Select(e => e.StudentId)
            .Distinct()
            .ToListAsync();

        var fees = await _unitOfWork.Repository<Fee>().QueryNoTracking()
            .Include(f => f.Student)
            .Where(f => studentIds.Contains(f.StudentId) && f.DueDate >= start && f.DueDate <= end)
            .ToListAsync();

        var rows = fees.Select(f => new MosqueAdminReportRow
        {
            Label = f.Student?.Name ?? "Student",
            Category = f.Status.ToString(),
            Value = f.Amount,
            Detail = f.DueDate.ToString("yyyy-MM-dd"),
            Date = f.DueDate.ToDateTime(TimeOnly.MinValue)
        }).ToList();

        return new MosqueAdminReportResponse
        {
            ReportType = "fees",
            GeneratedAt = DateTime.UtcNow,
            Rows = rows,
            Summary = new MosqueAdminReportSummary
            {
                TotalRows = rows.Count,
                TotalValue = rows.Where(r => r.Category == FeeStatus.Paid.ToString()).Sum(r => r.Value)
            }
        };
    }

    private async Task<MosqueAdminReportResponse> BuildCommunityReportAsync(int mosqueId)
    {
        var communities = await _unitOfWork.Repository<Community>().QueryNoTracking()
            .Include(c => c.Members)
            .Where(c => c.MosqueId == mosqueId)
            .ToListAsync();

        var rows = communities.Select(c => new MosqueAdminReportRow
        {
            Label = c.Name,
            Category = c.Type.ToString(),
            Value = c.Members.Count,
            Detail = c.IsPublic ? "Public" : "Private"
        }).ToList();

        return new MosqueAdminReportResponse
        {
            ReportType = "communities",
            GeneratedAt = DateTime.UtcNow,
            Rows = rows,
            Summary = new MosqueAdminReportSummary { TotalRows = rows.Count, TotalValue = rows.Sum(r => r.Value) }
        };
    }
}
