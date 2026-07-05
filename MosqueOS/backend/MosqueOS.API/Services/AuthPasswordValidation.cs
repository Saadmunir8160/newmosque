using System.Text.RegularExpressions;

namespace MosqueOS.API.Services;

public static class AuthPasswordValidation
{
    private static readonly Regex PasswordPattern = new(
        @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$",
        RegexOptions.Compiled);

    public static IReadOnlyList<string> Validate(string? password, string? confirmPassword = null)
    {
        var errors = new List<string>();
        var pw = password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(pw))
        {
            errors.Add("Password is required.");
            return errors;
        }

        if (pw.Length < 8)
            errors.Add("Password must be at least 8 characters.");
        if (!Regex.IsMatch(pw, @"[a-z]"))
            errors.Add("Password must include a lowercase letter.");
        if (!Regex.IsMatch(pw, @"[A-Z]"))
            errors.Add("Password must include an uppercase letter.");
        if (!Regex.IsMatch(pw, @"\d"))
            errors.Add("Password must include a number.");
        if (!Regex.IsMatch(pw, @"[^a-zA-Z0-9]"))
            errors.Add("Password must include a special character.");

        if (confirmPassword != null && pw != confirmPassword)
            errors.Add("Passwords do not match.");

        return errors;
    }

    public static bool MeetsPolicy(string password) => PasswordPattern.IsMatch(password);
}
