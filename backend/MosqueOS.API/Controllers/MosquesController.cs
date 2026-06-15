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
            mosque.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(mosque);
        }

        /// <summary>Mosque owner claims an unclaimed listing (manual approval in MVP).</summary>
        [Authorize]
        [HttpPost("{id:int}/claim")]
        public async Task<IActionResult> Claim(int id)
        {
            var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(id);
            if (mosque == null) return NotFound();
            if (mosque.Status != MosqueStatus.Unclaimed)
                return Conflict(new { message = "Mosque has already been claimed." });

            mosque.Status = MosqueStatus.Claimed;
            mosque.OwnerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            mosque.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { message = "Claim submitted. Awaiting super admin verification." });
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
