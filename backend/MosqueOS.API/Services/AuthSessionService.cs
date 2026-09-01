using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Services;

public class AuthSessionService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwt;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _http;

    public AuthSessionService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IJwtTokenService jwt,
        IConfiguration configuration,
        IHttpContextAccessor http)
    {
        _db = db;
        _userManager = userManager;
        _jwt = jwt;
        _configuration = configuration;
        _http = http;
    }

    public async Task<(string AccessToken, DateTime AccessExpires, string RefreshToken, DateTime RefreshExpires)>
        IssueSessionAsync(ApplicationUser user, bool rememberMe, CancellationToken ct = default)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var accessLifetime = TimeSpan.FromMinutes(GetAccessMinutes());
        var (accessToken, accessExpires, jwtId) = _jwt.CreateToken(user, roles, accessLifetime);

        var rawRefresh = GenerateOpaqueToken();
        var refreshDays = rememberMe ? GetRememberMeDays() : GetRefreshDays();
        var refreshExpires = DateTime.UtcNow.AddDays(refreshDays);

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(rawRefresh),
            JwtId = jwtId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = refreshExpires,
            RememberMe = rememberMe,
            DeviceName = Truncate(GetUserAgent(), 200),
            IpAddress = Truncate(GetIp(), 64),
            UserAgent = Truncate(GetUserAgent(), 512),
        });
        await _db.SaveChangesAsync(ct);

        return (accessToken, accessExpires, rawRefresh, refreshExpires);
    }

    public async Task<(string AccessToken, DateTime AccessExpires, string RefreshToken, DateTime RefreshExpires)?>
        RotateRefreshTokenAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        var hash = HashToken(rawRefreshToken);
        var existing = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (existing == null)
            return null;

        // Reuse of revoked token → revoke entire family for that user (theft detection)
        if (existing.RevokedAt != null)
        {
            await RevokeAllForUserAsync(existing.UserId, ct);
            return null;
        }

        if (existing.ExpiresAt <= DateTime.UtcNow)
            return null;

        var user = await _userManager.FindByIdAsync(existing.UserId);
        if (user == null)
            return null;

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
            return null;

        existing.RevokedAt = DateTime.UtcNow;

        var roles = await _userManager.GetRolesAsync(user);
        var (accessToken, accessExpires, jwtId) = _jwt.CreateToken(user, roles, TimeSpan.FromMinutes(GetAccessMinutes()));
        var rawNew = GenerateOpaqueToken();
        var newHash = HashToken(rawNew);
        existing.ReplacedByTokenHash = newHash;

        var refreshExpires = existing.RememberMe
            ? DateTime.UtcNow.AddDays(GetRememberMeDays())
            : DateTime.UtcNow.AddDays(GetRefreshDays());

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            JwtId = jwtId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = refreshExpires,
            RememberMe = existing.RememberMe,
            DeviceName = Truncate(GetUserAgent() ?? existing.DeviceName, 200),
            IpAddress = Truncate(GetIp() ?? existing.IpAddress, 64),
            UserAgent = Truncate(GetUserAgent() ?? existing.UserAgent, 512),
        });
        await _db.SaveChangesAsync(ct);

        return (accessToken, accessExpires, rawNew, refreshExpires);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string rawRefreshToken, CancellationToken ct = default)
    {
        var hash = HashToken(rawRefreshToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing == null || existing.RevokedAt != null)
            return false;
        existing.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task RevokeAllForUserAsync(string userId, CancellationToken ct = default)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var t in active)
            t.RevokedAt = now;
        await _db.SaveChangesAsync(ct);
        // Invalidate outstanding access tokens via security stamp
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
            await _userManager.UpdateSecurityStampAsync(user);
    }

    public async Task RevokeSessionAsync(string userId, long sessionId, CancellationToken ct = default)
    {
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Id == sessionId && t.UserId == userId && t.RevokedAt == null, ct);
        if (token == null) return;
        token.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<SessionDto>> ListActiveSessionsAsync(string userId, string? currentRefreshToken, CancellationToken ct = default)
    {
        var currentHash = string.IsNullOrWhiteSpace(currentRefreshToken) ? null : HashToken(currentRefreshToken);
        var rows = await _db.RefreshTokens.AsNoTracking()
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        return rows.Select(t => new SessionDto
        {
            Id = t.Id,
            CreatedAt = t.CreatedAt,
            ExpiresAt = t.ExpiresAt,
            DeviceName = t.DeviceName,
            IpAddress = t.IpAddress,
            RememberMe = t.RememberMe,
            IsCurrent = currentHash != null && t.TokenHash == currentHash,
        }).ToList();
    }

    public async Task RecordLoginEventAsync(
        string? userId,
        string eventType,
        bool succeeded,
        string? failureReason = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return;

        _db.UserLoginHistories.Add(new UserLoginHistory
        {
            UserId = userId,
            EventType = eventType,
            Succeeded = succeeded,
            FailureReason = Truncate(failureReason, 500),
            IpAddress = Truncate(GetIp(), 64),
            UserAgent = Truncate(GetUserAgent(), 512),
            OccurredAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<LoginHistoryDto>> GetLoginHistoryAsync(string userId, int take = 50, CancellationToken ct = default)
    {
        return await _db.UserLoginHistories.AsNoTracking()
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.OccurredAt)
            .Take(Math.Clamp(take, 1, 200))
            .Select(h => new LoginHistoryDto
            {
                Id = h.Id,
                OccurredAt = h.OccurredAt,
                EventType = h.EventType,
                Succeeded = h.Succeeded,
                FailureReason = h.FailureReason,
                IpAddress = h.IpAddress,
                UserAgent = h.UserAgent,
            })
            .ToListAsync(ct);
    }

    public static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }

    private static string GenerateOpaqueToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private int GetAccessMinutes() =>
        int.TryParse(_configuration["JWT:AccessTokenMinutes"], out var m) ? m : 60;

    private int GetRefreshDays() =>
        int.TryParse(_configuration["JWT:RefreshTokenDays"], out var d) ? d : 7;

    private int GetRememberMeDays() =>
        int.TryParse(_configuration["JWT:RememberMeDays"], out var d) ? d : 30;

    private string? GetIp() =>
        _http.HttpContext?.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() =>
        _http.HttpContext?.Request.Headers.UserAgent.ToString();

    private static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= max ? value : value[..max];
    }
}

public class SessionDto
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }
    public bool RememberMe { get; set; }
    public bool IsCurrent { get; set; }
}

public class LoginHistoryDto
{
    public long Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public string EventType { get; set; } = string.Empty;
    public bool Succeeded { get; set; }
    public string? FailureReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
