using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class PlatformConfigHelper
{
    public static async Task<bool> GetBoolAsync(IUnitOfWork unitOfWork, string key, bool defaultValue = false)
    {
        var row = await unitOfWork.Repository<PlatformConfig>().QueryNoTracking()
            .FirstOrDefaultAsync(c => c.Key == key);
        if (row == null || string.IsNullOrWhiteSpace(row.Value)) return defaultValue;
        return row.Value.Equals("true", StringComparison.OrdinalIgnoreCase) || row.Value == "1";
    }

    public static Task<bool> AllowMultiMosqueOwnershipAsync(IUnitOfWork unitOfWork) =>
        GetBoolAsync(unitOfWork, PlatformConfigKeys.AllowMultiMosqueOwnership, defaultValue: false);
}
