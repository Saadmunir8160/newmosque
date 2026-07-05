using System.Text.Json;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueProfileJsonHelper
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public static MosqueProfileData Parse(string? profileJson)
    {
        if (string.IsNullOrWhiteSpace(profileJson)) return new MosqueProfileData();
        try
        {
            return JsonSerializer.Deserialize<MosqueProfileData>(profileJson, JsonOpts) ?? new MosqueProfileData();
        }
        catch
        {
            return new MosqueProfileData();
        }
    }

    public static string Serialize(MosqueProfileData data) =>
        JsonSerializer.Serialize(data, JsonOpts);

    public static void ApplyProfileUpdate(Mosque mosque, MosqueUpdateDto dto)
    {
        if (dto.Leadership == null && dto.StatsOverride == null) return;

        var profile = Parse(mosque.ProfileJson);
        if (dto.Leadership != null)
            profile.Leadership = dto.Leadership;
        if (dto.StatsOverride != null)
            profile.Stats = dto.StatsOverride;
        mosque.ProfileJson = Serialize(profile);
    }

    public static void ApplyProfileUpdate(Mosque mosque, List<MosqueLeadershipDto>? leadership, MosqueStatsOverrideDto? stats)
    {
        if (leadership == null && stats == null) return;
        var profile = Parse(mosque.ProfileJson);
        if (leadership != null) profile.Leadership = leadership;
        if (stats != null) profile.Stats = stats;
        mosque.ProfileJson = Serialize(profile);
    }
}

public class MosqueProfileData
{
    public List<MosqueLeadershipDto> Leadership { get; set; } = new();
    public MosqueStatsOverrideDto? Stats { get; set; }
}
