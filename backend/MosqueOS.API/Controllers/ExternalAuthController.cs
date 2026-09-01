using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/auth")]
    [ApiController]
    public class ExternalAuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtTokenService _jwt;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        public ExternalAuthController(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            IJwtTokenService jwt,
            IConfiguration configuration,
            IWebHostEnvironment environment)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _jwt = jwt;
            _configuration = configuration;
            _environment = environment;
        }

        [HttpGet("external/providers")]
        public IActionResult GetProviders() => Ok(new
        {
            google = IsGoogleAvailable(),
            facebook = IsFacebookAvailable(),
            devMode = IsDevSocialEnabled()
        });

        [HttpGet("external/{provider}")]
        public async Task<IActionResult> ExternalLogin(string provider)
        {
            if (!IsSupportedProvider(provider))
                return BadRequest(new { message = "Unknown provider." });

            var scheme = ResolveOAuthScheme(provider);
            if (scheme != null)
            {
                var redirectUrl = Url.Action(nameof(ExternalCallback), values: new { provider })!;
                var props = _signInManager.ConfigureExternalAuthenticationProperties(scheme, redirectUrl);
                return Challenge(props, scheme);
            }

            if (IsDevSocialEnabled())
                return await DevSocialLoginAsync(provider);

            return BadRequest(new { message = $"{provider} login is not configured. Add credentials to appsettings.json or enable EnableDevSocialLogin for local testing." });
        }

        [HttpGet("external/{provider}/callback")]
        public async Task<IActionResult> ExternalCallback(string provider)
        {
            var frontend = FrontendCallbackUrl;

            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
                return Redirect($"{frontend}?error=external_failed");

            var signInResult = await _signInManager.ExternalLoginSignInAsync(
                info.LoginProvider, info.ProviderKey, isPersistent: false, bypassTwoFactor: true);

            ApplicationUser? user;
            if (!signInResult.Succeeded)
            {
                user = await FindOrCreateExternalUserAsync(info);
                if (user == null)
                    return Redirect($"{frontend}?error=create_failed");

                var addLogin = await _userManager.AddLoginAsync(user, info);
                if (!addLogin.Succeeded)
                    return Redirect($"{frontend}?error=link_failed");
            }
            else
            {
                user = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
                if (user == null)
                    return Redirect($"{frontend}?error=user_not_found");
            }

            await _signInManager.SignOutAsync();
            return await RedirectWithTokenAsync(user, frontend);
        }

        private async Task<IActionResult> DevSocialLoginAsync(string provider)
        {
            var key = provider.ToLowerInvariant();
            var username = key == "google" ? "google_user" : "facebook_user";

            var user = await _userManager.FindByNameAsync(username);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = username,
                    Email = key == "google" ? "google.user@mosqueos.uk" : "facebook.user@mosqueos.uk",
                    FullName = key == "google" ? "Google Member" : "Facebook Member",
                    EmailConfirmed = true
                };
                var create = await _userManager.CreateAsync(user, key == "google" ? "Google@123" : "Facebook@123");
                if (!create.Succeeded)
                    return BadRequest(new { message = "Could not create social demo user." });
                await _userManager.AddToRoleAsync(user, Roles.Member);
            }

            return await RedirectWithTokenAsync(user, FrontendCallbackUrl);
        }

        private async Task<IActionResult> RedirectWithTokenAsync(ApplicationUser user, string frontend)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var (token, _, _) = _jwt.CreateToken(user, roles);
            return Redirect($"{frontend}?token={Uri.EscapeDataString(token)}");
        }

        private async Task<ApplicationUser?> FindOrCreateExternalUserAsync(ExternalLoginInfo info)
        {
            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            var name = info.Principal.FindFirstValue(ClaimTypes.Name)
                ?? info.Principal.FindFirstValue(ClaimTypes.GivenName)
                ?? email?.Split('@')[0]
                ?? "Social User";

            ApplicationUser? user = null;
            if (!string.IsNullOrWhiteSpace(email))
                user = await _userManager.FindByEmailAsync(email);

            if (user != null)
                return user;

            var baseUsername = SanitizeUsername(email?.Split('@')[0] ?? name);
            var username = await EnsureUniqueUsernameAsync(baseUsername);

            user = new ApplicationUser
            {
                UserName = username,
                Email = email,
                EmailConfirmed = !string.IsNullOrWhiteSpace(email),
                FullName = name.Trim()
            };

            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded)
                return null;

            await _userManager.AddToRoleAsync(user, Roles.Member);
            return user;
        }

        private async Task<string> EnsureUniqueUsernameAsync(string baseName)
        {
            var candidate = baseName;
            var suffix = 1;
            while (await _userManager.FindByNameAsync(candidate) != null)
                candidate = $"{baseName}{suffix++}";
            return candidate;
        }

        private static string SanitizeUsername(string value)
        {
            var chars = value.ToLowerInvariant()
                .Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '.')
                .ToArray();
            var result = new string(chars);
            return string.IsNullOrWhiteSpace(result) ? $"user{Random.Shared.Next(1000, 9999)}" : result[..Math.Min(result.Length, 32)];
        }

        private string? ResolveOAuthScheme(string provider)
        {
            if (provider.Equals("google", StringComparison.OrdinalIgnoreCase) && IsGoogleConfigured())
                return GoogleDefaults.AuthenticationScheme;

            if (provider.Equals("facebook", StringComparison.OrdinalIgnoreCase) && IsFacebookConfigured())
                return FacebookDefaults.AuthenticationScheme;

            return null;
        }

        private static bool IsSupportedProvider(string provider) =>
            provider.Equals("google", StringComparison.OrdinalIgnoreCase) ||
            provider.Equals("facebook", StringComparison.OrdinalIgnoreCase);

        private bool IsGoogleConfigured() =>
            !string.IsNullOrWhiteSpace(_configuration["Authentication:Google:ClientId"]) &&
            !string.IsNullOrWhiteSpace(_configuration["Authentication:Google:ClientSecret"]);

        private bool IsFacebookConfigured() =>
            !string.IsNullOrWhiteSpace(_configuration["Authentication:Facebook:AppId"]) &&
            !string.IsNullOrWhiteSpace(_configuration["Authentication:Facebook:AppSecret"]);

        private bool IsDevSocialEnabled() =>
            _environment.IsDevelopment() &&
            _configuration.GetValue("Authentication:EnableDevSocialLogin", true);

        private bool IsGoogleAvailable() => IsGoogleConfigured() || IsDevSocialEnabled();
        private bool IsFacebookAvailable() => IsFacebookConfigured() || IsDevSocialEnabled();

        private string FrontendCallbackUrl =>
            _configuration["Authentication:FrontendCallbackUrl"] ?? "http://localhost:4200/auth/callback";
    }
}
