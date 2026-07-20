using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Auth;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace MosqueOS.API.Controllers;

[Route("api/v1/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwt;
    private readonly IPermissionService _permissions;
    private readonly IUnitOfWork _unitOfWork;
    private readonly EmailOtpService _otp;
    private readonly EmailVerificationService _emailVerification;
    private readonly MosqueInvitationService _invitations;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwt,
        IPermissionService permissions,
        IUnitOfWork unitOfWork,
        EmailOtpService otp,
        EmailVerificationService emailVerification,
        MosqueInvitationService invitations)
    {
        _userManager = userManager;
        _jwt = jwt;
        _permissions = permissions;
        _unitOfWork = unitOfWork;
        _otp = otp;
        _emailVerification = emailVerification;
        _invitations = invitations;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest model)
    {
        var email = model.Email.Trim().ToLowerInvariant();
        var fullName = model.FullName.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(fullName))
            return BadRequest(new ApiMessageResponse { Message = "Full name and email are required." });

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            return BadRequest(new ApiMessageResponse { Message = "Please enter a valid email address." });

        var passwordErrors = AuthPasswordValidation.Validate(model.Password, model.ConfirmPassword);
        if (passwordErrors.Count > 0)
            return BadRequest(new ApiMessageResponse { Message = string.Join(" ", passwordErrors) });

        var existingEmail = await _userManager.FindByEmailAsync(email);
        if (existingEmail != null)
            return Conflict(new ApiMessageResponse { Message = "Email already registered. Try logging in or use a different email." });

        var username = string.IsNullOrWhiteSpace(model.Username)
            ? await GenerateUniqueUsernameAsync(email)
            : model.Username.Trim();

        var existingUsername = await _userManager.FindByNameAsync(username);
        if (existingUsername != null)
            return Conflict(new ApiMessageResponse { Message = "Username already exists. Choose a different username." });

        var user = new ApplicationUser
        {
            UserName = username,
            Email = email,
            EmailConfirmed = true,
            SecurityStamp = Guid.NewGuid().ToString()
        };

        var result = await _userManager.CreateAsync(user, model.Password);
        if (!result.Succeeded)
            return BadRequest(new ApiErrorResponse { Errors = result.Errors.Select(e => e.Description) });

        if (model.RegisterAsMosqueOwner)
            await _userManager.AddToRoleAsync(user, Roles.MosqueOwner);
        else
            await _userManager.AddToRoleAsync(user, Roles.Member);

        return Ok(new RegisterResponse
        {
            Message = "Account created successfully. You can now log in.",
            Email = email,
            RequiresVerification = false
        });
    }

    [HttpGet("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromQuery] string? userId, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new ApiMessageResponse { Message = "Invalid or expired verification link." });

        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new ApiMessageResponse { Message = "Invalid verification link." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound(new ApiMessageResponse { Message = "Invalid or expired verification link." });

        if (user.EmailConfirmed)
            return Ok(new ApiMessageResponse { Message = "Email already verified. You can log in now." });

        string decodedToken;
        try
        {
            decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        }
        catch
        {
            return BadRequest(new ApiMessageResponse { Message = "Invalid or expired verification link." });
        }

        var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
        if (!result.Succeeded)
            return BadRequest(new ApiMessageResponse { Message = "Invalid or expired verification link." });

        return Ok(new ApiMessageResponse { Message = "Email verified successfully. You can log in now." });
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public Task<IActionResult> ConfirmEmailPost([FromBody] ConfirmEmailRequest model) =>
        VerifyEmail(model.UserId, model.Token);

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest model) =>
        await ResendVerificationCore(model.Email);

    [HttpPost("resend-otp")]
    public async Task<IActionResult> ResendOtp([FromBody] ResendVerificationRequest model) =>
        await ResendVerificationCore(model.Email);

    private async Task<IActionResult> ResendVerificationCore(string rawEmail)
    {
        var email = rawEmail.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new ApiMessageResponse { Message = "Email is required." });

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Ok(new ApiMessageResponse { Message = "If an account exists, a verification email has been sent." });

        if (user.EmailConfirmed)
            return BadRequest(new ApiMessageResponse { Message = "This email is already verified. Please log in." });

        await _emailVerification.SendVerificationEmailAsync(user);
        return Ok(new ApiMessageResponse { Message = "Verification email sent. Please check your inbox." });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest model)
    {
        var email = model.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new ApiMessageResponse { Message = "Email is required." });

        if (!_otp.TryValidate(email, model.Otp, out var otpError))
            return BadRequest(new ApiMessageResponse { Message = otpError! });

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return NotFound(new ApiMessageResponse { Message = "No account found for this email." });

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        return Ok(new ApiMessageResponse { Message = "Email verified. You can log in now." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest model)
    {
        var loginId = model.Username.Trim();
        var user = await _userManager.FindByEmailAsync(loginId.ToLowerInvariant())
            ?? await _userManager.FindByNameAsync(loginId);

        if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
            return Unauthorized(new ApiMessageResponse { Message = "Invalid email or password." });

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
            return Unauthorized(new ApiMessageResponse { Message = "Account is suspended." });


        var userRoles = await _userManager.GetRolesAsync(user);
        var (token, expiration) = _jwt.CreateToken(user, userRoles);

        return Ok(new LoginResponse
        {
            Token = token,
            Expiration = expiration,
            Username = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Roles = userRoles
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        var permissions = await _permissions.GetPermissionsForRolesAsync(roles);
        return Ok(new CurrentUserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            FullName = user.FullName,
            Tariqa = user.Tariqa.ToString(),
            Level = user.Level.ToString(),
            DisplayPreference = user.DisplayPreference.ToString(),
            WirdMode = user.WirdMode.ToString(),
            HomeMosqueId = user.HomeMosqueId,
            SearchRadiusKm = user.SearchRadiusKm,
            Interests = user.Interests,
            Roles = roles,
            Permissions = permissions,
            EmailConfirmed = user.EmailConfirmed
        });
    }

    [Authorize]
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] PreferencesUpdateRequest model)
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
        return Ok(new ApiMessageResponse { Message = "Preferences updated." });
    }

    [HttpGet("invite/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInvitePreview(string token)
    {
        var (preview, error, code) = await _invitations.GetInvitePreviewAsync(token);
        if (error != null)
            return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(preview);
    }

    [Authorize]
    [HttpPost("accept-invite")]
    public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteRequest model)
    {
        if (string.IsNullOrWhiteSpace(model.Token))
            return BadRequest(new ApiMessageResponse { Message = "Invitation token is required." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var (message, error, code) = await _invitations.AcceptInvitationAsync(model.Token.Trim(), userId);
        if (error != null)
            return StatusCode(code, new ApiMessageResponse { Message = error });

        return Ok(new ApiMessageResponse { Message = message ?? "Invitation accepted." });
    }

    /// <summary>New mosque owner sets password from email invite and accepts in one step.</summary>
    [HttpPost("register-from-invite")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterFromInvite([FromBody] RegisterFromInviteRequest model)
    {
        if (string.IsNullOrWhiteSpace(model.Token))
            return BadRequest(new ApiMessageResponse { Message = "Invitation token is required." });

        var (preview, previewError, previewCode) = await _invitations.GetInvitePreviewAsync(model.Token.Trim());
        if (previewError != null)
            return StatusCode(previewCode, new ApiMessageResponse { Message = previewError });

        var email = preview!.InviteEmail.Trim().ToLowerInvariant();
        var fullName = string.IsNullOrWhiteSpace(model.FullName)
            ? (preview.InviteName?.Trim() ?? email.Split('@')[0])
            : model.FullName.Trim();

        var passwordErrors = AuthPasswordValidation.Validate(model.Password, model.ConfirmPassword);
        if (passwordErrors.Count > 0)
            return BadRequest(new ApiMessageResponse { Message = string.Join(" ", passwordErrors) });

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
            return Conflict(new ApiMessageResponse
            {
                Message = "An account already exists for this email. Log in with that email, then open the invitation link again to accept."
            });

        var username = await GenerateUniqueUsernameAsync(email);
        var user = new ApplicationUser
        {
            UserName = username,
            Email = email,
            FullName = fullName,
            EmailConfirmed = true,
            HomeMosqueId = preview.MosqueId,
            SecurityStamp = Guid.NewGuid().ToString()
        };

        var createResult = await _userManager.CreateAsync(user, model.Password);
        if (!createResult.Succeeded)
            return BadRequest(new ApiErrorResponse { Errors = createResult.Errors.Select(e => e.Description) });

        var (message, acceptError, acceptCode) = await _invitations.AcceptInvitationAsync(model.Token.Trim(), user.Id);
        if (acceptError != null)
        {
            await _userManager.DeleteAsync(user);
            return StatusCode(acceptCode, new ApiMessageResponse { Message = acceptError });
        }

        var userRoles = await _userManager.GetRolesAsync(user);
        var (token, expiration) = _jwt.CreateToken(user, userRoles);

        return Ok(new LoginResponse
        {
            Token = token,
            Expiration = expiration,
            Username = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Roles = userRoles
        });
    }

    private async Task<string> GenerateUniqueUsernameAsync(string email)
    {
        var local = email.Split('@')[0].ToLowerInvariant();
        local = Regex.Replace(local, @"[^a-z0-9]", string.Empty);
        if (string.IsNullOrEmpty(local)) local = "user";

        var candidate = local;
        var suffix = 1;
        while (await _userManager.FindByNameAsync(candidate) != null)
        {
            candidate = $"{local}{suffix++}";
        }

        return candidate;
    }
}
