using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques")]
    [ApiController]
    public class MosquesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly MosqueAccessService _mosqueAccess;
        private readonly SlugService _slugService;
        private readonly MosqueModuleSeedService _moduleSeed;
        private readonly OwnershipClaimService _claimService;
        private readonly IWebHostEnvironment _env;

        public MosquesController(
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            MosqueAccessService mosqueAccess,
            SlugService slugService,
            MosqueModuleSeedService moduleSeed,
            OwnershipClaimService claimService,
            IWebHostEnvironment env)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _roleManager = roleManager;
            _mosqueAccess = mosqueAccess;
            _slugService = slugService;
            _moduleSeed = moduleSeed;
            _claimService = claimService;
            _env = env;
        }

        /// <summary>Public mosque directory — only registered (Active) and Unclaimed listings.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? city,
            [FromQuery] string? name,
            [FromQuery] MosqueStatus? status,
            [FromQuery] bool adminList = false)
        {
            var query = _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => !m.IsDeleted);

            if (adminList)
            {
                if (User.Identity?.IsAuthenticated != true || !User.IsInRole(Roles.SuperAdmin))
                    return Forbid();
            }
            else
            {
                query = query.Where(m => m.Status == MosqueStatus.Active);
            }

            if (!string.IsNullOrWhiteSpace(city))
                query = query.Where(m => m.City == city);

            if (!string.IsNullOrWhiteSpace(name))
            {
                var term = name.Trim();
                query = query.Where(m => m.Name.Contains(term));
            }

            if (status.HasValue)
                query = query.Where(m => m.Status == status.Value);

            return Ok(await query.OrderBy(m => m.Name).ToListAsync());
        }

        /// <summary>All mosques owned by the current user.</summary>
        [Authorize(Roles = Roles.MosqueOwner + "," + Roles.MosqueAdmin)]
        [HttpGet("my-mosques")]
        public async Task<IActionResult> GetMyMosques()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var mosques = await _mosqueAccess.GetOwnedMosquesAsync(userId);

            var result = mosques.Select(m =>
            {
                var (completeness, _) = MosqueProfileCompleteness.Calculate(m);
                return new
                {
                    m.Id,
                    m.Name,
                    m.Slug,
                    m.City,
                    status = m.Status.ToString(),
                    profileCompleteness = completeness
                };
            });
            return Ok(result);
        }

        /// <summary>Current user's ownership claims.</summary>
        [Authorize]
        [HttpGet("my-claims")]
        public async Task<IActionResult> GetMyClaims()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            return Ok(await _claimService.GetMyClaimsAsync(userId));
        }

        /// <summary>Anonymous public profile by slug.</summary>
        [AllowAnonymous]
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetPublicBySlug(string slug)
        {
            if (int.TryParse(slug, out _))
                return NotFound();

            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Slug == slug && !m.IsDeleted);

            if (mosque == null) return NotFound();

            if (!MosquePublicVisibility.IsPubliclyVisible(mosque.Status))
                return NotFound();

            if (!mosque.PublicProfileEnabled)
                return NotFound();

            return Ok(MosquePublicDto.FromEntity(mosque));
        }

        /// <summary>Public leadership list.</summary>
        [AllowAnonymous]
        [HttpGet("{id:int}/public/leadership")]
        public async Task<IActionResult> GetPublicLeadership(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
            if (mosque == null || mosque.Status is not (MosqueStatus.Unclaimed or MosqueStatus.Active))
                return NotFound();

            var profile = MosqueProfileJsonHelper.Parse(mosque.ProfileJson);
            return Ok(profile.Leadership);
        }

        /// <summary>Public stats for mosque profile.</summary>
        [AllowAnonymous]
        [HttpGet("{id:int}/public/stats")]
        public async Task<IActionResult> GetPublicStats(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
            if (mosque == null || mosque.Status is not (MosqueStatus.Unclaimed or MosqueStatus.Active))
                return NotFound();

            var profile = MosqueProfileJsonHelper.Parse(mosque.ProfileJson);
            var members = profile.Stats?.Members
                ?? await _userManager.Users.CountAsync(u => u.HomeMosqueId == id);

            return Ok(new
            {
                members,
                establishedYear = mosque.EstablishedYear,
                capacity = mosque.Capacity
            });
        }

        /// <summary>Submit ownership claim for an unclaimed mosque.</summary>
        [Authorize]
        [HttpPost("{id:int}/claim")]
        [RequestSizeLimit(52_428_800)]
        public async Task<IActionResult> SubmitClaim(int id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized(new ApiMessageResponse { Message = "You must be logged in to submit a claim." });
            if (!user.EmailConfirmed)
                return StatusCode(403, new ApiMessageResponse { Message = "Please verify your email before submitting a claim." });

            var parsed = await ClaimFormHelper.ParseAsync(Request);
            if (parsed == null)
                return BadRequest(new ApiMessageResponse { Message = "Invalid claim payload." });

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var (result, error, code) = await _claimService.SubmitClaimAsync(id, userId, parsed.Dto, parsed.Documents);
            if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
            return Ok(result);
        }

        /// <summary>Member submits a new mosque listing for review.</summary>
        [Authorize(Roles = Roles.Member + "," + Roles.MosqueOwner + "," + Roles.MosqueAdmin)]
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitListing([FromBody] MosqueCreateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var (result, error, code) = await _claimService.SubmitNewListingAsync(userId, dto);
            if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
            return Ok(result);
        }

        /// <summary>User's assigned or home mosque (staff, member, parent).</summary>
        [Authorize(Roles = Roles.MosqueOwner + "," + Roles.MosqueAdmin + "," + Roles.PrayerTimesEditor + "," + Roles.Teacher + "," + Roles.Member + "," + Roles.Parent)]
        [HttpGet("my-mosque")]
        public async Task<IActionResult> GetOwnerMosque([FromQuery] int? mosqueId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            Mosque? mosque = null;

            if (User.IsInRole(Roles.MosqueOwner) || User.IsInRole(Roles.MosqueAdmin))
            {
                if (mosqueId.HasValue)
                {
                    if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId.Value))
                        return Forbid();

                    mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                        .FirstOrDefaultAsync(m => m.Id == mosqueId.Value && !m.IsDeleted);
                }

                if (mosque == null)
                {
                    var owned = await _mosqueAccess.GetOwnedMosquesAsync(userId);
                    mosque = owned.FirstOrDefault();
                }
            }

            if (mosque == null && !User.IsInRole(Roles.MosqueAdmin))
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user?.HomeMosqueId != null)
                {
                    mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                        .FirstOrDefaultAsync(m => m.Id == user.HomeMosqueId);
                }
            }

            if (mosque == null)
                return Ok(new OwnerMosqueResponse
                {
                    Mosque = null,
                    ProfileCompleteness = 0,
                    MissingFields = Array.Empty<string>()
                });

            var (completeness, missing) = MosqueProfileCompleteness.Calculate(mosque);

            return Ok(new OwnerMosqueResponse
            {
                Mosque = mosque,
                ProfileCompleteness = completeness,
                MissingFields = missing
            });
        }

        /// <summary>Get mosque by numeric id (admin / owner).</summary>
        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins + "," + Roles.MosqueOwner)]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

            if (mosque == null) return NotFound();

            if (!User.IsInRole(Roles.SuperAdmin))
            {
                if (!await _mosqueAccess.CanAccessMosqueAsync(User, id))
                    return Forbid();
            }

            return Ok(MosqueAdminProfileDto.FromEntity(mosque));
        }

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins + "," + Roles.MosqueOwner)]
        [HttpGet("slug/{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Slug == slug && !m.IsDeleted);

            if (mosque == null) return NotFound();

            if (!User.IsInRole(Roles.SuperAdmin))
            {
                if (!await _mosqueAccess.CanAccessMosqueAsync(User, mosque.Id))
                    return Forbid();
            }

            return Ok(MosqueAdminProfileDto.FromEntity(mosque));
        }

        [Authorize(Roles = Roles.SuperAdmin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MosqueCreateDto dto)
        {
            var errors = MosqueValidation.ValidateCreate(dto);
            if (errors.Count > 0)
                return BadRequest(new ApiMessageResponse { Message = string.Join(" ", errors) });

            var slug = string.IsNullOrWhiteSpace(dto.Slug)
                ? await _slugService.GenerateUniqueAsync(dto.Name)
                : await _slugService.GenerateUniqueAsync(dto.Slug);

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
                Status = dto.Status == default ? MosqueStatus.Unclaimed : dto.Status,
                Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? "Europe/London" : dto.Timezone.Trim()
            };

            _unitOfWork.Repository<Mosque>().Add(mosque);
            await _unitOfWork.SaveChangesAsync();
            await _moduleSeed.SeedAsync(mosque.Id);

            await LogMosqueAuditAsync("MOSQUE_CREATED", User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system",
                mosque.Id, $"Super admin created mosque '{mosque.Name}' in {mosque.City}.");
            return CreatedAtAction(nameof(GetById), new { id = mosque.Id }, mosque);
        }

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins + "," + Roles.MosqueOwner)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] MosqueUpdateDto dto)
        {
            var errors = MosqueValidation.ValidateUpdate(dto);
            if (errors.Count > 0)
                return BadRequest(new ApiMessageResponse { Message = string.Join(" ", errors) });

            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null || mosque.IsDeleted) return NotFound();

            if (!await _mosqueAccess.CanEditMosqueAsync(User, mosque))
                return Forbid();

            MosqueProfileFieldMapper.ApplyUpdate(mosque, dto);

            await _unitOfWork.SaveChangesAsync();

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            await LogMosqueAuditAsync("Profile Updated", actorId, mosque.Id,
                $"Mosque profile updated for '{mosque.Name}'.");

            return Ok(MosqueAdminProfileDto.FromEntity(mosque));
        }

        [Authorize(Roles = Roles.SuperAdmin)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            if (mosque.IsDeleted)
                return Ok(new ApiMessageResponse { Message = "Mosque already archived." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            mosque.DeletedById = actorId;
            mosque.Status = MosqueStatus.Archived;
            mosque.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Repository<Mosque>().Remove(mosque);
            await _unitOfWork.SaveChangesAsync();

            await LogMosqueAuditAsync("MOSQUE_DELETED", actorId, id,
                $"Soft-deleted mosque '{mosque.Name}'");
            return Ok(new ApiMessageResponse { Message = "Mosque archived (soft delete)." });
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/upload-image")]
        [RequestSizeLimit(10_485_760)]
        public async Task<IActionResult> UploadImage(int id, IFormFile file, [FromQuery] string field = "logo")
        {
            if (file == null || file.Length == 0)
                return BadRequest(new ApiMessageResponse { Message = "No file uploaded." });

            if (field is not ("logo" or "banner"))
                return BadRequest(new ApiMessageResponse { Message = "Field must be 'logo' or 'banner'." });

            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, id) is { } denied) return denied;

            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null || mosque.IsDeleted) return NotFound();

            if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new ApiMessageResponse { Message = "Only image files are allowed." });

            var uploadsRoot = Path.Combine(
                _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
                "uploads", "mosques", id.ToString());
            Directory.CreateDirectory(uploadsRoot);

            var ext = Path.GetExtension(file.FileName);
            var storedName = $"{field}-{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, storedName);

            await using (var stream = System.IO.File.Create(fullPath))
                await file.CopyToAsync(stream);

            var url = $"/uploads/mosques/{id}/{storedName}";
            if (field == "logo") mosque.LogoUrl = url;
            else mosque.BannerUrl = url;
            mosque.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(new MosqueUploadResponse { Url = url, Field = field });
        }

        /// <summary>Staff linked to this mosque (home mosque + roles).</summary>
        [Authorize(Roles = Roles.MosqueManagers)]
        [HttpGet("{id:int}/staff")]
        public async Task<IActionResult> GetStaff(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isSuperAdmin = User.IsInRole(Roles.SuperAdmin);
            if (!isSuperAdmin && mosque.OwnerId != actorId && !User.IsInRole(Roles.MosqueAdmin))
                return Forbid();

            var users = await _userManager.Users.Where(u => u.HomeMosqueId == id).ToListAsync();
            var staffRoles = new[]
            {
                Roles.MosqueAdmin, Roles.PrayerTimesEditor, Roles.Teacher,
                Roles.ContentEditor, Roles.Muqaddam
            };

            var result = new List<object>();
            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                var mosqueRoles = roles.Where(r => staffRoles.Contains(r)).ToList();
                if (mosqueRoles.Count == 0 && u.Id == mosque.OwnerId) continue;
                result.Add(new
                {
                    u.Id,
                    u.UserName,
                    u.Email,
                    u.FullName,
                    Roles = mosqueRoles
                });
            }

            return Ok(result);
        }

        /// <summary>Remove a staff role from a user at this mosque.</summary>
        [Authorize(Roles = Roles.MosqueOwner + "," + Roles.MosqueAdmin + "," + Roles.SuperAdmin)]
        [HttpDelete("{id:int}/staff")]
        public async Task<IActionResult> RemoveStaff(int id, [FromQuery] string userId, [FromQuery] string role)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            if (mosque.Status != MosqueStatus.Active && !User.IsInRole(Roles.SuperAdmin))
                return BadRequest(new ApiMessageResponse { Message = "Staff management is available after super admin verification (ACTIVE status)." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!User.IsInRole(Roles.SuperAdmin) && mosque.OwnerId != actorId && !User.IsInRole(Roles.MosqueAdmin))
                return Forbid();

            if (role == Roles.SuperAdmin || role == Roles.MosqueOwner)
                return BadRequest(new ApiMessageResponse { Message = "Cannot remove this role via staff management." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            await _userManager.RemoveFromRoleAsync(user, role);
            return Ok(new ApiMessageResponse { Message = $"Removed {role} from {user.UserName}." });
        }

        // ---- Module feature flags ----

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpGet("{id:int}/settings")]
        public async Task<IActionResult> GetSettings(int id)
        {
            if (!User.IsInRole(Roles.SuperAdmin))
            {
                if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, id) is { } denied)
                    return denied;
            }

            return Ok(await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking().Where(s => s.MosqueId == id).ToListAsync());
        }

        /// <summary>Feature flags alias (same as settings).</summary>
        [HttpGet("{id:int}/features")]
        public Task<IActionResult> GetFeatures(int id) => GetSettings(id);

        /// <summary>Module feature flags (Step 6/7 spec alias).</summary>
        [HttpGet("{id:int}/modules")]
        public Task<IActionResult> GetModules(int id) => GetSettings(id);

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpPut("{id:int}/settings")]
        public Task<IActionResult> PutSettings(int id, [FromBody] UpdateMosqueFeaturesRequest dto) =>
            UpdateFeatures(id, dto);

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpPut("{id:int}/modules")]
        public async Task<IActionResult> PutModules(int id, [FromBody] List<MosqueModuleUpdateDto> modules)
        {
            var dto = new UpdateMosqueFeaturesRequest
            {
                Modules = modules.Select(m => new MosqueFeatureToggle
                {
                    ModuleKey = m.ModuleKey,
                    IsEnabled = m.Enabled
                }).ToList()
            };
            return await UpdateFeatures(id, dto);
        }

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpPost("{id:int}/features")]
        public async Task<IActionResult> UpdateFeatures(int id, [FromBody] UpdateMosqueFeaturesRequest dto)
        {
            if (dto.Modules == null || dto.Modules.Count == 0)
                return BadRequest(new ApiMessageResponse { Message = "At least one module toggle is required." });

            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, id) is { } denied)
                return denied;

            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null || mosque.IsDeleted) return NotFound();
            if (!User.IsInRole(Roles.SuperAdmin) && mosque.Status != MosqueStatus.Active)
                return BadRequest(new ApiMessageResponse { Message = "Module settings are available only for active mosques." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var changes = new List<string>();

            foreach (var toggle in dto.Modules)
            {
                if (string.IsNullOrWhiteSpace(toggle.ModuleKey)) continue;
                var setting = await _unitOfWork.Repository<MosqueSetting>().Query()
                    .FirstOrDefaultAsync(s => s.MosqueId == id && s.ModuleKey == toggle.ModuleKey);

                if (setting == null)
                {
                    setting = new MosqueSetting { MosqueId = id, ModuleKey = toggle.ModuleKey.Trim(), IsEnabled = toggle.IsEnabled };
                    _unitOfWork.Repository<MosqueSetting>().Add(setting);
                    changes.Add($"{toggle.ModuleKey}={(toggle.IsEnabled ? "enabled" : "disabled")}");
                }
                else if (setting.IsEnabled != toggle.IsEnabled)
                {
                    setting.IsEnabled = toggle.IsEnabled;
                    setting.UpdatedAt = DateTime.UtcNow;
                    changes.Add($"{toggle.ModuleKey}={(toggle.IsEnabled ? "enabled" : "disabled")}");
                }
            }

            await _unitOfWork.SaveChangesAsync();

            if (changes.Count > 0)
            {
                await LogMosqueAuditAsync("Module Settings Updated", actorId, id,
                    $"Updated modules for '{mosque.Name}': {string.Join(", ", changes)}.");
            }

            return Ok(await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking().Where(s => s.MosqueId == id).ToListAsync());
        }

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpPut("{id:int}/settings/{moduleKey}")]
        public async Task<IActionResult> SetModuleFlag(int id, string moduleKey, [FromQuery] bool enabled)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, id) is { } denied) return denied;
            var setting = await _unitOfWork.Repository<MosqueSetting>().Query()
                .FirstOrDefaultAsync(s => s.MosqueId == id && s.ModuleKey == moduleKey);

            if (setting == null)
            {
                setting = new MosqueSetting { MosqueId = id, ModuleKey = moduleKey, IsEnabled = enabled };
                _unitOfWork.Repository<MosqueSetting>().Add(setting);
            }
            else
            {
                setting.IsEnabled = enabled;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync();
            return Ok(setting);
        }

        /// <summary>Mosque owner/admin appoints staff roles (Mosque Admin, Teacher, etc.).</summary>
        [Authorize(Roles = Roles.MosqueManagers)]
        [HttpPost("{id:int}/assign-staff")]
        public async Task<IActionResult> AssignStaff(int id, [FromBody] AssignStaffRequest dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            if (mosque.Status != MosqueStatus.Active && !User.IsInRole(Roles.SuperAdmin))
                return BadRequest(new ApiMessageResponse { Message = "Assign staff after your mosque is verified (ACTIVE status)." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isSuperAdmin = User.IsInRole(Roles.SuperAdmin);
            if (!isSuperAdmin && mosque.OwnerId != actorId && !User.IsInRole(Roles.MosqueAdmin))
                return Forbid();

            if (dto.Role == Roles.SuperAdmin || !Roles.All.Contains(dto.Role))
                return BadRequest(new ApiMessageResponse { Message = "Invalid role for mosque staff." });

            var staffRoles = new[]
            {
                Roles.MosqueAdmin, Roles.PrayerTimesEditor, Roles.Teacher,
                Roles.ContentEditor, Roles.Muqaddam, Roles.Parent, Roles.Member
            };
            if (!staffRoles.Contains(dto.Role))
                return BadRequest(new ApiMessageResponse { Message = "Role cannot be assigned at mosque level." });

            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? await _userManager.FindByNameAsync(dto.Email);
            if (user == null) return NotFound(new ApiMessageResponse { Message = "User not found. They must register first." });

            if (!await _roleManager.RoleExistsAsync(dto.Role))
                await _roleManager.CreateAsync(new IdentityRole(dto.Role));

            if (!await _userManager.IsInRoleAsync(user, dto.Role))
                await _userManager.AddToRoleAsync(user, dto.Role);

            if (dto.Role == Roles.MosqueAdmin && user.HomeMosqueId == null)
            {
                user.HomeMosqueId = id;
                await _userManager.UpdateAsync(user);
            }

            return Ok(new ApiMessageResponse { Message = $"{dto.Role} assigned to {user.UserName}." });
        }

        private async Task LogMosqueAuditAsync(string action, string actorId, int mosqueId, string description)
        {
            var actor = await _userManager.FindByIdAsync(actorId);
            _unitOfWork.Repository<PlatformAuditLog>().Add(new PlatformAuditLog
            {
                Action = action,
                ActorId = actorId,
                ActorName = actor?.UserName,
                TargetType = "Mosque",
                TargetId = mosqueId,
                Description = description
            });
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
