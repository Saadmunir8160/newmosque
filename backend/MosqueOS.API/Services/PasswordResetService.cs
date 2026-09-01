using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using MosqueOS.Domain.Entities;
using System.Text;

namespace MosqueOS.API.Services;

public class PasswordResetService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PasswordResetService> _logger;
    private readonly EmailOtpService _otp;

    public PasswordResetService(
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<PasswordResetService> logger,
        EmailOtpService otp)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
        _otp = otp;
    }

    public async Task SendResetAsync(ApplicationUser user, bool preferOtp = false)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return;

        if (preferOtp)
        {
            await _otp.SendPasswordResetOtpAsync(user);
            return;
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var frontendUrl = (_configuration["App:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/');
        var link = $"{frontendUrl}/auth/reset-password?email={Uri.EscapeDataString(user.Email)}&token={encoded}";

        var html = $"""
            <p>Assalamu alaikum {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>
            <p>We received a request to reset your MosqueOS password.</p>
            <p><a href="{link}">Reset my password</a></p>
            <p>This link expires soon. If you did not request a reset, ignore this email.</p>
            <p>— MosqueOS</p>
            """;

        await _emailSender.SendEmailAsync(user.Email, "Reset your MosqueOS password", html);
        _logger.LogInformation("Password reset email queued for {Email}", user.Email);
    }
}
