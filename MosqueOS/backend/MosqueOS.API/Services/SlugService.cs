using System.Text.RegularExpressions;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MosqueOS.API.Services;

/// <summary>Generates URL-safe mosque slugs and resolves collisions.</summary>
public partial class SlugService
{
    private readonly IUnitOfWork _unitOfWork;

    public SlugService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var slug = input.Trim().ToLowerInvariant();
        slug = slug.Replace(' ', '-');
        slug = NonSlugChars().Replace(slug, string.Empty);
        slug = MultiHyphen().Replace(slug, "-").Trim('-');
        return slug;
    }

    public async Task<string> GenerateUniqueAsync(string nameOrSlug, int? excludeMosqueId = null, CancellationToken ct = default)
    {
        var baseSlug = Normalize(nameOrSlug);
        if (string.IsNullOrEmpty(baseSlug))
            baseSlug = "mosque";

        var candidate = baseSlug;
        var suffix = 2;

        while (await SlugTakenAsync(candidate, excludeMosqueId, ct))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return candidate;
    }

    public async Task<bool> IsSlugTakenAsync(string slug, int? excludeMosqueId = null, CancellationToken ct = default)
    {
        var normalized = Normalize(slug);
        if (string.IsNullOrEmpty(normalized)) return false;
        return await SlugTakenAsync(normalized, excludeMosqueId, ct);
    }

    private async Task<bool> SlugTakenAsync(string slug, int? excludeMosqueId, CancellationToken ct)
    {
        var query = _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .Where(m => m.Slug == slug && !m.IsDeleted);

        if (excludeMosqueId.HasValue)
            query = query.Where(m => m.Id != excludeMosqueId.Value);

        return await query.AnyAsync(ct);
    }

    [GeneratedRegex(@"[^a-z0-9\-]", RegexOptions.Compiled)]
    private static partial Regex NonSlugChars();

    [GeneratedRegex(@"-{2,}", RegexOptions.Compiled)]
    private static partial Regex MultiHyphen();
}
