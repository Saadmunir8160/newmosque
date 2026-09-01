using Microsoft.Extensions.Caching.Memory;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class EmailOtpService
{
    private const string CachePrefix = "email-otp:";
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(10);

    private readonly IMemoryCache _cache;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<EmailOtpService> _logger;

    public EmailOtpService(IMemoryCache cache, IEmailSender emailSender, ILogger<EmailOtpService> logger)
    {
        _cache = cache;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task SendOtpAsync(ApplicationUser user)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return;

        var email = user.Email.Trim().ToLowerInvariant();
        var otp = Random.Shared.Next(100000, 999999).ToString();
        _cache.Set(CacheKey(email), otp, OtpLifetime);
        // Always log before SMTP so local/dev can verify even if Gmail fails.
        _logger.LogInformation("Verification OTP for {Email}: {Otp}", email, otp);

        var plain = $"""
            {otp} is your MosqueOS verification code.

            Assalamu alaikum {user.FullName},

            Enter this 6-digit code on the verification page. It expires in 10 minutes.

            If you did not create this account, ignore this email.

            — MosqueOS
            """;

        var html = $"""
            <p>{otp} is your MosqueOS verification code.</p>
            <p>Assalamu alaikum {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Your verification code is:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0F4C3A;">{otp}</p>
            <p>This code expires in 10 minutes. Do not share it with anyone.</p>
            <p>If you did not create this account, you can ignore this message.</p>
            <p>— MosqueOS</p>
            """;

        await _emailSender.SendEmailAsync(user.Email, $"{otp} is your MosqueOS verification code", html, plain);
    }

    public async Task SendPasswordResetOtpAsync(ApplicationUser user)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return;

        var email = user.Email.Trim().ToLowerInvariant();
        var otp = Random.Shared.Next(100000, 999999).ToString();
        _cache.Set(ResetCacheKey(email), otp, OtpLifetime);
        _logger.LogInformation("Password reset OTP for {Email}: {Otp}", email, otp);

        var html = $"""
            <p>{otp} is your MosqueOS password reset code.</p>
            <p>Assalamu alaikum {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0F4C3A;">{otp}</p>
            <p>This code expires in 10 minutes.</p>
            <p>— MosqueOS</p>
            """;
        await _emailSender.SendEmailAsync(user.Email, $"{otp} is your MosqueOS password reset code", html);
    }

    public bool TryValidatePasswordResetOtp(string email, string otp, out string? error)
    {
        error = null;
        var normalized = email.Trim().ToLowerInvariant();
        var code = otp.Trim();
        if (string.IsNullOrWhiteSpace(code) || code.Length != 6 || !code.All(char.IsDigit))
        {
            error = "Please enter the 6-digit code from your email.";
            return false;
        }

        if (!_cache.TryGetValue(ResetCacheKey(normalized), out string? stored) || string.IsNullOrEmpty(stored))
        {
            error = "Code expired or not found. Request a new reset code.";
            return false;
        }

        if (!string.Equals(stored, code, StringComparison.Ordinal))
        {
            error = "Incorrect reset code. Please try again.";
            return false;
        }

        _cache.Remove(ResetCacheKey(normalized));
        return true;
    }

    public bool TryValidate(string email, string otp, out string? error)
    {
        error = null;
        var normalized = email.Trim().ToLowerInvariant();
        var code = otp.Trim();

        if (string.IsNullOrWhiteSpace(code) || code.Length != 6 || !code.All(char.IsDigit))
        {
            error = "Please enter the 6-digit code from your email.";
            return false;
        }

        if (!_cache.TryGetValue(CacheKey(normalized), out string? stored) || string.IsNullOrEmpty(stored))
        {
            error = "Code expired or not found. Request a new verification code.";
            return false;
        }

        if (!string.Equals(stored, code, StringComparison.Ordinal))
        {
            error = "Incorrect verification code. Please try again.";
            return false;
        }

        _cache.Remove(CacheKey(normalized));
        return true;
    }

    private static string CacheKey(string email) => $"{CachePrefix}{email}";
    private static string ResetCacheKey(string email) => $"{CachePrefix}reset:{email}";
}
