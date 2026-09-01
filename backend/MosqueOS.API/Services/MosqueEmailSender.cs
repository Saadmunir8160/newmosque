using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace MosqueOS.API.Services;

public class MosqueEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<MosqueEmailSender> _logger;

    public MosqueEmailSender(IOptions<EmailOptions> options, ILogger<MosqueEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        await SendEmailAsync(to, subject, htmlBody, null);
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody, string? plainTextBody)
    {
        var smtpUser = (_options.Smtp.Username ?? string.Empty).Trim();
        // Gmail App Passwords are often copied with spaces — strip them.
        var smtpPass = (_options.Smtp.Password ?? string.Empty).Replace(" ", string.Empty);
        var smtpReady = !string.IsNullOrWhiteSpace(_options.Smtp.Host)
            && !string.IsNullOrWhiteSpace(smtpUser)
            && !string.IsNullOrWhiteSpace(smtpPass);

        if (_options.LogToConsole || !smtpReady)
        {
            _logger.LogInformation(
                "=== MosqueOS Email ===\nTo: {To}\nSubject: {Subject}\n{Body}\nSMTP configured: {SmtpReady}\n======================",
                to, subject, plainTextBody ?? htmlBody, smtpReady);
        }

        if (!smtpReady)
        {
            _logger.LogWarning(
                "Email not sent via SMTP — set Email:Smtp:Username and Email:Smtp:Password (Gmail App Password) in appsettings.Local.json");
            return;
        }

        var fromAddress = !string.IsNullOrWhiteSpace(_options.FromAddress)
            ? _options.FromAddress.Trim()
            : smtpUser;

        try
        {
            using var client = new SmtpClient(_options.Smtp.Host, _options.Smtp.Port)
            {
                EnableSsl = _options.Smtp.EnableSsl,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            using var message = new MailMessage
            {
                From = new MailAddress(fromAddress, _options.FromName),
                Subject = subject,
            };
            message.To.Add(to);

            if (!string.IsNullOrWhiteSpace(plainTextBody))
            {
                message.Body = plainTextBody;
                message.IsBodyHtml = false;
                var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
                message.AlternateViews.Add(htmlView);
            }
            else
            {
                message.Body = htmlBody;
                message.IsBodyHtml = true;
            }

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To}", to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}. Check Gmail App Password in appsettings.Local.json", to);
            throw;
        }
    }
}
