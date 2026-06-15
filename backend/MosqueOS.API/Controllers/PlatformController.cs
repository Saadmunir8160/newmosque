using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    /// <summary>Super Admin — platform owner operations (spec §6.2).</summary>
    [Route("api/v1/platform")]
    [ApiController]
    [Authorize(Roles = Roles.SuperAdmin)]
    public class PlatformController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public PlatformController(
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        // ---- Dashboard stats ----

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            return Ok(new
            {
                totalMosques = await _unitOfWork.Repository<Mosque>().Query().CountAsync(),
                activeMosques = await _unitOfWork.Repository<Mosque>().Query().CountAsync(m => m.Status == MosqueStatus.Active),
                pendingClaims = await _unitOfWork.Repository<Mosque>().Query().CountAsync(m => m.Status == MosqueStatus.Claimed),
                totalUsers = await _userManager.Users.CountAsync()
            });
        }

        // ---- User management ----

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userManager.Users.AsNoTracking().OrderBy(u => u.UserName).ToListAsync();
            var result = new List<object>();
            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                result.Add(new
                {
                    u.Id,
                    u.UserName,
                    u.Email,
                    u.FullName,
                    Roles = roles,
                    u.CreatedAt
                });
            }
            return Ok(result);
        }

        [HttpPost("users/{userId}/roles")]
        public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleDto dto)
        {
            if (!Roles.All.Contains(dto.Role))
                return BadRequest(new { message = "Invalid role." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (!await _roleManager.RoleExistsAsync(dto.Role))
                await _roleManager.CreateAsync(new IdentityRole(dto.Role));

            if (!await _userManager.IsInRoleAsync(user, dto.Role))
                await _userManager.AddToRoleAsync(user, dto.Role);

            await LogAsync("ASSIGN_ROLE", userId, "User", null,
                $"Assigned role '{dto.Role}' to {user.UserName}");

            return Ok(new { message = $"Role '{dto.Role}' assigned to {user.UserName}." });
        }

        [HttpDelete("users/{userId}/roles/{role}")]
        public async Task<IActionResult> RemoveRole(string userId, string role)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (role == Roles.SuperAdmin)
                return BadRequest(new { message = "Cannot remove Super Admin role via API." });

            await _userManager.RemoveFromRoleAsync(user, role);
            await LogAsync("REMOVE_ROLE", userId, "User", null,
                $"Removed role '{role}' from {user.UserName}");

            return Ok(new { message = $"Role '{role}' removed." });
        }

        // ---- Mosque claims ----

        [HttpGet("claims/pending")]
        public async Task<IActionResult> GetPendingClaims() =>
            Ok(await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => m.Status == MosqueStatus.Claimed)
                .OrderByDescending(m => m.UpdatedAt)
                .ToListAsync());

        [HttpPost("mosques/{id:int}/approve-claim")]
        public async Task<IActionResult> ApproveClaim(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();
            if (mosque.Status != MosqueStatus.Claimed)
                return BadRequest(new { message = "Mosque is not in claimed status." });

            mosque.Status = MosqueStatus.Active;
            mosque.UpdatedAt = DateTime.UtcNow;

            if (mosque.OwnerId != null)
            {
                var owner = await _userManager.FindByIdAsync(mosque.OwnerId);
                if (owner != null && !await _userManager.IsInRoleAsync(owner, Roles.MosqueAdmin))
                    await _userManager.AddToRoleAsync(owner, Roles.MosqueAdmin);
            }

            await _unitOfWork.SaveChangesAsync();
            await LogAsync("APPROVE_CLAIM", mosque.OwnerId, "Mosque", id,
                $"Approved claim for mosque '{mosque.Name}'");

            return Ok(mosque);
        }

        [HttpPost("mosques/{id:int}/reject-claim")]
        public async Task<IActionResult> RejectClaim(int id, [FromBody] RejectClaimDto? dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            var previousOwner = mosque.OwnerId;
            mosque.Status = MosqueStatus.Unclaimed;
            mosque.OwnerId = null;
            mosque.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            await LogAsync("REJECT_CLAIM", previousOwner, "Mosque", id,
                $"Rejected claim for '{mosque.Name}'. Reason: {dto?.Reason ?? "Not specified"}");

            return Ok(new { message = "Claim rejected. Mosque is unclaimed again." });
        }

        /// <summary>Assign a user as mosque admin (and optional owner).</summary>
        [HttpPost("mosques/{id:int}/assign-admin")]
        public async Task<IActionResult> AssignMosqueAdmin(int id, [FromBody] AssignAdminDto dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            var user = await _userManager.FindByIdAsync(dto.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            if (!await _userManager.IsInRoleAsync(user, Roles.MosqueAdmin))
                await _userManager.AddToRoleAsync(user, Roles.MosqueAdmin);

            if (dto.SetAsOwner)
            {
                mosque.OwnerId = dto.UserId;
                if (!await _userManager.IsInRoleAsync(user, Roles.MosqueOwner))
                    await _userManager.AddToRoleAsync(user, Roles.MosqueOwner);
            }

            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            await LogAsync("ASSIGN_MOSQUE_ADMIN", dto.UserId, "Mosque", id,
                $"Assigned {user.UserName} as admin for '{mosque.Name}'");

            return Ok(new { message = $"{user.UserName} assigned to {mosque.Name}." });
        }

        /// <summary>Seed a new unclaimed mosque listing (Bradford rollout).</summary>
        [HttpPost("mosques/seed")]
        public async Task<IActionResult> SeedMosqueListing([FromBody] Mosque mosque)
        {
            if (await _unitOfWork.Repository<Mosque>().Query().AnyAsync(m => m.Slug == mosque.Slug))
                return Conflict(new { message = "Slug already exists." });

            mosque.Id = 0;
            mosque.Status = MosqueStatus.Unclaimed;
            mosque.Country ??= "United Kingdom";
            mosque.Timezone ??= "Europe/London";

            _unitOfWork.Repository<Mosque>().Add(mosque);
            await _unitOfWork.SaveChangesAsync();

            var modules = new[]
            {
                "PrayerTimes", "Announcements", "Events", "Madrassah", "Communities",
                "Awrad", "Adhkar", "Duas", "Quran", "RitualGuides", "Janaza",
                "DeathReadings", "Participation", "JourneyGuides"
            };
            _unitOfWork.Repository<MosqueSetting>().AddRange(modules.Select(m => new MosqueSetting
            {
                MosqueId = mosque.Id, ModuleKey = m, IsEnabled = true
            }));
            await _unitOfWork.SaveChangesAsync();

            await LogAsync("SEED_MOSQUE", null, "Mosque", mosque.Id,
                $"Seeded mosque listing '{mosque.Name}' in {mosque.City}");

            return Ok(mosque);
        }

        /// <summary>View any mosque's full data snapshot.</summary>
        [HttpGet("mosques/{id:int}/snapshot")]
        public async Task<IActionResult> GetMosqueSnapshot(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Id == id);
            if (mosque == null) return NotFound();

            return Ok(new
            {
                mosque,
                announcementCount = await _unitOfWork.Repository<Announcement>().Query().CountAsync(a => a.MosqueId == id),
                eventCount = await _unitOfWork.Repository<Event>().Query().CountAsync(e => e.MosqueId == id),
                studentCount = await _unitOfWork.Repository<MadrassahClass>().Query().Where(c => c.MosqueId == id)
                    .SelectMany(c => c.Enrolments).CountAsync(),
                communityCount = await _unitOfWork.Repository<Community>().Query().CountAsync(c => c.MosqueId == id)
            });
        }

        // ---- Audit logs ----

        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 100)
        {
            var platform = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .ToListAsync();

            var prayer = await _unitOfWork.Repository<PrayerTimeAuditLog>().QueryNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .Select(l => new
                {
                    l.Id,
                    Action = "PRAYER_TIME_CHANGE",
                    l.ChangedById,
                    TargetType = "PrayerTimes",
                    TargetId = l.MosqueId,
                    l.ChangeDescription,
                    l.CreatedAt
                })
                .ToListAsync();

            var combined = platform.Select(p => new AuditLogDto
            {
                Id = p.Id, Action = p.Action, ActorId = p.ActorId,
                TargetType = p.TargetType, TargetId = p.TargetId,
                Description = p.Description, CreatedAt = p.CreatedAt
            }).ToList();

            combined.AddRange(prayer.Select(p => new AuditLogDto
            {
                Id = p.Id, Action = p.Action, ActorId = p.ChangedById,
                TargetType = p.TargetType, TargetId = p.TargetId,
                Description = p.ChangeDescription, CreatedAt = p.CreatedAt
            }));

            return Ok(combined.OrderByDescending(x => x.CreatedAt).Take(limit));
        }

        private async Task LogAsync(string action, string? targetUserId, string targetType, int? targetId, string description)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var actor = await _userManager.FindByIdAsync(actorId);

            _unitOfWork.Repository<PlatformAuditLog>().Add(new PlatformAuditLog
            {
                Action = action,
                ActorId = actorId,
                ActorName = actor?.UserName,
                TargetType = targetType,
                TargetId = targetId,
                Description = description
            });
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public class AssignRoleDto { public string Role { get; set; } = string.Empty; }
    public class AssignAdminDto { public string UserId { get; set; } = string.Empty; public bool SetAsOwner { get; set; } }
    public class RejectClaimDto { public string? Reason { get; set; } }

    public class AuditLogDto
    {
        public int Id { get; set; }
        public string Action { get; set; } = string.Empty;
        public string ActorId { get; set; } = string.Empty;
        public string? TargetType { get; set; }
        public int? TargetId { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
