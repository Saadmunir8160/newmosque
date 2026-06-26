using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueProfileCompleteness
{
    public static (int completeness, string[] missing) Calculate(Mosque mosque)
    {
        var fields = new (string key, Func<Mosque, string?> get)[]
        {
            ("name", m => m.Name),
            ("address", m => m.Address),
            ("city", m => m.City),
            ("postcode", m => m.Postcode),
            ("phone", m => m.Phone),
            ("email", m => m.Email),
            ("description", m => m.Description),
            ("logoUrl", m => m.LogoUrl),
            ("bannerUrl", m => m.BannerUrl),
        };

        var missing = fields
            .Where(f => string.IsNullOrWhiteSpace(f.get(mosque)))
            .Select(f => f.key)
            .ToArray();
        var completeness = fields.Length == 0
            ? 0
            : (int)Math.Round((fields.Length - missing.Length) / (double)fields.Length * 100);
        return (completeness, missing);
    }
}
