using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MosqueOS.Application.Common.Interfaces;

namespace MosqueOS.Infrastructure.Services;

/// <summary>Preloads all 30 juz into memory cache so every para opens with full text.</summary>
public sealed class QuranCacheWarmupService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<QuranCacheWarmupService> _logger;

    public QuranCacheWarmupService(IServiceProvider services, ILogger<QuranCacheWarmupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = WarmAsync(cancellationToken);
        return Task.CompletedTask;
    }

    private async Task WarmAsync(CancellationToken ct)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(3), ct);
            using var scope = _services.CreateScope();
            var quran = scope.ServiceProvider.GetRequiredService<IQuranTextService>();

            for (var i = 1; i <= 30; i++)
            {
                if (ct.IsCancellationRequested) return;
                await quran.GetParaAsync(i, ct);
                await Task.Delay(150, ct);
            }

            _logger.LogInformation("Qur'an juz cache warmed for paras 1–30.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Qur'an cache warmup did not finish.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
