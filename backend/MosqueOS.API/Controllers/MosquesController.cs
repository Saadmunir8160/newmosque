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
    [Route("api/v1/mosques")]
    [ApiController]
    public class MosquesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public MosquesController(
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? city)
        {
            var query = _unitOfWork.Repository<Mosque>().QueryNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(city))
                query = query.Where(m => m.City == city);

            return Ok(await query.OrderBy(m => m.Name).ToListAsync());
        }

        /// <summary>Owner's mosque (by OwnerId) with profile completeness hints.</summary>
        [Authorize(Roles = Roles.MosqueOwner)]
        [HttpGet("my-mosque")]
        public async Task<IActionResult> GetOwnerMosque()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .FirstOrDefaultAsync(m => m.OwnerId == userId);

            if (mosque == null)
                return Ok(new { mosque = (Mosque?)null, profileCompleteness = 0, missingFields = Array.Empty<string>() });

            var fields = new Dictionary<string, string?>
            {
                ["name"] = mosque.Name,
                ["address"] = mosque.Address,
                ["city"] = mosque.City,
                ["postcode"] = mosque.Postcode,
                ["phone"] = mosque.Phone,
                ["email"] = mosque.Email,
                ["description"] = mosque.Description,
                ["logoUrl"] = mosque.LogoUrl,
                ["bannerUrl"] = mosque.BannerUrl,
            };
            var missing = fields.Where(f => string.IsNullOrWhiteSpace(f.Value)).Select(f => f.Key).ToList();
            var completeness = (int)Math.Round((fields.Count - missing.Count) / (double)fields.Count * 100);

            return Ok(new { mosque, profileCompleteness = completeness, missingFields = missing });
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Include(m => m.Settings)
                .FirstOrDefaultAsync(m => m.Slug == slug);

            return mosque == null ? NotFound() : Ok(mosque);
        }

        [Authorize(Roles = Roles.SuperAdmin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Mosque mosque)
        {
            if (await _unitOfWork.Repository<Mosque>().Query().AnyAsync(m => m.Slug == mosque.Slug))
                return Conflict(new { message = "Slug already in use." });

            _unitOfWork.Repository<Mosque>().Add(mosque);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(GetBySlug), new { slug = mosque.Slug }, mosque);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Mosque updated)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            mosque.Name = updated.Name;
            mosque.Address = updated.Address;
            mosque.City = updated.City;
            mosque.Postcode = updated.Postcode;
            mosque.Country = updated.Country;
            mosque.Phone = updated.Phone;
            mosque.Email = updated.Email;
            mosque.Website = updated.Website;
            mosque.FacebookUrl = updated.FacebookUrl;
            mosque.InstagramUrl = updated.InstagramUrl;
            mosque.Description = updated.Description;
            mosque.LogoUrl = updated.LogoUrl;
            mosque.BannerUrl = updated.BannerUrl;
            mosque.MapLocation = updated.MapLocation;
            mosque.Latitude = updated.Latitude;
            mosque.Longitude = updated.Longitude;
            mosque.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(mosque);
        }

        /// <summary>Mosque owner claims an unclaimed listing (manual approval in MVP).</summary>
        [Authorize(Roles = Roles.MosqueOwner)]
        [HttpPost("{id:int}/claim")]
        public async Task<IActionResult> Claim(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var existing = await _unitOfWork.Repository<Mosque>().Query()
                .FirstOrDefaultAsync(m => m.OwnerId == userId && m.Status == MosqueStatus.Claimed);
            if (existing != null)
                return Conflict(new { message = "You already have a pending claim awaiting verification." });

            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();
            if (mosque.Status != MosqueStatus.Unclaimed)
                return Conflict(new { message = "Mosque has already been claimed." });

            mosque.Status = MosqueStatus.Claimed;
            mosque.OwnerId = userId;
            mosque.UpdatedAt = DateTime.UtcNow;

            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.HomeMosqueId = id;
                await _userManager.UpdateAsync(user);
            }

            await _unitOfWork.SaveChangesAsync();

            return Ok(new { message = "Claim submitted. Awaiting super admin verification.", mosque });
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
                return BadRequest(new { message = "Staff management is available after super admin verification (ACTIVE status)." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!User.IsInRole(Roles.SuperAdmin) && mosque.OwnerId != actorId && !User.IsInRole(Roles.MosqueAdmin))
                return Forbid();

            if (role == Roles.SuperAdmin || role == Roles.MosqueOwner)
                return BadRequest(new { message = "Cannot remove this role via staff management." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            await _userManager.RemoveFromRoleAsync(user, role);
            return Ok(new { message = $"Removed {role} from {user.UserName}." });
        }

        [Authorize(Roles = Roles.SuperAdmin)]
        [HttpPost("{id:int}/verify")]
        public async Task<IActionResult> Verify(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            mosque.Status = MosqueStatus.Active;
            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(new { message = "Mosque verified and active." });
        }

        // ---- Module feature flags ----

        [HttpGet("{id:int}/settings")]
        public async Task<IActionResult> GetSettings(int id) =>
            Ok(await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking().Where(s => s.MosqueId == id).ToListAsync());

        [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
        [HttpPut("{id:int}/settings/{moduleKey}")]
        public async Task<IActionResult> SetModuleFlag(int id, string moduleKey, [FromQuery] bool enabled)
        {
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
        public async Task<IActionResult> AssignStaff(int id, [FromBody] AssignStaffDto dto)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();

            if (mosque.Status != MosqueStatus.Active && !User.IsInRole(Roles.SuperAdmin))
                return BadRequest(new { message = "Assign staff after your mosque is verified (ACTIVE status)." });

            var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isSuperAdmin = User.IsInRole(Roles.SuperAdmin);
            if (!isSuperAdmin && mosque.OwnerId != actorId && !User.IsInRole(Roles.MosqueAdmin))
                return Forbid();

            if (dto.Role == Roles.SuperAdmin || !Roles.All.Contains(dto.Role))
                return BadRequest(new { message = "Invalid role for mosque staff." });

            var staffRoles = new[]
            {
                Roles.MosqueAdmin, Roles.PrayerTimesEditor, Roles.Teacher,
                Roles.ContentEditor, Roles.Muqaddam, Roles.Parent, Roles.Member
            };
            if (!staffRoles.Contains(dto.Role))
                return BadRequest(new { message = "Role cannot be assigned at mosque level." });

            var user = await _userManager.FindByEmailAsync(dto.Email)
                ?? await _userManager.FindByNameAsync(dto.Email);
            if (user == null) return NotFound(new { message = "User not found. They must register first." });

            if (!await _roleManager.RoleExistsAsync(dto.Role))
                await _roleManager.CreateAsync(new IdentityRole(dto.Role));

            if (!await _userManager.IsInRoleAsync(user, dto.Role))
                await _userManager.AddToRoleAsync(user, dto.Role);

            if (dto.Role == Roles.MosqueAdmin && user.HomeMosqueId == null)
            {
                user.HomeMosqueId = id;
                await _userManager.UpdateAsync(user);
            }

            return Ok(new { message = $"{dto.Role} assigned to {user.UserName}." });
        }

        public class AssignStaffDto
        {
            public string Email { get; set; } = string.Empty;
            public string Role { get; set; } = string.Empty;
        }
    }
}
