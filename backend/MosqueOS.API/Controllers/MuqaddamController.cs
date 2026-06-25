using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Muqaddam;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/muqaddam")]
    [ApiController]
    [Authorize(Roles = Roles.MuridSummaryViewers)]
    public class MuqaddamController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;

        public MuqaddamController(IUnitOfWork unitOfWork, UserManager<ApplicationUser> userManager)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // ---- Dashboard ----

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard([FromQuery] int? mosqueId)
        {
            var communityIds = await MuqaddamAccessHelper.GetAssignedCommunityIdsAsync(_unitOfWork, User, mosqueId);
            var muridUserIds = await GetMuridUserIdsAsync(communityIds);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var upcoming = await _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                .CountAsync(g => communityIds.Contains(g.CommunityId) && g.Date >= today);

            var pendingFollowUps = await _unitOfWork.Repository<GuidanceNote>().QueryNoTracking()
                .CountAsync(n => communityIds.Contains(n.CommunityId) && n.Type == GuidanceNoteType.FollowUp && !n.IsCompleted);

            var gatheringIds = await _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                .Where(g => communityIds.Contains(g.CommunityId))
                .Select(g => g.Id).ToListAsync();
            var totalAttendance = await _unitOfWork.Repository<GatheringAttendance>().QueryNoTracking()
                .CountAsync(a => gatheringIds.Contains(a.GatheringId));
            var presentCount = await _unitOfWork.Repository<GatheringAttendance>().QueryNoTracking()
                .CountAsync(a => gatheringIds.Contains(a.GatheringId) && a.Status == AttendanceStatus.Present);

            var activity = new List<MuqaddamActivityItem>();
            var recentNotes = await _unitOfWork.Repository<GuidanceNote>().QueryNoTracking()
                .Where(n => communityIds.Contains(n.CommunityId))
                .OrderByDescending(n => n.CreatedAt).Take(3).ToListAsync();
            activity.AddRange(recentNotes.Select(n => new MuqaddamActivityItem
            {
                Type = "Guidance",
                Title = n.Type.ToString(),
                Detail = n.Content.Length > 60 ? n.Content[..60] + "…" : n.Content,
                At = n.CreatedAt
            }));

            return Ok(new MuqaddamDashboardResponse
            {
                AssignedCommunities = communityIds.Count,
                TotalMurids = muridUserIds.Count,
                UpcomingGatherings = upcoming,
                PendingFollowUps = pendingFollowUps,
                ParticipationRate = totalAttendance == 0 ? 0 : Math.Round(100.0 * presentCount / totalAttendance, 1),
                RecentActivity = activity.OrderByDescending(a => a.At).Take(5).ToList()
            });
        }

        // ---- Murids ----

        [HttpGet("murids")]
        public async Task<IActionResult> GetMuridSummaries([FromQuery] int? mosqueId, [FromQuery] string? search = null)
        {
            var communityIds = await MuqaddamAccessHelper.GetAssignedCommunityIdsAsync(_unitOfWork, User, mosqueId);
            if (!communityIds.Any()) return Ok(Array.Empty<object>());

            var members = await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
                .Include(m => m.User)
                .Include(m => m.Community)
                .Where(m => communityIds.Contains(m.CommunityId) && m.Role == CommunityRole.Member)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                members = members.Where(m =>
                    (m.User?.FullName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (m.User?.Email?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
            }

            var userIds = members.Select(m => m.UserId).Distinct().ToList();
            var gatheringIds = await _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                .Where(g => communityIds.Contains(g.CommunityId))
                .Select(g => g.Id).ToListAsync();

            var attendance = await _unitOfWork.Repository<GatheringAttendance>().QueryNoTracking()
                .Where(a => gatheringIds.Contains(a.GatheringId) && userIds.Contains(a.UserId))
                .ToListAsync();

            var wirdProgress = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
                .Where(p => userIds.Contains(p.UserId)).ToListAsync();

            var quranPlans = await _unitOfWork.Repository<QuranPlan>().QueryNoTracking()
                .Include(p => p.Progress).Where(p => userIds.Contains(p.UserId)).ToListAsync();

            var readingAllocations = await _unitOfWork.Repository<ReadingAllocation>().QueryNoTracking()
                .Where(a => a.UserId != null && userIds.Contains(a.UserId)).ToListAsync();

            var summaries = members.GroupBy(m => m.UserId).Select(g =>
            {
                var user = g.First().User;
                var userAttendance = attendance.Where(a => a.UserId == g.Key).ToList();
                var progress = wirdProgress.Where(p => p.UserId == g.Key).ToList();
                var plan = quranPlans.FirstOrDefault(p => p.UserId == g.Key);
                var readings = readingAllocations.Where(a => a.UserId == g.Key).ToList();

                return new
                {
                    userId = g.Key,
                    fullName = user?.FullName ?? user?.UserName ?? "Unknown",
                    email = user?.Email,
                    communities = g.Select(m => new { m.Community!.Name, role = m.Role.ToString() }),
                    gatheringsAttended = userAttendance.Count(a => a.Status == AttendanceStatus.Present),
                    gatheringsTotal = userAttendance.Count,
                    wirdCompleted = progress.Count(p => p.Completed),
                    wirdTotal = progress.Count,
                    quranParasCompleted = plan?.Progress.Count(p => p.Completed) ?? 0,
                    deathReadingsCompleted = readings.Count(r => r.Status == ReadingAllocationStatus.Completed),
                    deathReadingsTotal = readings.Count
                };
            }).OrderBy(s => s.fullName).ToList();

            return Ok(summaries);
        }

        // ---- Communities ----

        [HttpGet("communities")]
        public async Task<IActionResult> GetCommunities([FromQuery] int? mosqueId, [FromQuery] string? search = null)
        {
            var communityIds = await MuqaddamAccessHelper.GetAssignedCommunityIdsAsync(_unitOfWork, User, mosqueId);
            var query = _unitOfWork.Repository<Community>().QueryNoTracking()
                .Where(c => communityIds.Contains(c.Id) && c.Type == CommunityType.Tariqa);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(c => c.Name.Contains(term));
            }

            var communities = await query.Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.MosqueId,
                c.IsPublic,
                memberCount = c.Members.Count(m => m.Role == CommunityRole.Member)
            }).ToListAsync();

            return Ok(communities);
        }

        [HttpPost("communities")]
        public async Task<IActionResult> CreateCommunity([FromBody] CreateCommunityRequest request)
        {
            var community = new Community
            {
                Name = request.Name,
                Description = request.Description,
                MosqueId = request.MosqueId,
                Type = CommunityType.Tariqa,
                IsPublic = request.IsPublic
            };
            _unitOfWork.Repository<Community>().Add(community);
            await _unitOfWork.SaveChangesAsync();

            _unitOfWork.Repository<CommunityMember>().Add(new CommunityMember
            {
                CommunityId = community.Id,
                UserId = UserId,
                Role = CommunityRole.Muqaddam
            });
            await _unitOfWork.SaveChangesAsync();

            return Ok(community);
        }

        [HttpPut("communities/{id:int}")]
        public async Task<IActionResult> UpdateCommunity(int id, [FromBody] UpdateCommunityRequest request)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, id) is IActionResult denied)
                return denied;

            var community = await _unitOfWork.Repository<Community>().FindAsync(id);
            if (community == null) return NotFound();

            if (request.Name != null) community.Name = request.Name;
            if (request.Description != null) community.Description = request.Description;
            if (request.IsPublic.HasValue) community.IsPublic = request.IsPublic.Value;
            community.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(community);
        }

        [HttpGet("communities/{id:int}/members")]
        public async Task<IActionResult> GetMembers(int id)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, id) is IActionResult denied)
                return denied;

            var members = await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
                .Include(m => m.User)
                .Where(m => m.CommunityId == id)
                .Select(m => new
                {
                    m.Id,
                    m.UserId,
                    fullName = m.User!.FullName ?? m.User.UserName,
                    email = m.User.Email,
                    role = m.Role.ToString()
                })
                .ToListAsync();

            return Ok(members);
        }

        [HttpPost("communities/{id:int}/members")]
        public async Task<IActionResult> AddMember(int id, [FromBody] AddMemberRequest request)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, id) is IActionResult denied)
                return denied;

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null) return NotFound(new { message = "User not found." });

            if (await _unitOfWork.Repository<CommunityMember>().Query()
                .AnyAsync(m => m.CommunityId == id && m.UserId == user.Id))
                return Conflict(new { message = "Already a member." });

            var member = new CommunityMember
            {
                CommunityId = id,
                UserId = user.Id,
                Role = request.Role == CommunityRole.Muqaddam ? CommunityRole.Member : request.Role
            };
            _unitOfWork.Repository<CommunityMember>().Add(member);
            await _unitOfWork.SaveChangesAsync();
            return Ok(member);
        }

        [HttpDelete("communities/{communityId:int}/members/{userId}")]
        public async Task<IActionResult> RemoveMember(int communityId, string userId)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, communityId) is IActionResult denied)
                return denied;

            var member = await _unitOfWork.Repository<CommunityMember>().Query()
                .FirstOrDefaultAsync(m => m.CommunityId == communityId && m.UserId == userId);
            if (member == null) return NotFound();
            if (member.Role is CommunityRole.Admin or CommunityRole.Muqaddam && member.UserId != UserId)
                return BadRequest(new { message = "Cannot remove community leader." });

            _unitOfWork.Repository<CommunityMember>().Remove(member);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        // ---- Guidance Notes ----

        [HttpGet("guidance-notes")]
        public async Task<IActionResult> GetGuidanceNotes([FromQuery] int? communityId, [FromQuery] GuidanceNoteType? type, [FromQuery] string? search = null)
        {
            var communityIds = communityId.HasValue
                ? new List<int> { communityId.Value }
                : await MuqaddamAccessHelper.GetAssignedCommunityIdsAsync(_unitOfWork, User);

            if (communityId.HasValue && await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, communityId.Value) is IActionResult denied)
                return denied;

            var query = _unitOfWork.Repository<GuidanceNote>().QueryNoTracking()
                .Include(n => n.Murid)
                .Where(n => communityIds.Contains(n.CommunityId));

            if (type.HasValue) query = query.Where(n => n.Type == type.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(n => n.Content.Contains(term));
            }

            var notes = await query.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync();
            return Ok(notes);
        }

        [HttpPost("guidance-notes")]
        public async Task<IActionResult> CreateGuidanceNote([FromBody] CreateGuidanceNoteRequest request)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, request.CommunityId) is IActionResult denied)
                return denied;

            var note = new GuidanceNote
            {
                CommunityId = request.CommunityId,
                MuridUserId = request.MuridUserId,
                Type = request.Type,
                Content = request.Content,
                FollowUpDate = request.FollowUpDate,
                CreatedById = UserId
            };
            _unitOfWork.Repository<GuidanceNote>().Add(note);
            await _unitOfWork.SaveChangesAsync();
            return Ok(note);
        }

        [HttpPatch("guidance-notes/{id:int}/complete")]
        public async Task<IActionResult> CompleteFollowUp(int id)
        {
            var note = await _unitOfWork.Repository<GuidanceNote>().FindAsync(id);
            if (note == null) return NotFound();
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, note.CommunityId) is IActionResult denied)
                return denied;

            note.IsCompleted = true;
            note.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(note);
        }

        // ---- Events / Gatherings ----

        [HttpGet("communities/{communityId:int}/gatherings")]
        public async Task<IActionResult> GetGatherings(int communityId, [FromQuery] CommunityGatheringType? type = null)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, communityId) is IActionResult denied)
                return denied;

            var query = _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                .Include(g => g.Attendance).ThenInclude(a => a.User)
                .Where(g => g.CommunityId == communityId);

            if (type.HasValue) query = query.Where(g => g.GatheringType == type.Value);

            return Ok(await query.OrderByDescending(g => g.Date).ToListAsync());
        }

        [HttpPost("communities/{communityId:int}/gatherings")]
        public async Task<IActionResult> CreateGathering(int communityId, [FromBody] CreateGatheringRequest request)
        {
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, communityId) is IActionResult denied)
                return denied;

            var gathering = new CommunityGathering
            {
                CommunityId = communityId,
                Title = request.Title,
                Description = request.Description,
                GatheringType = request.GatheringType,
                Date = request.Date,
                StartTime = request.StartTime,
                Location = request.Location,
                CreatedById = UserId
            };
            _unitOfWork.Repository<CommunityGathering>().Add(gathering);
            await _unitOfWork.SaveChangesAsync();
            return Ok(gathering);
        }

        [HttpPost("gatherings/{gatheringId:int}/attendance")]
        public async Task<IActionResult> RecordGatheringAttendance(int gatheringId, [FromBody] List<GatheringAttendanceRequest> records)
        {
            var gathering = await _unitOfWork.Repository<CommunityGathering>().Query()
                .Include(g => g.Attendance)
                .FirstOrDefaultAsync(g => g.Id == gatheringId);
            if (gathering == null) return NotFound();
            if (await MuqaddamAccessHelper.RequireCommunityAccessAsync(_unitOfWork, User, gathering.CommunityId) is IActionResult denied)
                return denied;

            foreach (var dto in records)
            {
                var existing = gathering.Attendance.FirstOrDefault(a => a.UserId == dto.UserId);
                if (existing != null)
                {
                    existing.Status = dto.Status;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    gathering.Attendance.Add(new GatheringAttendance
                    {
                        GatheringId = gatheringId,
                        UserId = dto.UserId,
                        Status = dto.Status
                    });
                }
            }

            await _unitOfWork.SaveChangesAsync();
            return Ok(gathering.Attendance);
        }

        // ---- Reports ----

        [HttpGet("reports")]
        public async Task<IActionResult> Reports([FromQuery] string type = "participation", [FromQuery] int? mosqueId = null)
        {
            var communityIds = await MuqaddamAccessHelper.GetAssignedCommunityIdsAsync(_unitOfWork, User, mosqueId);
            var rows = new List<MuqaddamReportRow>();

            if (type.Equals("attendance", StringComparison.OrdinalIgnoreCase))
            {
                var gatherings = await _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                    .Include(g => g.Community)
                    .Include(g => g.Attendance)
                    .Where(g => communityIds.Contains(g.CommunityId))
                    .ToListAsync();

                foreach (var g in gatherings)
                {
                    rows.Add(new MuqaddamReportRow
                    {
                        Label = g.Title,
                        Category = g.Community?.Name,
                        Value = g.Attendance.Count(a => a.Status == AttendanceStatus.Present),
                        Detail = $"Present {g.Attendance.Count(a => a.Status == AttendanceStatus.Present)} / " +
                                 $"Absent {g.Attendance.Count(a => a.Status == AttendanceStatus.Absent)} / " +
                                 $"Late {g.Attendance.Count(a => a.Status == AttendanceStatus.Late)}",
                    });
                }
            }
            else
            {
                var members = await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
                    .Include(m => m.User)
                    .Include(m => m.Community)
                    .Where(m => communityIds.Contains(m.CommunityId) && m.Role == CommunityRole.Member)
                    .ToListAsync();

                var gatheringIds = await _unitOfWork.Repository<CommunityGathering>().QueryNoTracking()
                    .Where(g => communityIds.Contains(g.CommunityId))
                    .Select(g => g.Id).ToListAsync();

                var attendance = await _unitOfWork.Repository<GatheringAttendance>().QueryNoTracking()
                    .Where(a => gatheringIds.Contains(a.GatheringId))
                    .ToListAsync();

                foreach (var m in members.GroupBy(x => x.UserId))
                {
                    var user = m.First().User;
                    var present = attendance.Count(a => a.UserId == m.Key && a.Status == AttendanceStatus.Present);
                    var total = attendance.Count(a => a.UserId == m.Key);
                    rows.Add(new MuqaddamReportRow
                    {
                        Label = user?.FullName ?? "Unknown",
                        Category = string.Join(", ", m.Select(x => x.Community!.Name).Distinct()),
                        Value = present,
                        Detail = total == 0 ? "No gatherings recorded" : $"{present}/{total} gatherings attended"
                    });
                }
            }

            return Ok(new
            {
                reportType = type,
                generatedAt = DateTime.UtcNow,
                rows,
                summary = new { totalRows = rows.Count, totalValue = rows.Sum(r => r.Value) }
            });
        }

        private async Task<List<string>> GetMuridUserIdsAsync(List<int> communityIds) =>
            await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
                .Where(m => communityIds.Contains(m.CommunityId) && m.Role == CommunityRole.Member)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync();
    }
}
