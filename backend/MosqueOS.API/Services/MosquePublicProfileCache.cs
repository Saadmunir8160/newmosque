using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

/// <summary>
/// Public profile slug cache (Milestone 9). Uses IDistributedCache —
/// memory in development, Redis when ConnectionStrings:Redis is set.
/// </summary>
public class MosquePublicProfileCache
{
    public const string KeyPrefix = "mosque:public:slug:";
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromSeconds(60);

    private readonly IDistributedCache _cache;
    private readonly ILogger<MosquePublicProfileCache> _logger;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public MosquePublicProfileCache(IDistributedCache cache, ILogger<MosquePublicProfileCache> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<MosquePublicDto?> GetAsync(string slug, CancellationToken ct = default)
    {
        var key = KeyPrefix + slug.ToLowerInvariant();
        var bytes = await _cache.GetAsync(key, ct);
        if (bytes == null || bytes.Length == 0) return null;
        try
        {
            return JsonSerializer.Deserialize<MosquePublicDto>(bytes, JsonOpts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize cached public profile for {Slug}", slug);
            await _cache.RemoveAsync(key, ct);
            return null;
        }
    }

    public async Task SetAsync(string slug, MosquePublicDto dto, CancellationToken ct = default)
    {
        var key = KeyPrefix + slug.ToLowerInvariant();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(dto, JsonOpts);
        await _cache.SetAsync(key, bytes, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = DefaultTtl
        }, ct);
    }

    public async Task InvalidateSlugAsync(string? slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug)) return;
        await _cache.RemoveAsync(KeyPrefix + slug.ToLowerInvariant(), ct);
    }

    public Task InvalidateMosqueAsync(Mosque mosque, CancellationToken ct = default) =>
        InvalidateSlugAsync(mosque.Slug, ct);
}
