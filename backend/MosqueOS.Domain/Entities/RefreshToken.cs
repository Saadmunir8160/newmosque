namespace MosqueOS.Domain.Entities;

/// <summary>Persisted refresh token (hashed). Supports rotation and multi-device sessions.</summary>
public class RefreshToken
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    /// <summary>SHA-256 hash of the opaque refresh token (never store raw).</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>JWT jti bound to the access token issued with this refresh token.</summary>
    public string JwtId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool RememberMe { get; set; }
    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public bool IsActive => RevokedAt == null && ExpiresAt > DateTime.UtcNow;
}

/// <summary>Immutable auth event log (login success/fail, logout, password reset, etc.).</summary>
public class UserLoginHistory
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string EventType { get; set; } = string.Empty;
    public bool Succeeded { get; set; }
    public string? FailureReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
