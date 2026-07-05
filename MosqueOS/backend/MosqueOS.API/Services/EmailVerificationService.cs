using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using MosqueOS.Domain.Entities;
using System.Text;

namespace MosqueOS.API.Services;

public class EmailVerificationService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailVerificationService> _logger;

    public EmailVerificationService(
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<EmailVerificationService> logger)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(ApplicationUser user)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
            return;

        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var frontendUrl = (_configuration["App:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/');
        var link = $"{frontendUrl}/verify-email?userId={Uri.EscapeDataString(user.Id)}&token={encodedToken}";

        var html = $"""
            <p>Assalamu alaikum {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Thank you for registering with MosqueOS. Please verify your email address by clicking the link below:</p>
            <p><a href="{link}">Verify my email</a></p>
            <p>If you did not create this account, you can ignore this message.</p>
            <p>— MosqueOS</p>
            """;

        await _emailSender.SendEmailAsync(user.Email, "Verify your MosqueOS account", html);
        _logger.LogInformation("Verification email queued for {Email}", user.Email);
    }
}
