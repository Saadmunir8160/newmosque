using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Infrastructure.Content;

namespace MosqueOS.Infrastructure.Services;

/// <summary>Fetches Qur'an text from https://api.alquran.cloud (free, no API key).</summary>
public class AlQuranCloudQuranService : IQuranTextService
{
    private const string BaseUrl = "https://api.alquran.cloud/v1";
    private const string ArabicEdition = "quran-uthmani";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AlQuranCloudQuranService> _logger;

    public AlQuranCloudQuranService(
        HttpClient http,
        IMemoryCache cache,
        ILogger<AlQuranCloudQuranService> logger)
    {
        _http = http;
        _cache = cache;
        _logger = logger;
    }

    public IReadOnlyList<QuranParaTextDto> ListParas() =>
        QuranReadingContent.AllParas.Select(p => new QuranParaTextDto(
            p.Number, p.NameEn, p.NameAr, p.SurahRange,
            string.Empty, string.Empty, "alquran.cloud")).ToList();

    public async Task<QuranParaTextDto?> GetParaAsync(int paraNumber, CancellationToken ct = default)
    {
        if (paraNumber is < 1 or > 30) return null;

        var meta = QuranReadingContent.GetPara(paraNumber);
        if (meta == null) return null;

        var cacheKey = $"quran-juz-{paraNumber}";
        if (_cache.TryGetValue(cacheKey, out QuranParaTextDto? cached) && cached != null)
            return cached;

        try
        {
            var arabic = await FetchEditionTextAsync($"juz/{paraNumber}/{ArabicEdition}", ct);

            var dto = new QuranParaTextDto(
                meta.Number,
                meta.NameEn,
                meta.NameAr,
                meta.SurahRange,
                arabic,
                string.Empty,
                "alquran.cloud");

            _cache.Set(cacheKey, dto, CacheTtl);
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AlQuran.Cloud failed for juz {Juz}; using local fallback.", paraNumber);
            return new QuranParaTextDto(
                meta.Number, meta.NameEn, meta.NameAr, meta.SurahRange,
                meta.Arabic, string.Empty, "local-fallback");
        }
    }

    public async Task<QuranSurahTextDto> GetYaseenAsync(CancellationToken ct = default)
    {
        const string cacheKey = "quran-surah-36";
        if (_cache.TryGetValue(cacheKey, out QuranSurahTextDto? cached) && cached != null)
            return cached;

        try
        {
            var arabic = await FetchEditionTextAsync($"surah/36/{ArabicEdition}", ct);

            var dto = new QuranSurahTextDto(
                SurahYaseenContent.Name,
                arabic,
                string.Empty,
                "alquran.cloud");

            _cache.Set(cacheKey, dto, CacheTtl);
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AlQuran.Cloud failed for Surah Yaseen; using local fallback.");
            return new QuranSurahTextDto(
                SurahYaseenContent.Name,
                SurahYaseenContent.Arabic,
                string.Empty,
                "local-fallback");
        }
    }

    private async Task<string> FetchEditionTextAsync(string path, CancellationToken ct)
    {
        Exception? last = null;
        for (var attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                var response = await _http.GetFromJsonAsync<AlQuranResponse>($"{BaseUrl}/{path}", ct);
                if (response?.Data?.Ayahs == null || response.Data.Ayahs.Count == 0)
                    throw new InvalidOperationException($"Empty response from AlQuran.Cloud for {path}.");

                return string.Join("\n", response.Data.Ayahs.Select(a => a.Text.Trim()));
            }
            catch (Exception ex) when (attempt < 3 && ex is not OperationCanceledException)
            {
                last = ex;
                _logger.LogWarning(ex, "AlQuran.Cloud attempt {Attempt} failed for {Path}.", attempt, path);
                await Task.Delay(TimeSpan.FromSeconds(attempt), ct);
            }
        }

        throw last ?? new InvalidOperationException($"AlQuran.Cloud failed for {path}.");
    }

    private sealed class AlQuranResponse
    {
        [JsonPropertyName("data")]
        public AlQuranData? Data { get; set; }
    }

    private sealed class AlQuranData
    {
        [JsonPropertyName("ayahs")]
        public List<AlQuranAyah> Ayahs { get; set; } = [];
    }

    private sealed class AlQuranAyah
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }
}
