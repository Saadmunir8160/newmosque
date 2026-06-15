using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtTokenService _jwt;

        public AuthController(UserManager<ApplicationUser> userManager, IJwtTokenService jwt)
        {
            _userManager = userManager;
            _jwt = jwt;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            var existing = await _userManager.FindByNameAsync(model.Username);
            if (existing != null)
                return Conflict(new { message = "Username already exists." });

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                FullName = model.FullName,
                SecurityStamp = Guid.NewGuid().ToString()
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

            // Self-registration always gets the Member role; admins assign elevated roles.
            await _userManager.AddToRoleAsync(user, Roles.Member);

            return Ok(new { message = "Registration successful." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var user = await _userManager.FindByNameAsync(model.Username);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                var userRoles = await _userManager.GetRolesAsync(user);
                var (token, expiration) = _jwt.CreateToken(user, userRoles);

                return Ok(new
                {
                    token,
                    expiration,
                    username = user.UserName,
                    fullName = user.FullName,
                    roles = userRoles
                });
            }
            return Unauthorized();
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new
            {
                user.Id,
                user.UserName,
                user.Email,
                user.FullName,
                Tariqa = user.Tariqa.ToString(),
                Level = user.Level.ToString(),
                DisplayPreference = user.DisplayPreference.ToString(),
                WirdMode = user.WirdMode.ToString(),
                user.HomeMosqueId,
                user.SearchRadiusKm,
                user.Interests,
                Roles = roles
            });
        }

        [Authorize]
        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] PreferencesDto model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (model.Tariqa.HasValue) user.Tariqa = model.Tariqa.Value;
            if (model.Level.HasValue) user.Level = model.Level.Value;
            if (model.DisplayPreference.HasValue) user.DisplayPreference = model.DisplayPreference.Value;
            if (model.WirdMode.HasValue) user.WirdMode = model.WirdMode.Value;
            if (model.HomeMosqueId.HasValue) user.HomeMosqueId = model.HomeMosqueId.Value;
            if (model.SearchRadiusKm.HasValue) user.SearchRadiusKm = model.SearchRadiusKm.Value;
            if (model.Interests != null) user.Interests = model.Interests;
            if (model.FullName != null) user.FullName = model.FullName;

            await _userManager.UpdateAsync(user);
            return Ok(new { message = "Preferences updated." });
        }
    }

    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class PreferencesDto
    {
        public string? FullName { get; set; }
        public Tariqa? Tariqa { get; set; }
        public UserLevel? Level { get; set; }
        public DisplayPreference? DisplayPreference { get; set; }
        public WirdMode? WirdMode { get; set; }
        public int? HomeMosqueId { get; set; }
        public int? SearchRadiusKm { get; set; }
        public string? Interests { get; set; }
    }
}
