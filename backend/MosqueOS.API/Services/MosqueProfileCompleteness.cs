using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueProfileCompleteness
{
    public static (int completeness, string[] missing) Calculate(Mosque mosque)
    {
        var fields = new (string key, Func<Mosque, bool> check)[]
        {
            ("name",           m => !string.IsNullOrWhiteSpace(m.Name)),
            ("address",        m => !string.IsNullOrWhiteSpace(m.Address)),
            ("city",           m => !string.IsNullOrWhiteSpace(m.City)),
            ("postcode",       m => !string.IsNullOrWhiteSpace(m.Postcode)),
            ("phone",          m => !string.IsNullOrWhiteSpace(m.Phone)),
            ("email",          m => !string.IsNullOrWhiteSpace(m.Email)),
            ("description",    m => !string.IsNullOrWhiteSpace(m.Description)),
            ("logoUrl",        m => !string.IsNullOrWhiteSpace(m.LogoUrl)),
            ("bannerUrl",      m => !string.IsNullOrWhiteSpace(m.BannerUrl)),
            ("vision",         m => !string.IsNullOrWhiteSpace(m.Vision)),
            ("history",        m => !string.IsNullOrWhiteSpace(m.History)),
            ("establishedYear",m => m.EstablishedYear.HasValue),
            ("gallery",        m => !string.IsNullOrWhiteSpace(m.GalleryJson)),
            ("leadership",     m => !string.IsNullOrWhiteSpace(m.ProfileJson)),
        };

        var missing = fields
            .Where(f => !f.check(mosque))
            .Select(f => f.key)
            .ToArray();
        var completeness = fields.Length == 0
            ? 0
            : (int)Math.Round((fields.Length - missing.Length) / (double)fields.Length * 100);
        return (completeness, missing);
    }
}
