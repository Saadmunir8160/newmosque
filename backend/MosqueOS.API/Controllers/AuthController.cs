using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using MosqueOS.API.Models.Auth;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
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
    private readonly EmailOtpService _otp;
    private readonly EmailVerificationService _emailVerification;
    private readonly MosqueInvitationService _invitations;
    private readonly AuthSessionService _sessions;
    private readonly PasswordResetService _passwordReset;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwt,
        IPermissionService permissions,
        EmailOtpService otp,
        EmailVerificationService emailVerification,
        MosqueInvitationService invitations,
        AuthSessionService sessions,
        PasswordResetService passwordReset)
    {
        _userManager = userManager;
        _jwt = jwt;
        _permissions = permissions;
        _otp = otp;
        _emailVerification = emailVerification;
        _invitations = invitations;
        _sessions = sessions;
        _passwordReset = passwordReset;
    }

    /// <summary>Member-only self-registration. Elevated roles must use invitation.</summary>
    [HttpPost("register")]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthRegister)]
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

        // Ignore RegisterAsMosqueOwner — self-register is always Member
        if (model.RegisterAsMosqueOwner)
        {
            // Explicit rejection if client tries to elevate via register
            // (kept soft: still creates Member, never Owner)
        }

        var existingEmail = await _userManager.FindByEmailAsync(email);
        if (existingEmail != null)
        {
            // Same email used again: guide them instead of a dead-end error.
            if (!existingEmail.EmailConfirmed)
            {
                try { await _otp.SendOtpAsync(existingEmail); } catch { /* cache still set / resend available */ }
                return Ok(new RegisterResponse
                {
                    Message = "This email is already registered but not verified. We sent a new verification code.",
                    Email = email,
                    RequiresVerification = true
                });
            }

            return Conflict(new ApiMessageResponse
            {
                Message = "Email already registered. Please log in with this email."
            });
        }

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
            FullName = fullName,
            EmailConfirmed = false,
            SecurityStamp = Guid.NewGuid().ToString()
        };

        var result = await _userManager.CreateAsync(user, model.Password);
        if (!result.Succeeded)
            return BadRequest(new ApiErrorResponse { Errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, Roles.Member);

        // Send OTP and link independently so a link-email failure cannot skip the OTP.
        try
        {
            await _otp.SendOtpAsync(user);
        }
        catch
        {
            // OTP is cached before SMTP; user can resend. Account remains created.
        }

        try
        {
            await _emailVerification.SendVerificationEmailAsync(user);
        }
        catch
        {
            // Link email is optional when OTP is the primary verify path.
        }

        await _sessions.RecordLoginEventAsync(user.Id, "Register", true);

        return Ok(new RegisterResponse
        {
            Message = "Account created. Please verify your email with the link or OTP we sent before logging in.",
            Email = email,
            RequiresVerification = true
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

        await _sessions.RecordLoginEventAsync(user.Id, "EmailVerified", true);
        return Ok(new ApiMessageResponse { Message = "Email verified successfully. You can log in now." });
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public Task<IActionResult> ConfirmEmailPost([FromBody] ConfirmEmailRequest model) =>
        VerifyEmail(model.UserId, model.Token);

    [HttpPost("resend-verification")]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest model) =>
        await ResendVerificationCore(model.Email);

    [HttpPost("resend-otp")]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
    public async Task<IActionResult> ResendOtp([FromBody] ResendVerificationRequest model)
    {
        var email = model.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new ApiMessageResponse { Message = "Email is required." });

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return Ok(new ApiMessageResponse { Message = "If an account exists, a verification code has been sent." });

        if (user.EmailConfirmed)
            return BadRequest(new ApiMessageResponse { Message = "This email is already verified. Please log in." });

        try
        {
            await _otp.SendOtpAsync(user);
        }
        catch
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiMessageResponse
            {
                Message = "Could not send verification email. Check SMTP settings or try again shortly."
            });
        }

        return Ok(new ApiMessageResponse { Message = "Verification code sent. Please check your inbox (and spam folder)." });
    }

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
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
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

        await _sessions.RecordLoginEventAsync(user.Id, "EmailVerifiedOtp", true);
        return Ok(new ApiMessageResponse { Message = "Email verified. You can log in now." });
    }

    [HttpPost("login")]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthLogin)]
    public async Task<IActionResult> Login([FromBody] LoginRequest model)
    {
        var loginId = model.Username.Trim();
        var user = await _userManager.FindByEmailAsync(loginId.ToLowerInvariant())
            ?? await _userManager.FindByNameAsync(loginId);

        if (user == null)
        {
            return Unauthorized(new ApiMessageResponse { Message = "Invalid email or password." });
        }

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
        {
            await _sessions.RecordLoginEventAsync(user.Id, "LoginFailed", false, "Account locked or suspended");
            return Unauthorized(new ApiMessageResponse { Message = "Account is locked. Try again later or contact support." });
        }

        if (!await _userManager.CheckPasswordAsync(user, model.Password))
        {
            await _userManager.AccessFailedAsync(user);
            await _sessions.RecordLoginEventAsync(user.Id, "LoginFailed", false, "Invalid password");
            if (await _userManager.IsLockedOutAsync(user))
                return Unauthorized(new ApiMessageResponse { Message = "Account locked due to too many failed attempts. Try again later." });
            return Unauthorized(new ApiMessageResponse { Message = "Invalid email or password." });
        }

        if (!user.EmailConfirmed)
        {
            await _sessions.RecordLoginEventAsync(user.Id, "LoginFailed", false, "Email not verified");
            return Unauthorized(new ApiMessageResponse
            {
                Message = "Email not verified. Check your inbox for the verification link or OTP."
            });
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            await _sessions.RecordLoginEventAsync(user.Id, "LoginFailed", false, "No roles assigned");
            return Unauthorized(new ApiMessageResponse { Message = "Account has no assigned role. Contact an administrator." });
        }

        var (access, accessExp, refresh, refreshExp) =
            await _sessions.IssueSessionAsync(user, model.RememberMe);

        await _sessions.RecordLoginEventAsync(user.Id, "LoginSuccess", true);

        return Ok(new LoginResponse
        {
            Token = access,
            Expiration = accessExp,
            RefreshToken = refresh,
            RefreshTokenExpiration = refreshExp,
            Username = user.UserName ?? string.Empty,
            FullName = user.FullName,
            Roles = roles
        });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest model)
    {
        if (string.IsNullOrWhiteSpace(model.RefreshToken))
            return BadRequest(new ApiMessageResponse { Message = "Refresh token is required." });

        var rotated = await _sessions.RotateRefreshTokenAsync(model.RefreshToken.Trim());
        if (rotated == null)
            return Unauthorized(new ApiMessageResponse { Message = "Invalid or expired refresh token. Please log in again." });

        var (access, accessExp, refresh, refreshExp) = rotated.Value;
        // Roles for response — decode from new token user via refresh path already validated user
        return Ok(new LoginResponse
        {
            Token = access,
            Expiration = accessExp,
            RefreshToken = refresh,
            RefreshTokenExpiration = refreshExp,
            Username = string.Empty,
            FullName = string.Empty,
            Roles = Array.Empty<string>()
        });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? model)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(model?.RefreshToken))
            await _sessions.RevokeRefreshTokenAsync(model.RefreshToken.Trim());

        if (!string.IsNullOrEmpty(userId))
            await _sessions.RecordLoginEventAsync(userId, "Logout", true);

        return Ok(new ApiMessageResponse { Message = "Logged out." });
    }

    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await _sessions.RevokeAllForUserAsync(userId);
        await _sessions.RecordLoginEventAsync(userId, "LogoutAll", true);
        return Ok(new ApiMessageResponse { Message = "Logged out from all devices." });
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> Sessions([FromQuery] string? refreshToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var list = await _sessions.ListActiveSessionsAsync(userId, refreshToken);
        return Ok(list);
    }

    [Authorize]
    [HttpDelete("sessions/{id:long}")]
    public async Task<IActionResult> RevokeSession(long id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await _sessions.RevokeSessionAsync(userId, id);
        return Ok(new ApiMessageResponse { Message = "Session revoked." });
    }

    [Authorize]
    [HttpGet("login-history")]
    public async Task<IActionResult> LoginHistory([FromQuery] int take = 50)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        return Ok(await _sessions.GetLoginHistoryAsync(userId, take));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest model)
    {
        var email = model.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new ApiMessageResponse { Message = "Email is required." });

        var user = await _userManager.FindByEmailAsync(email);
        // Always return success to avoid email enumeration
        if (user != null)
        {
            await _passwordReset.SendResetAsync(user, model.PreferOtp);
            await _sessions.RecordLoginEventAsync(user.Id, "PasswordResetRequested", true);
        }

        return Ok(new ApiMessageResponse
        {
            Message = model.PreferOtp
                ? "If an account exists, a password reset code has been sent."
                : "If an account exists, a password reset link has been sent."
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthSensitive)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest model)
    {
        var email = model.Email.Trim().ToLowerInvariant();
        var passwordErrors = AuthPasswordValidation.Validate(model.Password, model.ConfirmPassword);
        if (passwordErrors.Count > 0)
            return BadRequest(new ApiMessageResponse { Message = string.Join(" ", passwordErrors) });

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return BadRequest(new ApiMessageResponse { Message = "Invalid or expired reset request." });

        IdentityResult result;
        if (!string.IsNullOrWhiteSpace(model.Otp))
        {
            if (!_otp.TryValidatePasswordResetOtp(email, model.Otp, out var otpError))
                return BadRequest(new ApiMessageResponse { Message = otpError! });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            result = await _userManager.ResetPasswordAsync(user, token, model.Password);
        }
        else if (!string.IsNullOrWhiteSpace(model.Token))
        {
            string decoded;
            try
            {
                decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(model.Token));
            }
            catch
            {
                return BadRequest(new ApiMessageResponse { Message = "Invalid or expired reset link." });
            }

            result = await _userManager.ResetPasswordAsync(user, decoded, model.Password);
        }
        else
        {
            return BadRequest(new ApiMessageResponse { Message = "Reset token or OTP is required." });
        }

        if (!result.Succeeded)
            return BadRequest(new ApiErrorResponse { Errors = result.Errors.Select(e => e.Description) });

        await _sessions.RevokeAllForUserAsync(user.Id);
        await _sessions.RecordLoginEventAsync(user.Id, "PasswordReset", true);

        return Ok(new ApiMessageResponse { Message = "Password updated. Please log in with your new password." });
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

    /// <summary>Invited admin roles set password and accept invite (no self-selected role).</summary>
    [HttpPost("register-from-invite")]
    [AllowAnonymous]
    [EnableRateLimiting(MosqueRateLimitPolicies.AuthRegister)]
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
            // Invite email proves mailbox ownership
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

        var (access, accessExp, refresh, refreshExp) =
            await _sessions.IssueSessionAsync(user, rememberMe: false);
        var userRoles = await _userManager.GetRolesAsync(user);
        await _sessions.RecordLoginEventAsync(user.Id, "InviteAccepted", true);

        return Ok(new LoginResponse
        {
            Token = access,
            Expiration = accessExp,
            RefreshToken = refresh,
            RefreshTokenExpiration = refreshExp,
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
