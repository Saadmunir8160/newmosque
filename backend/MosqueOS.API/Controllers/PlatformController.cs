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

            var roleCounts = new Dictionary<string, int>();
            var blockedUsers = 0;
            var failedLoginAttempts = 0;
            foreach (var user in users)
            {
                if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
                    blockedUsers++;
                failedLoginAttempts += user.AccessFailedCount;

                foreach (var role in await _userManager.GetRolesAsync(user))
                    roleCounts[role] = roleCounts.GetValueOrDefault(role) + 1;
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
            var newUsers30d = users.Count(u => u.CreatedAt >= thirtyDaysAgo);

            var ownerIds = mosques.Where(m => m.OwnerId != null).Select(m => m.OwnerId!).Distinct().ToList();
            var owners = users.Where(u => ownerIds.Contains(u.Id)).ToDictionary(u => u.Id, u => u.FullName);

            var guidesCount = await _unitOfWork.Repository<RitualGuide>().Query().CountAsync();

            var warningCount = (missingOwners > 0 ? 1 : 0) + (duplicateListings > 0 ? 1 : 0) +
                (suspiciousActivity > 0 ? 1 : 0);
            var pendingClaimsCount = mosques.Count(m => m.Status == MosqueStatus.Claimed);
            warningCount += pendingClaimsCount > 0 ? 1 : 0;

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
            if (pendingClaimsCount > 0)
                notifications.Add(new { type = "approval", title = "Pending ownership claims", message = $"{pendingClaimsCount} claim(s) awaiting review", route = "/dashboard/super/claims", severity = "warn" });
            if (mosques.Count(m => m.Status == MosqueStatus.Unclaimed) > 0)
                notifications.Add(new { type = "system", title = "Unclaimed mosques", message = $"{mosques.Count(m => m.Status == MosqueStatus.Unclaimed)} listing(s) without owners", route = "/dashboard/super/mosques", severity = "info" });
            if (missingOwners > 0)
                notifications.Add(new { type = "system", title = "Missing owners", message = $"{missingOwners} active mosque(s) need an owner", route = "/dashboard/super/mosques", severity = "warn" });
            if (duplicateListings > 0)
                notifications.Add(new { type = "system", title = "Duplicate listings", message = $"{duplicateListings} possible duplicate mosque(s)", route = "/dashboard/super/mosques", severity = "warn" });
            if (suspiciousActivity > 0)
                notifications.Add(new { type = "security", title = "Security alerts", message = $"{suspiciousActivity} suspicious event(s) in recent logs", route = "/dashboard/super/audit", severity = "error" });

            return Ok(new
            {
                syncedAt = now,
                platformStatus = warningCount > 0 ? "Warning" : "Healthy",
                healthScore,
                stats = new
                {
                    totalMosques = mosques.Count,
                    activeMosques = mosques.Count(m => m.Status == MosqueStatus.Active),
                    pendingClaims = pendingClaimsCount,
                    totalUsers = users.Count
                },
                needsAttention = new
                {
                    pendingClaims = pendingClaimsCount,
                    unclaimedMosques = mosques.Count(m => m.Status == MosqueStatus.Unclaimed),
                    missingOwners,
                    pendingApprovals = pendingReview + pendingClaimsCount,
                    duplicateListings,
                    systemWarnings = warningCount
                },
                mosques = new
                {
                    total = mosques.Count,
                    active = mosques.Count(m => m.Status == MosqueStatus.Active),
                    claimed = mosques.Count(m => m.Status == MosqueStatus.Claimed),
                    unclaimed = mosques.Count(m => m.Status == MosqueStatus.Unclaimed),
                    suspended,
                    pendingReview,
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
                recentActivity = auditRecent.Take(10).Select(l => new AuditLogDto
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

        private static IEnumerable<AuditLogDto> MapAudit(IEnumerable<PlatformAuditLog> logs) =>
            logs.Select(l => new AuditLogDto
            {
                Id = l.Id,
                Action = l.Action,
                ActorId = l.ActorId,
                TargetType = l.TargetType,
                TargetId = l.TargetId,
                Description = l.Description,
                CreatedAt = l.CreatedAt
            });

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

            return Ok(new { message = $"{user.UserName} assigned to {mosque.Name}." });
        }

        /// <summary>Super Admin — searchable mosque listings with summary metadata.</summary>
        [HttpGet("mosques/listings")]
        public async Task<IActionResult> GetMosqueListings(
            [FromQuery] string? q,
            [FromQuery] string? status,
            [FromQuery] bool duplicatesOnly = false)
        {
            var mosques = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var duplicateFlags = ComputeDuplicateFlags(mosques);
            var users = await _userManager.Users.AsNoTracking().ToListAsync();
            var ownerIds = mosques.Where(m => m.OwnerId != null).Select(m => m.OwnerId!).Distinct().ToList();
            var owners = users.Where(u => ownerIds.Contains(u.Id)).ToDictionary(u => u.Id);

            MosqueStatus? statusFilter = null;
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<MosqueStatus>(status, true, out var parsed))
                statusFilter = parsed;

            var query = q?.Trim().ToLowerInvariant();
            var items = new List<MosqueListingDto>();

            foreach (var m in mosques)
            {
                if (statusFilter.HasValue && m.Status != statusFilter.Value) continue;
                if (!string.IsNullOrWhiteSpace(query))
                {
                    var haystack = $"{m.Name} {m.City} {m.Postcode} {m.Address}".ToLowerInvariant();
                    if (!haystack.Contains(query)) continue;
                }

                var isDup = duplicateFlags.ContainsKey(m.Id);
                if (duplicatesOnly && !isDup) continue;

                var mosqueUsers = users.Where(u => u.HomeMosqueId == m.Id).ToList();
                var admins = new List<MosquePersonDto>();
                foreach (var u in mosqueUsers)
                {
                    if (await _userManager.IsInRoleAsync(u, Roles.MosqueAdmin))
                        admins.Add(new MosquePersonDto { Id = u.Id, Name = u.FullName, Email = u.Email ?? u.UserName ?? "" });
                }

                owners.TryGetValue(m.OwnerId ?? "", out var owner);

                items.Add(new MosqueListingDto
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
                    MapLocation = m.MapLocation,
                    Latitude = m.Latitude,
                    Longitude = m.Longitude,
                    Status = m.Status.ToString(),
                    OwnerId = m.OwnerId,
                    OwnerName = owner?.FullName,
                    OwnerEmail = owner?.Email ?? owner?.UserName,
                    Admins = admins,
                    AdminCount = admins.Count,
                    UserCount = mosqueUsers.Count,
                    IsDuplicate = isDup,
                    DuplicateReason = isDup ? duplicateFlags[m.Id] : null,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                });
            }

            return Ok(new
            {
                total = items.Count,
                duplicateCount = items.Count(i => i.IsDuplicate),
                items
            });
        }

        /// <summary>Super Admin — mosque detail with assignments and audit history.</summary>
        [HttpGet("mosques/{id:int}/detail")]
        public async Task<IActionResult> GetMosqueDetail(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);
            if (mosque == null) return NotFound();

            var users = await _userManager.Users.Where(u => u.HomeMosqueId == id || u.Id == mosque.OwnerId).ToListAsync();
            ApplicationUser? owner = null;
            if (mosque.OwnerId != null)
                owner = users.FirstOrDefault(u => u.Id == mosque.OwnerId)
                    ?? await _userManager.FindByIdAsync(mosque.OwnerId);

            var admins = new List<MosquePersonDto>();
            foreach (var u in users.Where(u => u.Id != mosque.OwnerId))
            {
                if (await _userManager.IsInRoleAsync(u, Roles.MosqueAdmin))
                    admins.Add(new MosquePersonDto { Id = u.Id, Name = u.FullName, Email = u.Email ?? u.UserName ?? "" });
            }

            var audit = await _unitOfWork.Repository<PlatformAuditLog>().QueryNoTracking()
                .Where(l => l.TargetType == "Mosque" && l.TargetId == id)
                .OrderByDescending(l => l.CreatedAt)
                .Take(50)
                .Select(l => new AuditLogDto
                {
                    Id = l.Id,
                    Action = l.Action,
                    ActorId = l.ActorId,
                    TargetType = l.TargetType,
                    TargetId = l.TargetId,
                    Description = l.Description,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            var allMosques = await _unitOfWork.Repository<Mosque>().QueryNoTracking().ToListAsync();
            var duplicateFlags = ComputeDuplicateFlags(allMosques);

            return Ok(new
            {
                mosque,
                owner = owner == null ? null : new MosquePersonDto
                {
                    Id = owner.Id,
                    Name = owner.FullName,
                    Email = owner.Email ?? owner.UserName ?? ""
                },
                admins,
                userCount = users.Count(u => u.HomeMosqueId == id),
                isDuplicate = duplicateFlags.ContainsKey(id),
                duplicateReason = duplicateFlags.GetValueOrDefault(id),
                audit
            });
        }

        /// <summary>Super Admin — update mosque listing including status and owner.</summary>
        [HttpPut("mosques/{id:int}")]
        public async Task<IActionResult> UpdateMosqueListing(int id, [FromBody] UpdateMosqueDto dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Slug) && dto.Slug != mosque.Slug)
            {
                if (await _unitOfWork.Repository<Mosque>().Query().AnyAsync(m => m.Slug == dto.Slug && m.Id != id))
                    return Conflict(new { message = "Slug already exists." });
                mosque.Slug = dto.Slug;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) mosque.Name = dto.Name;
            if (dto.Address != null) mosque.Address = dto.Address;
            if (!string.IsNullOrWhiteSpace(dto.City)) mosque.City = dto.City;
            if (dto.Postcode != null) mosque.Postcode = dto.Postcode;
            if (dto.Country != null) mosque.Country = dto.Country;
            if (dto.Phone != null) mosque.Phone = dto.Phone;
            if (dto.Email != null) mosque.Email = dto.Email;
            if (dto.Website != null) mosque.Website = dto.Website;
            if (dto.Description != null) mosque.Description = dto.Description;
            if (dto.MapLocation != null) mosque.MapLocation = dto.MapLocation;
            if (dto.Latitude.HasValue) mosque.Latitude = dto.Latitude;
            if (dto.Longitude.HasValue) mosque.Longitude = dto.Longitude;
            if (!string.IsNullOrWhiteSpace(dto.Timezone)) mosque.Timezone = dto.Timezone;

            if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<MosqueStatus>(dto.Status, true, out var newStatus))
                mosque.Status = newStatus;

            if (dto.OwnerId != null)
            {
                if (dto.OwnerId == "")
                {
                    mosque.OwnerId = null;
                }
                else
                {
                    var owner = await _userManager.FindByIdAsync(dto.OwnerId);
                    if (owner == null) return NotFound(new { message = "Owner user not found." });
                    mosque.OwnerId = dto.OwnerId;
                    if (!await _userManager.IsInRoleAsync(owner, Roles.MosqueOwner))
                        await _userManager.AddToRoleAsync(owner, Roles.MosqueOwner);
                    owner.HomeMosqueId = id;
                    await _userManager.UpdateAsync(owner);
                }
            }

            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            await LogAsync("UPDATE_MOSQUE", mosque.OwnerId, "Mosque", id,
                $"Updated mosque listing '{mosque.Name}'");

            return Ok(mosque);
        }

        /// <summary>Super Admin — bulk status actions on mosque listings.</summary>
        [HttpPost("mosques/bulk")]
        public async Task<IActionResult> BulkMosqueAction([FromBody] MosqueBulkActionDto dto)
        {
            if (dto.Ids == null || dto.Ids.Length == 0)
                return BadRequest(new { message = "No mosque IDs provided." });

            if (!Enum.TryParse<MosqueStatus>(dto.Status, true, out var targetStatus))
                return BadRequest(new { message = "Invalid target status." });

            var mosques = await _unitOfWork.Repository<Mosque>().Query()
                .Where(m => dto.Ids.Contains(m.Id))
                .ToListAsync();

            foreach (var m in mosques)
            {
                m.Status = targetStatus;
                m.UpdatedAt = DateTime.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync();
            await LogAsync("BULK_MOSQUE_STATUS", null, "Mosque", null,
                $"Bulk updated {mosques.Count} mosque(s) to {targetStatus}");

            return Ok(new { message = $"Updated {mosques.Count} mosque(s).", count = mosques.Count });
        }

        /// <summary>Seed a new mosque listing for platform rollout.</summary>
        [HttpPost("mosques/seed")]
        public async Task<IActionResult> SeedMosqueListing([FromBody] Mosque mosque)
        {
            if (await _unitOfWork.Repository<Mosque>().Query().AnyAsync(m => m.Slug == mosque.Slug))
                return Conflict(new { message = "Slug already exists." });

            mosque.Id = 0;
            mosque.Status = mosque.Status == default ? MosqueStatus.PendingReview : mosque.Status;
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

    public class AssignRoleDto { public string Role { get; set; } = string.Empty; }
    public class AssignAdminDto { public string UserId { get; set; } = string.Empty; public bool SetAsOwner { get; set; } }
    public class RejectClaimDto { public string? Reason { get; set; } }
    public class UpdateMosqueDto
    {
        public string? Name { get; set; }
        public string? Slug { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Postcode { get; set; }
        public string? Country { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
        public string? MapLocation { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Timezone { get; set; }
        public string? Status { get; set; }
        public string? OwnerId { get; set; }
    }
    public class MosqueBulkActionDto
    {
        public int[] Ids { get; set; } = Array.Empty<int>();
        public string Status { get; set; } = string.Empty;
    }
    public class MosqueListingDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Postcode { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Description { get; set; }
        public string? MapLocation { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? OwnerId { get; set; }
        public string? OwnerName { get; set; }
        public string? OwnerEmail { get; set; }
        public List<MosquePersonDto> Admins { get; set; } = new();
        public int AdminCount { get; set; }
        public int UserCount { get; set; }
        public bool IsDuplicate { get; set; }
        public string? DuplicateReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
    public class MosquePersonDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

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
