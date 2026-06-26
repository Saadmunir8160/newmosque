namespace MosqueOS.API.Services;

public interface IEmailSender
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
    Task SendEmailAsync(string to, string subject, string htmlBody, string? plainTextBody);
}
