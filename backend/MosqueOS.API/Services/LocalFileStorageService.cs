using Microsoft.Extensions.Options;

namespace MosqueOS.API.Services;

/// <summary>Local wwwroot file storage (default). Swap to Azure via Storage:Provider=Azure.</summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly StorageOptions _options;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IWebHostEnvironment env,
        IOptions<StorageOptions> options,
        ILogger<LocalFileStorageService> logger)
    {
        _env = env;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> SaveAsync(
        Stream content,
        string relativeFolder,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, _options.LocalRoot);
        var folder = Path.Combine(webRoot, relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folder);

        var safeName = Path.GetFileName(fileName);
        var fullPath = Path.Combine(folder, safeName);
        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        if (content.CanSeek) content.Position = 0;
        await content.CopyToAsync(fs, ct);

        var url = "/" + string.Join('/', relativeFolder.Trim('/').Replace('\\', '/'), safeName);
        _logger.LogDebug("Stored file locally at {Url}", url);
        return url;
    }

    public Task DeleteAsync(string publicUrlOrRelativePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(publicUrlOrRelativePath)) return Task.CompletedTask;
        if (publicUrlOrRelativePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return Task.CompletedTask;

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, _options.LocalRoot);
        var relative = publicUrlOrRelativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(webRoot, relative);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            _logger.LogDebug("Deleted local file {Path}", fullPath);
        }
        return Task.CompletedTask;
    }
}
