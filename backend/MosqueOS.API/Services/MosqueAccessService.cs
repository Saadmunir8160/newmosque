using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Services;

/// <summary>Resolves which mosque a staff user may access (Mosque Admin scope).</summary>
public class MosqueAccessService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;

    public MosqueAccessService(IUnitOfWork unitOfWork, UserManager<ApplicationUser> userManager)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
    }

    public bool IsSuperAdmin(ClaimsPrincipal user) => user.IsInRole(Roles.SuperAdmin);

    public async Task<List<Mosque>> GetOwnedMosquesAsync(string userId) =>
        await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .Where(m => m.OwnerId == userId && !m.IsDeleted)
            .OrderByDescending(m => m.Status == MosqueStatus.Active)
            .ThenByDescending(m => m.Id)
            .ToListAsync();

    public async Task<List<int>> GetAccessibleMosqueIdsAsync(ClaimsPrincipal user)
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return [];

        if (IsSuperAdmin(user))
            return await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => !m.IsDeleted).Select(m => m.Id).ToListAsync();

        var ids = new HashSet<int>();
        foreach (var m in await GetOwnedMosquesAsync(userId))
            ids.Add(m.Id);

        var appUser = await _userManager.FindByIdAsync(userId);
        if (appUser?.HomeMosqueId != null)
            ids.Add(appUser.HomeMosqueId.Value);

        return ids.ToList();
    }

    public async Task<int?> ResolveMosqueIdAsync(ClaimsPrincipal user)
    {
        if (IsSuperAdmin(user)) return null;

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return null;

        if (user.IsInRole(Roles.MosqueOwner) || user.IsInRole(Roles.MosqueAdmin))
        {
            var owned = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
                .Where(m => m.OwnerId == userId)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync();
            if (owned.HasValue) return owned;
        }

        if (user.IsInRole(Roles.MosqueAdmin) || user.IsInRole(Roles.MosqueOwner))
        {
            var appUser = await _userManager.FindByIdAsync(userId);
            return appUser?.HomeMosqueId;
        }

        var fallbackUser = await _userManager.FindByIdAsync(userId);
        return fallbackUser?.HomeMosqueId;
    }

    public async Task<bool> CanAccessMosqueAsync(ClaimsPrincipal user, int mosqueId)
    {
        if (IsSuperAdmin(user)) return true;

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return false;

        var isOwner = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .AnyAsync(m => m.Id == mosqueId && m.OwnerId == userId);
        if (isOwner) return true;

        if (user.IsInRole(Roles.MosqueAdmin))
        {
            var appUser = await _userManager.FindByIdAsync(userId);
            return appUser?.HomeMosqueId == mosqueId;
        }

        if (user.IsInRole(Roles.MosqueOwner))
            return false;

        var allowed = await ResolveMosqueIdAsync(user);
        return allowed == mosqueId;
    }

    public async Task<bool> CanEditMosqueAsync(ClaimsPrincipal user, Mosque mosque)
    {
        if (mosque.Status == MosqueStatus.Unclaimed && !IsSuperAdmin(user))
            return false;

        if (IsSuperAdmin(user)) return true;

        if (mosque.Status != MosqueStatus.Active)
            return false;

        return await CanAccessMosqueAsync(user, mosque.Id);
    }
}
