using System.Text.Json;
using System.Text.Json.Serialization;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

/// <summary>Module 3.1 social_links JSON helper — source of truth with legacy column sync.</summary>
public static class MosqueSocialLinksHelper
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static List<SocialLinkDto> Parse(Mosque mosque)
    {
        var fromJson = ParseJson(mosque.SocialLinksJson);
        if (fromJson.Count > 0)
            return fromJson;

        return FromLegacyColumns(mosque);
    }

    public static List<SocialLinkDto> ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("links", out var linksEl)
                && linksEl.ValueKind == JsonValueKind.Array)
            {
                return ParseArray(linksEl);
            }

            if (doc.RootElement.ValueKind == JsonValueKind.Array)
                return ParseArray(doc.RootElement);
        }
        catch
        {
            // ignore malformed JSON
        }

        return [];
    }

    public static string Serialize(IEnumerable<SocialLinkDto> links)
    {
        var cleaned = links
            .Where(l => !string.IsNullOrWhiteSpace(l.Url))
            .Select(l => new SocialLinkDto
            {
                Platform = string.IsNullOrWhiteSpace(l.Platform) ? "custom" : l.Platform.Trim().ToLowerInvariant(),
                Label = string.IsNullOrWhiteSpace(l.Label) ? null : l.Label.Trim(),
                Url = l.Url.Trim()
            })
            .ToList();

        return JsonSerializer.Serialize(new { links = cleaned }, JsonOpts);
    }

    public static void SyncJsonFromLegacy(Mosque mosque)
    {
        mosque.SocialLinksJson = Serialize(FromLegacyColumns(mosque));
    }

    public static void ApplyLinks(Mosque mosque, IEnumerable<SocialLinkDto>? links)
    {
        if (links == null) return;

        var list = links
            .Where(l => !string.IsNullOrWhiteSpace(l.Url))
            .Select(l => new SocialLinkDto
            {
                Platform = string.IsNullOrWhiteSpace(l.Platform) ? "custom" : l.Platform.Trim().ToLowerInvariant(),
                Label = string.IsNullOrWhiteSpace(l.Label) ? null : l.Label.Trim(),
                Url = l.Url.Trim()
            })
            .ToList();

        mosque.SocialLinksJson = Serialize(list);
        ApplyLegacyColumns(mosque, list);
    }

    public static void SyncAfterLegacyEdit(Mosque mosque) => SyncJsonFromLegacy(mosque);

    public static string? GetUrl(IEnumerable<SocialLinkDto> links, string platform) =>
        links.FirstOrDefault(l => string.Equals(l.Platform, platform, StringComparison.OrdinalIgnoreCase))?.Url;

    private static List<SocialLinkDto> FromLegacyColumns(Mosque mosque)
    {
        var links = new List<SocialLinkDto>();
        AddIfPresent(links, "facebook", mosque.FacebookUrl);
        AddIfPresent(links, "instagram", mosque.InstagramUrl);
        AddIfPresent(links, "youtube", mosque.YoutubeUrl);
        AddIfPresent(links, "x", mosque.TwitterUrl);
        return links;
    }

    private static void ApplyLegacyColumns(Mosque mosque, List<SocialLinkDto> links)
    {
        mosque.FacebookUrl = GetUrl(links, "facebook");
        mosque.InstagramUrl = GetUrl(links, "instagram");
        mosque.YoutubeUrl = GetUrl(links, "youtube");
        mosque.TwitterUrl = GetUrl(links, "x") ?? GetUrl(links, "twitter");
    }

    private static void AddIfPresent(List<SocialLinkDto> links, string platform, string? url)
    {
        if (!string.IsNullOrWhiteSpace(url))
            links.Add(new SocialLinkDto { Platform = platform, Url = url.Trim() });
    }

    private static List<SocialLinkDto> ParseArray(JsonElement array)
    {
        var list = new List<SocialLinkDto>();
        foreach (var el in array.EnumerateArray())
        {
            if (el.ValueKind != JsonValueKind.Object) continue;
            var url = el.TryGetProperty("url", out var u) ? u.GetString() : null;
            if (string.IsNullOrWhiteSpace(url)) continue;
            var platform = el.TryGetProperty("platform", out var p) ? p.GetString() : "custom";
            var label = el.TryGetProperty("label", out var l) ? l.GetString() : null;
            list.Add(new SocialLinkDto
            {
                Platform = string.IsNullOrWhiteSpace(platform) ? "custom" : platform.Trim().ToLowerInvariant(),
                Label = string.IsNullOrWhiteSpace(label) ? null : label.Trim(),
                Url = url.Trim()
            });
        }
        return list;
    }
}
