using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Models.Auth;

public class LoginRequest
{
    /// <summary>Email address (preferred) or legacy username.</summary>
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class RegisterRequest
{
    public string? Username { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? ConfirmPassword { get; set; }

    /// <summary>
    /// Deprecated: self-registration is always Member.
    /// Kept for API compatibility; ignored by the server.
    /// </summary>
    public bool RegisterAsMosqueOwner { get; set; } = false;
}

public class RegisterResponse
{
    public string Message { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool RequiresVerification { get; set; }
}

public class ConfirmEmailRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationRequest
{
    public string Email { get; set; } = string.Empty;
}

public class VerifyOtpRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public class PreferencesUpdateRequest
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

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime Expiration { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public IEnumerable<string> Roles { get; set; } = Array.Empty<string>();

    /// <summary>Opaque refresh token (store securely client-side).</summary>
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiration { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class LogoutRequest
{
    public string? RefreshToken { get; set; }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    /// <summary>When true, send 6-digit OTP instead of email link.</summary>
    public bool PreferOtp { get; set; }
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Token { get; set; }
    public string? Otp { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? ConfirmPassword { get; set; }
}

public class CurrentUserResponse
{
    public string Id { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Tariqa { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string DisplayPreference { get; set; } = string.Empty;
    public string WirdMode { get; set; } = string.Empty;
    public int? HomeMosqueId { get; set; }
    public int SearchRadiusKm { get; set; }
    public string? Interests { get; set; }
    public IEnumerable<string> Roles { get; set; } = Array.Empty<string>();
    public IEnumerable<string> Permissions { get; set; } = Array.Empty<string>();
    public bool EmailConfirmed { get; set; }
}
