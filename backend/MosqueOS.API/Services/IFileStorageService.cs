namespace MosqueOS.API.Services;

public class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>Local (default) or Azure.</summary>
    public string Provider { get; set; } = "Local";

    public string LocalRoot { get; set; } = "wwwroot";

    public string? AzureConnectionString { get; set; }
    public string AzureContainer { get; set; } = "mosqueos-uploads";

    /// <summary>Public base URL for Azure blobs (CDN or container endpoint). Optional.</summary>
    public string? PublicBaseUrl { get; set; }
}

public interface IFileStorageService
{
    /// <summary>Stores a file under a relative folder (e.g. uploads/claims/12) and returns a public URL path.</summary>
    Task<string> SaveAsync(Stream content, string relativeFolder, string fileName, string contentType, CancellationToken ct = default);

    Task DeleteAsync(string publicUrlOrRelativePath, CancellationToken ct = default);
}
