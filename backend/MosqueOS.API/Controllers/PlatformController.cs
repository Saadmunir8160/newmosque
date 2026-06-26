using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Models.Platform;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
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
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly MosqueModuleSeedService _moduleSeed;
        private readonly SlugService _slugService;
        private readonly OwnershipClaimService _claimService;

        public PlatformController(
            IUnitOfWork unitOfWork,
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            MosqueModuleSeedService moduleSeed,
            SlugService slugService,
            OwnershipClaimService claimService)
        {
            _unitOfWork = unitOfWork;
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
            _moduleSeed = moduleSeed;
            _slugService = slugService;
            _claimService = claimService;
        }

        /// <summary>Batch-load Mosque Admin user IDs (avoids N+1 IsInRoleAsync per user).</summary>
        private async Task<HashSet<string>> GetMosqueAdminUserIdsAsync()
        {
            var adminRole = await _roleManager.FindByNameAsync(Roles.MosqueAdmin);
            if (adminRole == null)
                return new HashSet<string>(StringComparer.Ordinal);

            var ids = await _db.UserRoles
                .AsNoTracking()
                .Where(ur => ur.RoleId == adminRole.Id)
                .Select(ur => ur.UserId)
                .ToListAsync();

            return ids.ToHashSet(StringComparer.Ordinal);
        }

        /// <summary>Batch-load all user roles (avoids N+1 GetRolesAsync per user).</summary>
        private async Task<Dictionary<string, List<string>>> GetUserRolesMapAsync()
        {
            var roleNames = await _db.Roles.AsNoTracking().ToDictionaryAsync(r => r.Id, r => r.Name ?? "");
            var userRoles = await _db.UserRoles.AsNoTracking().ToListAsync();

            var map = new Dictionary<string, List<string>>(StringComparer.Ordinal);
            foreach (var ur in userRoles)
            {
                if (!roleNames.TryGetValue(ur.RoleId, out var roleName) || string.IsNullOrEmpty(roleName))
                    continue;
                if (!map.TryGetValue(ur.UserId, out var roles))
                {
                    roles = new List<string>();
                    map[ur.UserId] = roles;
                }
                roles.Add(roleName);
            }

            return map;
        }

        // ---- Dashboard stats ----

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var mosqueRepo = _unitOfWork.Repository<Mosque>().Query();
            return Ok(new
            {
                totalMosques = await mosqueRepo.CountAsync(),
                activeMosques = await mosqueRepo.CountAsync(m => m.Status == MosqueStatus.Active),
                totalUsers = await _userManager.Users.CountAsync()
            });
        }

        /// <summary>Aggregated Super Admin dashboard metrics.</summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);
            var sevenDaysAgo = now.AddDays(-7);
            var fourteenDaysAgo = now.AddDays(-14);

            var mosques = await _unitOfWork.Repository<Mosque>().QueryNoTracking().ToListAsync();
            var users = await _userManager.Users.AsNoTracking().ToListAsync();
            var userRolesMap = await GetUserRolesMapAsync();

            var roleCounts = new Dictionary<string, int>();
            var blockedUsers = 0;
            var failedLoginAttempts = 0;
            foreach (var user in users)
            {
                if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
                    blockedUsers++;
                failedLoginAttempts += user.AccessFailedCount;

                if (userRolesMap.TryGetValue(user.Id, out var roles))
                {
                    foreach (var role in roles)
                        roleCounts[role] = roleCounts.GetValueOrDefault(role) + 1;
                }
            }

            var missingOwners = mosques.Count(m =>
                m.Status == MosqueStatus.Active && string.IsNullOrEmpty(m.OwnerId));

            var featureUsage = await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking()
                .Where(s => s.IsEnabled)
                .GroupBy(s => s.ModuleKey)
                .Select(g => new { module = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(6)
                .ToListAsync();

            var auditRecent = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .OrderByDescending(l => l.CreatedAt)
                .Take(20)
                .ToListAsync();

            var activityLast7 = auditRecent.Count(l => l.CreatedAt >= sevenDaysAgo);
            var activityPrev7 = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .CountAsync(l => l.CreatedAt >= fourteenDaysAgo && l.CreatedAt < sevenDaysAgo);

            var suspiciousActivity = auditRecent.Count(l =>
                l.Action.Contains("REJECT", StringComparison.OrdinalIgnoreCase) ||
                l.Action.Contains("REMOVE", StringComparison.OrdinalIgnoreCase));

            var duplicateFlags = ComputeDuplicateFlags(mosques);
            var duplicateListings = duplicateFlags.Count;
            var suspended = mosques.Count(m => m.Status == MosqueStatus.Suspended);
            var pendingReview = mosques.Count(m => m.Status == MosqueStatus.PendingReview);
            var claimPending = mosques.Count(m => m.Status == MosqueStatus.ClaimPending);
            var completenessScores = mosques.Select(m => MosqueProfileCompleteness.Calculate(m).completeness).ToList();
            var avgProfileCompleteness = completenessScores.Count > 0
                ? (int)Math.Round(completenessScores.Average())
                : 0;
            var mosquesByStatus = Enum.GetValues<MosqueStatus>()
                .ToDictionary(s => s.ToString(), s => mosques.Count(m => m.Status == s));
            var pendingClaimsCount = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
                .CountAsync(c => c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
            var newUsers30d = users.Count(u => u.CreatedAt >= thirtyDaysAgo);

            var ownerIds = mosques.Where(m => m.OwnerId != null).Select(m => m.OwnerId!).Distinct().ToList();
            var owners = users.Where(u => ownerIds.Contains(u.Id)).ToDictionary(u => u.Id, u => u.FullName);

            var guidesCount = await _unitOfWork.Repository<RitualGuide>().Query().CountAsync();

            var warningCount = (missingOwners > 0 ? 1 : 0) + (duplicateListings > 0 ? 1 : 0) +
                (suspiciousActivity > 0 ? 1 : 0);

            var healthScore = 100;
            if (missingOwners > 0) healthScore -= 8;
            if (duplicateListings > 0) healthScore -= 5;
            if (failedLoginAttempts > 5) healthScore -= 7;
            if (blockedUsers > 0) healthScore -= 5;
            if (mosques.Count > 0 && mosques.Count(m => m.Status == MosqueStatus.Active) < mosques.Count * 0.5)
                healthScore -= 10;
            healthScore = Math.Max(60, Math.Min(100, healthScore));

            var mosqueChart = Enumerable.Range(0, 30).Select(i =>
            {
                var day = now.Date.AddDays(-29 + i);
                var next = day.AddDays(1);
                return new { date = day.ToString("yyyy-MM-dd"), count = mosques.Count(m => m.CreatedAt >= day && m.CreatedAt < next) };
            }).ToList();

            var userChart = Enumerable.Range(0, 30).Select(i =>
            {
                var day = now.Date.AddDays(-29 + i);
                var next = day.AddDays(1);
                return new { date = day.ToString("yyyy-MM-dd"), count = users.Count(u => u.CreatedAt >= day && u.CreatedAt < next) };
            }).ToList();

            var activityChart = Enumerable.Range(0, 7).Select(i =>
            {
                var day = now.Date.AddDays(-6 + i);
                var next = day.AddDays(1);
                return new { date = day.ToString("yyyy-MM-dd"), count = auditRecent.Count(l => l.CreatedAt >= day && l.CreatedAt < next) };
            }).ToList();

            var notifications = new List<object>();
            if (missingOwners > 0)
                notifications.Add(new { type = "system", title = "Missing owners", message = $"{missingOwners} active mosque(s) need an owner", route = "/dashboard/super/users", severity = "warn" });
            if (duplicateListings > 0)
                notifications.Add(new { type = "system", title = "Duplicate mosques", message = $"{duplicateListings} possible duplicate mosque(s)", route = "/dashboard/super/mosque-data", severity = "warn" });
            if (suspiciousActivity > 0)
                notifications.Add(new { type = "security", title = "Security alerts", message = $"{suspiciousActivity} suspicious event(s) in recent logs", route = "/dashboard/super/audit", severity = "error" });
            if (pendingClaimsCount > 0)
                notifications.Add(new { type = "claim", title = "Ownership claims", message = $"{pendingClaimsCount} claim(s) awaiting review", route = "/dashboard/super/claims", severity = "warn", actionLabel = "Review Claim" });

            return Ok(new
            {
                syncedAt = now,
                platformStatus = warningCount > 0 ? "Warning" : "Healthy",
                healthScore,
                stats = new
                {
                    totalMosques = mosques.Count,
                    activeMosques = mosques.Count(m => m.Status == MosqueStatus.Active),
                    pendingReview,
                    totalUsers = users.Count
                },
                needsAttention = new
                {
                    unclaimedMosques = mosques.Count(m => m.Status == MosqueStatus.Unclaimed),
                    missingOwners,
                    pendingApprovals = pendingClaimsCount + pendingReview,
                    pendingClaims = pendingClaimsCount,
                    duplicateListings,
                    systemWarnings = warningCount
                },
                mosques = new
                {
                    total = mosques.Count,
                    active = mosques.Count(m => m.Status == MosqueStatus.Active),
                    unclaimed = mosques.Count(m => m.Status == MosqueStatus.Unclaimed),
                    suspended,
                    pendingReview,
                    avgProfileCompleteness,
                    byStatus = mosquesByStatus,
                    pendingClaims = claimPending,
                    rejectedClaims = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
                        .CountAsync(c => c.Status == OwnershipClaimStatus.Rejected && !c.IsDeleted),
                    recentAdditions = mosques
                        .OrderByDescending(m => m.CreatedAt)
                        .Take(6)
                        .Select(m => new
                        {
                            m.Id,
                            m.Name,
                            m.City,
                            status = m.Status.ToString(),
                            ownerName = m.OwnerId != null && owners.TryGetValue(m.OwnerId, out var n) ? n : null,
                            m.CreatedAt
                        })
                },
                users = new
                {
                    total = users.Count,
                    active = users.Count - blockedUsers,
                    blocked = blockedUsers,
                    newUsers30d,
                    byRole = roleCounts.OrderByDescending(kv => kv.Value).Select(kv => new { role = kv.Key, count = kv.Value })
                },
                systemHealth = new
                {
                    api = "Operational",
                    database = "Connected",
                    storage = "Available",
                    email = "Configured",
                    queue = "Idle",
                    backup = "Scheduled"
                },
                security = new
                {
                    activeSessions = users.Count(u => u.LockoutEnd == null || u.LockoutEnd <= DateTimeOffset.UtcNow),
                    failedLoginAttempts,
                    blockedAccounts = blockedUsers,
                    suspiciousActivity
                },
                analytics = new
                {
                    mosqueGrowth30d = mosques.Count(m => m.CreatedAt >= thirtyDaysAgo),
                    userGrowth30d = newUsers30d,
                    featureUsage,
                    activityLast7,
                    activityPrev7,
                    mosqueChart,
                    userChart,
                    activityChart
                },
                content = new
                {
                    announcements = await _unitOfWork.Repository<Announcement>().Query().CountAsync(),
                    events = await _unitOfWork.Repository<Event>().Query().CountAsync(),
                    campaigns = await _unitOfWork.Repository<ReadingCampaign>().Query().CountAsync(c => c.IsActive),
                    guides = guidesCount
                },
                notifications,
                recentActivity = auditRecent.Take(10).Select(l => new AuditLogResponse
                {
                    Id = l.Id,
                    Action = l.Action,
                    ActorId = l.ActorId,
                    TargetType = l.TargetType,
                    TargetId = l.TargetId,
                    Description = l.Description,
                    CreatedAt = l.CreatedAt
                }),
                auditPreview = MapAudit(auditRecent.Take(8))
            });
        }

        private static IEnumerable<AuditLogResponse> MapAudit(IEnumerable<PlatformAuditLog> logs) =>
            logs.Select(l => new AuditLogResponse
            {
                Id = l.Id,
                Action = l.Action,
                ActorId = l.ActorId,
                ActorName = l.ActorName,
                TargetType = l.TargetType,
                TargetId = l.TargetId,
                Description = l.Description,
                CreatedAt = l.CreatedAt
            });

        private static string BuildInitials(string name)
        {
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "U";
            if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
            return $"{parts[0][0]}{parts[^1][0]}".ToUpperInvariant();
        }

        // ---- User management ----

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var mosques = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .ToDictionaryAsync(m => m.Id, m => m.Name);
            var users = await _userManager.Users.AsNoTracking().OrderBy(u => u.UserName).ToListAsync();
            var userRolesMap = await GetUserRolesMapAsync();
            var result = new List<PlatformUserResponse>();
            foreach (var u in users)
            {
                var roles = userRolesMap.TryGetValue(u.Id, out var r) ? r : new List<string>();
                var isActive = !u.LockoutEnabled ||
                    !u.LockoutEnd.HasValue ||
                    u.LockoutEnd <= DateTimeOffset.UtcNow;
                result.Add(new PlatformUserResponse
                {
                    Id = u.Id,
                    UserName = u.UserName ?? "",
                    Email = u.Email,
                    FullName = u.FullName,
                    Roles = roles.ToList(),
                    CreatedAt = u.CreatedAt,
                    HomeMosqueId = u.HomeMosqueId,
                    MosqueName = u.HomeMosqueId.HasValue && mosques.TryGetValue(u.HomeMosqueId.Value, out var name) ? name : null,
                    IsActive = isActive,
                    LastLoginAt = null
                });
            }
            return Ok(result);
        }

        [HttpPatch("users/{userId}")]
        public async Task<IActionResult> UpdateUser(string userId, [FromBody] UpdatePlatformUserRequest dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (dto.ClearMosque)
                user.HomeMosqueId = null;
            else if (dto.HomeMosqueId.HasValue)
            {
                var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(dto.HomeMosqueId.Value);
                if (mosque == null) return NotFound(new ApiMessageResponse { Message = "Mosque not found." });
                user.HomeMosqueId = dto.HomeMosqueId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email.Trim();

            await _userManager.UpdateAsync(user);
            await LogAsync("UPDATE_USER", userId, "User", null, $"Updated user {user.UserName}");
            return Ok(new ApiMessageResponse { Message = "User updated." });
        }

        [HttpPatch("users/{userId}/status")]
        public async Task<IActionResult> SetUserStatus(string userId, [FromBody] bool active)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin) && !active)
                return BadRequest(new ApiMessageResponse { Message = "Cannot deactivate a Super Admin." });

            if (active)
            {
                user.LockoutEnd = null;
                user.LockoutEnabled = false;
            }
            else
            {
                user.LockoutEnabled = true;
                user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
            }

            await _userManager.UpdateAsync(user);
            await LogAsync(active ? "ACTIVATE_USER" : "DEACTIVATE_USER", userId, "User", null,
                $"{(active ? "Activated" : "Deactivated")} user {user.UserName}");
            return Ok(new ApiMessageResponse { Message = active ? "User activated." : "User deactivated." });
        }

        [HttpPost("users/{userId}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var tempPassword = $"MosqueOS!{Guid.NewGuid():N}"[..16];
            var result = await _userManager.ResetPasswordAsync(user, token, tempPassword);
            if (!result.Succeeded)
                return BadRequest(new ApiMessageResponse { Message = string.Join("; ", result.Errors.Select(e => e.Description)) });

            await LogAsync("RESET_PASSWORD", userId, "User", null, $"Reset password for {user.UserName}");
            return Ok(new ResetPasswordResponse
            {
                Message = $"Temporary password set for {user.UserName}.",
                TemporaryPassword = tempPassword
            });
        }

        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == actorId)
                return BadRequest(new ApiMessageResponse { Message = "You cannot delete your own account." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin))
            {
                var superAdmins = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
                if (superAdmins.Count <= 1)
                    return BadRequest(new ApiMessageResponse { Message = "Cannot delete the last Super Admin." });
            }

            var userName = user.UserName;
            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
                return BadRequest(new ApiMessageResponse { Message = string.Join("; ", result.Errors.Select(e => e.Description)) });

            await LogAsync("DELETE_USER", userId, "User", null, $"Deleted user {userName}");
            return Ok(new ApiMessageResponse { Message = "User deleted." });
        }

        [HttpPost("users/bulk")]
        public async Task<IActionResult> BulkUserAction([FromBody] BulkUserActionRequest dto)
        {
            if (dto.UserIds == null || dto.UserIds.Length == 0)
                return BadRequest(new ApiMessageResponse { Message = "No users selected." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var processed = 0;
            var errors = new List<string>();

            foreach (var userId in dto.UserIds.Distinct())
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null) { errors.Add($"{userId}: not found"); continue; }

                try
                {
                    switch (dto.Action?.ToLowerInvariant())
                    {
                        case "assignrole":
                            if (string.IsNullOrWhiteSpace(dto.Role) || !Roles.All.Contains(dto.Role))
                            { errors.Add($"{user.UserName}: invalid role"); continue; }
                            if (!await _roleManager.RoleExistsAsync(dto.Role))
                                await _roleManager.CreateAsync(new IdentityRole(dto.Role));
                            if (!await _userManager.IsInRoleAsync(user, dto.Role))
                                await _userManager.AddToRoleAsync(user, dto.Role);
                            break;
                        case "changemosque":
                            if (dto.MosqueId.HasValue)
                            {
                                var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(dto.MosqueId.Value);
                                if (mosque == null) { errors.Add($"{user.UserName}: mosque not found"); continue; }
                                user.HomeMosqueId = dto.MosqueId.Value;
                            }
                            else user.HomeMosqueId = null;
                            await _userManager.UpdateAsync(user);
                            break;
                        case "activate":
                            user.LockoutEnd = null;
                            user.LockoutEnabled = false;
                            await _userManager.UpdateAsync(user);
                            break;
                        case "deactivate":
                            if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin))
                            { errors.Add($"{user.UserName}: cannot deactivate Super Admin"); continue; }
                            user.LockoutEnabled = true;
                            user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
                            await _userManager.UpdateAsync(user);
                            break;
                        case "delete":
                            if (userId == actorId) { errors.Add("Cannot delete yourself"); continue; }
                            if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin))
                            {
                                var supers = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
                                if (supers.Count <= 1) { errors.Add("Cannot delete last Super Admin"); continue; }
                            }
                            await _userManager.DeleteAsync(user);
                            break;
                        default:
                            return BadRequest(new ApiMessageResponse { Message = "Unknown bulk action." });
                    }
                    processed++;
                }
                catch (Exception ex)
                {
                    errors.Add($"{user.UserName}: {ex.Message}");
                }
            }

            await LogAsync("BULK_USER_ACTION", null, "User", null,
                $"Bulk {dto.Action} on {processed} user(s)");

            return Ok(new
            {
                message = $"Processed {processed} user(s).",
                processed,
                errors
            });
        }

        [HttpPost("users/{userId}/roles")]
        public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleRequest dto)
        {
            if (!Roles.All.Contains(dto.Role))
                return BadRequest(new ApiMessageResponse { Message = "Invalid role." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (!await _roleManager.RoleExistsAsync(dto.Role))
                await _roleManager.CreateAsync(new IdentityRole(dto.Role));

            if (!await _userManager.IsInRoleAsync(user, dto.Role))
                await _userManager.AddToRoleAsync(user, dto.Role);

            await LogAsync("ASSIGN_ROLE", userId, "User", null,
                $"Assigned role '{dto.Role}' to {user.UserName}");

            return Ok(new ApiMessageResponse { Message = $"Role '{dto.Role}' assigned to {user.UserName}." });
        }

        [HttpDelete("users/{userId}/roles/{role}")]
        public async Task<IActionResult> RemoveRole(string userId, string role)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            if (role == Roles.SuperAdmin)
                return BadRequest(new ApiMessageResponse { Message = "Cannot remove Super Admin role via API." });

            await _userManager.RemoveFromRoleAsync(user, role);
            await LogAsync("REMOVE_ROLE", userId, "User", null,
                $"Removed role '{role}' from {user.UserName}");

            return Ok(new ApiMessageResponse { Message = $"Role '{role}' removed." });
        }

        [HttpPost("mosques/{id:int}/activate")]
        public async Task<IActionResult> ActivateMosque(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null || mosque.IsDeleted)
                return NotFound(new ApiMessageResponse { Message = "Mosque not found." });

            mosque.Status = MosqueStatus.Active;
            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await LogAsync("MOSQUE_ACTIVATED", reviewerId, "Mosque", id,
                $"Activated mosque '{mosque.Name}'");

            return Ok(mosque);
        }

        [HttpPost("mosques/{id:int}/deactivate")]
        public async Task<IActionResult> DeactivateMosque(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null || mosque.IsDeleted)
                return NotFound(new ApiMessageResponse { Message = "Mosque not found." });

            if (mosque.Status != MosqueStatus.Active)
                return BadRequest(new ApiMessageResponse { Message = "Only active mosques can be deactivated." });

            mosque.Status = MosqueStatus.Suspended;
            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            await LogAsync("MOSQUE_DEACTIVATED", reviewerId, "Mosque", id,
                $"Deactivated mosque '{mosque.Name}'");

            return Ok(mosque);
        }

        /// <summary>Check whether a mosque slug is available.</summary>
        [HttpGet("mosques/check-slug")]
        public async Task<IActionResult> CheckMosqueSlug([FromQuery] string slug)
        {
            var normalized = SlugService.Normalize(slug ?? string.Empty);
            if (string.IsNullOrEmpty(normalized))
                return Ok(new { available = false, slug = normalized });

            var taken = await _slugService.IsSlugTakenAsync(normalized);
            return Ok(new { available = !taken, slug = normalized });
        }

        /// <summary>Create a new unclaimed mosque listing (alias for seed).</summary>
        [HttpPost("mosques")]
        public Task<IActionResult> CreateMosque([FromBody] MosqueCreateDto dto) => SeedMosque(dto);

        /// <summary>Seed a new unclaimed mosque listing.</summary>
        [HttpPost("mosques/seed")]
        public async Task<IActionResult> SeedMosque([FromBody] MosqueCreateDto dto)
        {
            var errors = MosqueValidation.ValidateCreate(dto);
            if (errors.Count > 0)
                return BadRequest(new ApiMessageResponse { Message = string.Join(" ", errors) });

            string slug;
            if (string.IsNullOrWhiteSpace(dto.Slug))
            {
                slug = await _slugService.GenerateUniqueAsync(dto.Name);
            }
            else
            {
                slug = SlugService.Normalize(dto.Slug);
                if (string.IsNullOrEmpty(slug))
                    return BadRequest(new ApiMessageResponse { Message = "Slug is invalid." });
                if (await _slugService.IsSlugTakenAsync(slug))
                    return Conflict(new ApiMessageResponse { Message = "This slug is already in use." });
            }

            var mosque = new Mosque
            {
                Name = dto.Name.Trim(),
                Slug = slug,
                Address = dto.Address?.Trim() ?? string.Empty,
                City = dto.City.Trim(),
                Postcode = dto.Postcode?.Trim() ?? string.Empty,
                Country = dto.Country?.Trim() ?? "United Kingdom",
                Phone = dto.Phone,
                Email = dto.Email,
                Website = dto.Website,
                FacebookUrl = dto.FacebookUrl,
                InstagramUrl = dto.InstagramUrl,
                Description = dto.Description,
                LogoUrl = dto.LogoUrl,
                BannerUrl = dto.BannerUrl,
                Status = MosqueStatus.Unclaimed,
                Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? "Europe/London" : dto.Timezone.Trim()
            };

            _unitOfWork.Repository<Mosque>().Add(mosque);
            await _unitOfWork.SaveChangesAsync();
            await _moduleSeed.SeedAsync(mosque.Id);

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            await LogAsync("MOSQUE_SEEDED", actorId, "Mosque", mosque.Id,
                $"Seeded unclaimed mosque '{mosque.Name}' ({mosque.Slug}).");

            return Ok(mosque);
        }

        /// <summary>Super admin mosque listings with filters.</summary>
        [HttpGet("mosques/listings")]
        public async Task<IActionResult> GetMosqueListings(
            [FromQuery] string? q,
            [FromQuery] string? status,
            [FromQuery] bool duplicatesOnly = false,
            [FromQuery] bool missingOwner = false,
            [FromQuery] string? sort = null)
        {
            var query = _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => !m.IsDeleted);

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<MosqueStatus>(status, true, out var statusEnum))
                query = query.Where(m => m.Status == statusEnum);

            if (missingOwner)
                query = query.Where(m => m.Status == MosqueStatus.Active && m.OwnerId == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(m => m.Name.Contains(term) || m.City.Contains(term) || m.Slug.Contains(term));
            }

            var mosques = await query.OrderByDescending(m => m.CreatedAt).ToListAsync();
            var users = await _userManager.Users.AsNoTracking().ToListAsync();
            var userMap = users.ToDictionary(u => u.Id, u => u);

            var duplicateFlags = ComputeDuplicateFlags(mosques);

            var items = mosques.Select(m =>
            {
                userMap.TryGetValue(m.OwnerId ?? "", out var owner);
                duplicateFlags.TryGetValue(m.Id, out var dupReason);
                var (completeness, _) = MosqueProfileCompleteness.Calculate(m);
                return new MosqueListingResponse
                {
                    Id = m.Id,
                    Name = m.Name,
                    Slug = m.Slug,
                    Address = m.Address,
                    City = m.City,
                    Postcode = m.Postcode,
                    Country = m.Country,
                    Phone = m.Phone,
                    Email = m.Email,
                    Website = m.Website,
                    Description = m.Description,
                    Status = m.Status.ToString(),
                    OwnerId = m.OwnerId,
                    OwnerName = owner?.FullName ?? owner?.UserName,
                    OwnerEmail = owner?.Email,
                    ProfileCompleteness = completeness,
                    IsDuplicate = dupReason != null,
                    DuplicateReason = dupReason,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                };
            }).Where(i => !duplicatesOnly || i.IsDuplicate).ToList();

            if (string.Equals(sort, "completeness", StringComparison.OrdinalIgnoreCase))
                items = items.OrderByDescending(i => i.ProfileCompleteness).ThenByDescending(i => i.CreatedAt).ToList();

            return Ok(new
            {
                total = items.Count,
                items,
                summary = new
                {
                    unclaimed = mosques.Count(m => m.Status == MosqueStatus.Unclaimed),
                    claimPending = mosques.Count(m => m.Status == MosqueStatus.ClaimPending),
                    claimed = mosques.Count(m => m.Status == MosqueStatus.Claimed),
                    active = mosques.Count(m => m.Status == MosqueStatus.Active),
                    pendingReview = mosques.Count(m => m.Status == MosqueStatus.PendingReview)
                }
            });
        }

        /// <summary>Pending ownership claims queue.</summary>
        [HttpGet("claims/pending")]
        public async Task<IActionResult> GetPendingClaims()
        {
            var items = await _claimService.GetClaimsAsync(OwnershipClaimStatus.Pending);
            return Ok(new
            {
                summary = new { pending = items.Count },
                items = items.Select(MapClaimListItem)
            });
        }

        /// <summary>Ownership claim detail for super admin review.</summary>
        [HttpGet("claims/{claimId:int}")]
        public async Task<IActionResult> GetClaimDetail(int claimId)
        {
            var detail = await _claimService.GetClaimDetailAsync(claimId);
            if (detail == null) return NotFound(new ApiMessageResponse { Message = "Claim not found." });
            return Ok(MapClaimDetail(detail));
        }

        /// <summary>Approve claim — assign owner and activate mosque.</summary>
        [HttpPost("claims/{claimId:int}/approve")]
        public async Task<IActionResult> ApproveClaim(int claimId)
        {
            var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var (mosque, error, code) = await _claimService.ApproveAndActivateAsync(claimId, reviewerId);
            if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
            return Ok(new
            {
                success = true,
                message = "Claim approved. Mosque is now active.",
                mosque,
                status = "APPROVED"
            });
        }

        /// <summary>Reject ownership claim.</summary>
        [HttpPost("claims/{claimId:int}/reject")]
        public async Task<IActionResult> RejectClaim(int claimId, [FromBody] RejectMosqueClaimRequest? dto)
        {
            var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var (mosque, error, code) = await _claimService.RejectAsync(claimId, reviewerId, dto?.Reason);
            if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
            return Ok(new
            {
                success = true,
                message = "Claim rejected.",
                mosque,
                status = "REJECTED"
            });
        }

        private static object MapClaimListItem(AdminClaimListItemDto i) => new
        {
            claimId = i.ClaimId,
            claimReference = i.ClaimReference,
            mosqueId = i.MosqueId,
            mosqueName = i.MosqueName,
            city = i.City,
            slug = i.Slug,
            requestedBy = i.ApplicantName,
            applicantUserId = i.ApplicantUserId,
            applicantName = i.ApplicantName,
            applicantEmail = i.ApplicantEmail,
            applicantPhone = i.ApplicantPhone,
            phone = i.ApplicantPhone,
            role = i.Position,
            position = i.Position,
            reason = i.Reason,
            proofDocumentUrl = i.ProofDocumentUrl,
            documents = i.Documents,
            status = i.Status,
            mosqueStatus = i.MosqueStatus,
            submittedDate = i.SubmittedDate,
            submittedAt = i.SubmittedDate,
        };

        private static object MapClaimDetail(AdminClaimDetailDto d) => new
        {
            claimId = d.ClaimId,
            claimReference = d.ClaimReference,
            mosqueId = d.MosqueId,
            mosqueName = d.MosqueName,
            mosqueAddress = d.MosqueAddress,
            mosqueCity = d.City,
            mosquePostcode = d.MosquePostcode,
            mosqueCountry = d.MosqueCountry,
            slug = d.Slug,
            applicant = new
            {
                userId = d.ApplicantUserId,
                fullName = d.ApplicantName,
                email = d.ApplicantEmail,
                phone = d.ApplicantPhone,
                role = d.Position,
            },
            documents = d.Documents,
            proofDocumentUrl = d.ProofDocumentUrl,
            notes = d.Reason,
            status = d.Status,
            mosqueStatus = d.MosqueStatus,
            submittedDate = d.SubmittedDate,
            decidedDate = d.DecidedDate,
            rejectionReason = d.RejectionReason,
        };

        /// <summary>Assign a user as mosque admin (and optional owner).</summary>
        [HttpPost("mosques/{id:int}/assign-admin")]
        public async Task<IActionResult> AssignMosqueAdmin(int id, [FromBody] AssignAdminRequest dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            var user = await _userManager.FindByIdAsync(dto.UserId);
            if (user == null) return NotFound(new ApiMessageResponse { Message = "User not found." });

            if (!await _userManager.IsInRoleAsync(user, Roles.MosqueAdmin))
                await _userManager.AddToRoleAsync(user, Roles.MosqueAdmin);

            user.HomeMosqueId = id;
            await _userManager.UpdateAsync(user);

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

            return Ok(new ApiMessageResponse { Message = $"{user.UserName} assigned to {mosque.Name}." });
        }

        /// <summary>Remove a user's mosque admin assignment for this mosque.</summary>
        [HttpDelete("mosques/{id:int}/admins/{userId}")]
        public async Task<IActionResult> RemoveMosqueAdmin(int id, string userId)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(new ApiMessageResponse { Message = "User not found." });

            if (mosque.OwnerId == userId)
                return BadRequest(new ApiMessageResponse { Message = "Cannot remove the mosque owner. Reassign ownership first." });

            if (user.HomeMosqueId == id)
            {
                user.HomeMosqueId = null;
                await _userManager.UpdateAsync(user);
            }

            if (await _userManager.IsInRoleAsync(user, Roles.MosqueAdmin))
                await _userManager.RemoveFromRoleAsync(user, Roles.MosqueAdmin);

            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            await LogAsync("REMOVE_MOSQUE_ADMIN", userId, "Mosque", id,
                $"Removed {user.UserName} as admin for '{mosque.Name}'");

            return Ok(new ApiMessageResponse { Message = $"{user.UserName} removed from {mosque.Name}." });
        }


        /// <summary>Super admin mosque detail with owner, admins, and pending claim.</summary>
        [HttpGet("mosques/{id:int}/detail")]
        public async Task<IActionResult> GetMosqueDetail(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
            if (mosque == null) return NotFound();

            var users = await _userManager.Users.AsNoTracking().ToListAsync();
            var owner = mosque.OwnerId != null
                ? users.FirstOrDefault(u => u.Id == mosque.OwnerId)
                : null;
            var mosqueAdminIds = await GetMosqueAdminUserIdsAsync();
            var admins = users
                .Where(u => u.HomeMosqueId == id && mosqueAdminIds.Contains(u.Id) && u.Id != mosque.OwnerId)
                .Select(u => new MosquePersonResponse
                {
                    Id = u.Id,
                    Name = u.FullName ?? u.UserName ?? u.Email ?? "User",
                    Email = u.Email ?? u.UserName ?? string.Empty
                })
                .ToList();

            var allMosques = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => !m.IsDeleted).ToListAsync();
            var duplicateFlags = ComputeDuplicateFlags(allMosques);
            duplicateFlags.TryGetValue(id, out var dupReason);

            var pendingClaims = await _claimService.GetClaimsAsync(OwnershipClaimStatus.Pending);
            var pendingClaim = pendingClaims.FirstOrDefault(c => c.MosqueId == id);

            var audit = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .Where(l => l.TargetType == "Mosque" && l.TargetId == id)
                .OrderByDescending(l => l.CreatedAt)
                .Take(10)
                .Select(l => new AuditLogResponse
                {
                    Id = l.Id,
                    Action = l.Action,
                    ActorId = l.ActorId,
                    ActorName = l.ActorName,
                    Description = l.Description,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                mosque,
                owner = owner == null ? null : new MosquePersonResponse
                {
                    Id = owner.Id,
                    Name = owner.FullName ?? owner.UserName ?? owner.Email ?? "Owner",
                    Email = owner.Email ?? owner.UserName ?? string.Empty
                },
                admins,
                userCount = users.Count(u => u.HomeMosqueId == id),
                isDuplicate = dupReason != null,
                duplicateReason = dupReason,
                pendingClaim,
                audit
            });
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

        [HttpGet("role-monitor")]
        public async Task<IActionResult> GetRoleMonitor([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, [FromQuery] int auditLimit = 50)
        {
            var adminRoles = new HashSet<string>
            {
                Roles.SuperAdmin, Roles.MosqueOwner, Roles.MosqueAdmin,
                Roles.PrayerTimesEditor, Roles.Teacher, Roles.Muqaddam, Roles.ContentEditor
            };
            var standardRoles = new HashSet<string> { Roles.Member, Roles.Parent };

            var users = await _userManager.Users.AsNoTracking().ToListAsync();
            var userRoles = new Dictionary<string, IList<string>>();
            int standardAssignments = 0, adminAssignments = 0, unassigned = 0;

            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                userRoles[u.Id] = roles;
                if (roles.Count == 0) { unassigned++; continue; }
                foreach (var r in roles)
                {
                    if (adminRoles.Contains(r)) adminAssignments++;
                    else if (standardRoles.Contains(r)) standardAssignments++;
                }
            }

            var total = users.Count;
            var assigned = total - unassigned;
            var completion = total > 0 ? Math.Round(assigned * 100.0 / total, 1) : 0;

            var topAssignments = users
                .Select(u =>
                {
                    var roles = userRoles[u.Id];
                    var primary = roles.FirstOrDefault(r => adminRoles.Contains(r))
                        ?? roles.FirstOrDefault() ?? "Unassigned";
                    var name = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : u.UserName ?? "User";
                    return new RoleAssignmentRow
                    {
                        UserId = u.Id,
                        Name = name,
                        Initials = BuildInitials(name),
                        PrimaryRole = primary,
                        RoleCount = roles.Count
                    };
                })
                .Where(r => r.RoleCount > 0)
                .OrderByDescending(r => r.RoleCount)
                .ThenBy(r => r.Name)
                .Take(5)
                .Select((r, i) => { r.Rank = i + 1; return r; })
                .ToList();

            var fromDt = from ?? DateTime.UtcNow.AddMonths(-6);
            var toDt = to ?? DateTime.UtcNow;

            var audit = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .Where(l => l.CreatedAt >= fromDt && l.CreatedAt <= toDt.AddDays(1))
                .OrderByDescending(l => l.CreatedAt)
                .Take(auditLimit)
                .Select(l => new AuditLogResponse
                {
                    Id = l.Id,
                    Action = l.Action,
                    ActorId = l.ActorId,
                    ActorName = l.ActorName,
                    TargetType = l.TargetType,
                    TargetId = l.TargetId,
                    Description = l.Description,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(new RoleMonitorResponse
            {
                TotalUsers = total,
                StandardRoleAssignments = standardAssignments,
                AdminRoleAssignments = adminAssignments,
                UnassignedUsers = unassigned,
                AssignmentCompletionPercent = completion,
                TotalRoleTypes = Roles.All.Length,
                Workflow =
                [
                    new RoleWorkflowStep { Label = "Total Users", Value = total },
                    new RoleWorkflowStep { Label = "Unassigned", Value = unassigned },
                    new RoleWorkflowStep { Label = "Standard Roles", Value = standardAssignments },
                    new RoleWorkflowStep { Label = "Admin Roles", Value = adminAssignments },
                    new RoleWorkflowStep { Label = "Assigned Users", Value = assigned }
                ],
                TopAssignments = topAssignments,
                AuditTrail = audit
            });
        }

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

            var combined = platform.Select(p => new AuditLogResponse
            {
                Id = p.Id, Action = p.Action, ActorId = p.ActorId, ActorName = p.ActorName,
                TargetType = p.TargetType, TargetId = p.TargetId,
                Description = p.Description, CreatedAt = p.CreatedAt
            }).ToList();

            combined.AddRange(prayer.Select(p => new AuditLogResponse
            {
                Id = p.Id, Action = p.Action, ActorId = p.ChangedById,
                TargetType = p.TargetType, TargetId = p.TargetId,
                Description = p.ChangeDescription, CreatedAt = p.CreatedAt
            }));

            return Ok(combined.OrderByDescending(x => x.CreatedAt).Take(limit));
        }

        // ---- Platform settings ----

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var configs = await _unitOfWork.Repository<PlatformConfig>().QueryNoTracking().ToListAsync();
            string Get(string key) => configs.FirstOrDefault(c => c.Key == key)?.Value ?? string.Empty;

            return Ok(new PlatformSettingsResponse
            {
                BaAlawiDefault = Get(PlatformConfigKeys.TariqaBaAlawi),
                ShadhiliDefault = Get(PlatformConfigKeys.TariqaShadhili),
                GlobalBanner = Get(PlatformConfigKeys.GlobalBanner),
            });
        }

        [HttpPut("settings/tariqa")]
        public async Task<IActionResult> SaveTariqaMapping([FromBody] SaveTariqaMappingRequest dto)
        {
            await UpsertConfigAsync(PlatformConfigKeys.TariqaBaAlawi, dto.BaAlawiDefault ?? string.Empty);
            await UpsertConfigAsync(PlatformConfigKeys.TariqaShadhili, dto.ShadhiliDefault ?? string.Empty);
            await LogAsync("UPDATE_PLATFORM_SETTINGS", null, "PlatformConfig", null,
                $"Updated tariqa defaults: Ba'Alawi={dto.BaAlawiDefault}, Shadhili={dto.ShadhiliDefault}");
            return Ok(new ApiMessageResponse { Message = "Tariqa mapping saved." });
        }

        [HttpPut("settings/banner")]
        public async Task<IActionResult> SaveGlobalBanner([FromBody] SaveGlobalBannerRequest dto)
        {
            await UpsertConfigAsync(PlatformConfigKeys.GlobalBanner, dto.Text ?? string.Empty);
            await LogAsync("UPDATE_PLATFORM_BANNER", null, "PlatformConfig", null,
                string.IsNullOrWhiteSpace(dto.Text) ? "Cleared global banner." : "Updated global banner.");
            return Ok(new ApiMessageResponse { Message = "Global banner saved." });
        }

        private async Task UpsertConfigAsync(string key, string value)
        {
            var repo = _unitOfWork.Repository<PlatformConfig>();
            var row = await repo.Query().FirstOrDefaultAsync(c => c.Key == key);
            if (row == null)
            {
                repo.Add(new PlatformConfig { Key = key, Value = value });
            }
            else
            {
                row.Value = value;
                row.UpdatedAt = DateTime.UtcNow;
            }
            await _unitOfWork.SaveChangesAsync();
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

        private static Dictionary<int, string> ComputeDuplicateFlags(List<Mosque> mosques)
        {
            var flags = new Dictionary<int, string>();

            foreach (var g in mosques.GroupBy(m => m.Slug.Trim().ToLowerInvariant()).Where(g => g.Count() > 1))
                foreach (var m in g)
                    flags[m.Id] = "Duplicate slug";

            foreach (var g in mosques.GroupBy(m => $"{m.Name.Trim().ToLowerInvariant()}|{m.City.Trim().ToLowerInvariant()}").Where(g => g.Count() > 1))
                foreach (var m in g)
                    if (!flags.ContainsKey(m.Id))
                        flags[m.Id] = "Duplicate name in city";

            foreach (var g in mosques.Where(m => !string.IsNullOrWhiteSpace(m.Postcode))
                .GroupBy(m => m.Postcode.Trim().ToLowerInvariant()).Where(g => g.Count() > 1))
            {
                foreach (var m in g)
                {
                    if (flags.ContainsKey(m.Id)) continue;
                    var similar = g.Count(x => x.Name.Trim().ToLowerInvariant() == m.Name.Trim().ToLowerInvariant());
                    if (similar > 1)
                        flags[m.Id] = "Duplicate postcode & name";
                }
            }

            return flags;
        }
    }
}
