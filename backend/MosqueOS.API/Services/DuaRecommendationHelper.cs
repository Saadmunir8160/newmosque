using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

/// <summary>Contextual dua recommendation for home / today (Module 3.9).</summary>
public static class DuaRecommendationHelper
{
    public static async Task<Dua?> ResolveAsync(IUnitOfWork uow, DateTime localNow, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(localNow);
        var isFriday = localNow.DayOfWeek == DayOfWeek.Friday;
        var isRamadan = await IsRamadanAsync(uow, today, ct);

        // Priority: Friday → Ramadan → time-of-day category → any published
        string? preferCategory = null;
        string? preferTag = null;
        if (isFriday)
        {
            preferCategory = "mosque";
            preferTag = "friday";
        }
        else if (isRamadan)
        {
            preferCategory = "general";
            preferTag = "ramadan";
        }
        else
        {
            preferCategory = localNow.Hour switch
            {
                >= 4 and < 10 => "morning",
                >= 10 and < 14 => "after_prayer",
                >= 14 and < 18 => "general",
                >= 18 and < 22 => "after_prayer",
                _ => "sleep"
            };
        }

        var published = uow.Repository<Dua>().QueryNoTracking()
            .Where(d => d.Status == ContentPublishStatus.Published);

        if (!string.IsNullOrEmpty(preferTag))
        {
            var tagged = await published
                .Where(d => d.Tags != null && d.Tags.Contains(preferTag))
                .OrderBy(d => d.Id)
                .FirstOrDefaultAsync(ct);
            if (tagged != null) return tagged;
        }

        if (!string.IsNullOrEmpty(preferCategory))
        {
            var byCat = await published
                .Where(d => d.Category == preferCategory)
                .OrderBy(d => d.Id)
                .FirstOrDefaultAsync(ct);
            if (byCat != null) return byCat;
        }

        return await published.OrderBy(d => d.Id).FirstOrDefaultAsync(ct);
    }

    private static async Task<bool> IsRamadanAsync(IUnitOfWork uow, DateOnly today, CancellationToken ct)
    {
        var publishedIds = await uow.Repository<RamadanTimetable>().QueryNoTracking()
            .Where(t => t.Status == PublishStatus.Published)
            .Select(t => t.Id)
            .ToListAsync(ct);
        if (publishedIds.Count == 0) return false;
        return await uow.Repository<RamadanDayEntry>().QueryNoTracking()
            .AnyAsync(d => d.Date == today && publishedIds.Contains(d.TimetableId), ct);
    }
}
