using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MosqueOS.API.Services;

/// <summary>Seeds default module feature flags when a mosque is created.</summary>
public class MosqueModuleSeedService
{
    /// <summary>Module keys and whether they are enabled by default for new mosques.</summary>
    public static readonly IReadOnlyDictionary<string, bool> DefaultFlags = new Dictionary<string, bool>
    {
        ["PrayerTimes"] = true,
        ["Janaza"] = true,
        ["NearbyMosqueDiscovery"] = true,
        ["Announcements"] = false,
        ["Events"] = false,
        ["Donations"] = false,
        ["Madrassah"] = false,
        ["Communities"] = false,
        ["Awrad"] = false,
        ["Adhkar"] = false,
        ["Duas"] = false,
        ["Quran"] = false,
        ["RitualGuides"] = false,
        ["DeathReadings"] = false,
        ["Participation"] = false,
        ["JourneyGuides"] = false,
        ["Courses"] = false,
        ["Memberships"] = false,
        ["VolunteerManagement"] = false,
        ["Fundraising"] = false,
        ["CommunityServices"] = false,
    };

    private readonly IUnitOfWork _unitOfWork;

    public MosqueModuleSeedService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task SeedAsync(int mosqueId, CancellationToken ct = default)
    {
        if (await _unitOfWork.Repository<MosqueSetting>().Query().AnyAsync(s => s.MosqueId == mosqueId, ct))
            return;

        _unitOfWork.Repository<MosqueSetting>().AddRange(
            DefaultFlags.Select(kv => new MosqueSetting
            {
                MosqueId = mosqueId,
                ModuleKey = kv.Key,
                IsEnabled = kv.Value
            }));

        await _unitOfWork.SaveChangesAsync(ct);
    }

    /// <summary>Legacy helper — all modules enabled (used when backfilling demo data).</summary>
    public static IEnumerable<MosqueSetting> AllEnabled(int mosqueId) =>
        DefaultFlags.Keys.Select(k => new MosqueSetting { MosqueId = mosqueId, ModuleKey = k, IsEnabled = true });
}
