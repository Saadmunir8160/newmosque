using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Services;
using System.Security.Claims;

namespace MosqueOS.API.Filters;

/// <summary>Shared mosque tenancy checks for admin resource APIs.</summary>
public static class MosqueAccessHelper
{
    public static async Task<IActionResult?> RequireAccessAsync(
        MosqueAccessService access, ClaimsPrincipal user, int mosqueId)
    {
        if (access.IsSuperAdmin(user))
            return null;

        if (!await access.CanAccessMosqueAsync(user, mosqueId))
            return new ForbidResult();
        return null;
    }
}
