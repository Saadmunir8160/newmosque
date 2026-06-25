namespace MosqueOS.API.Services;

public class EmailOptions
{
    public string FromAddress { get; set; } = "noreply@mosqueos.uk";
    public string FromName { get; set; } = "MosqueOS";
    public bool LogToConsole { get; set; } = true;
    public SmtpOptions Smtp { get; set; } = new();
}

public class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
}
