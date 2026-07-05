using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Filters;

/// <summary>Muqaddam may only manage communities where they are Admin or Muqaddam role.</summary>
public static class MuqaddamAccessHelper
{
    private static readonly CommunityRole[] LeaderRoles = { CommunityRole.Admin, CommunityRole.Muqaddam };

    public static bool IsPlatformAdmin(ClaimsPrincipal user) =>
        user.IsInRole(Roles.SuperAdmin);

    public static async Task<List<int>> GetAssignedCommunityIdsAsync(
        IUnitOfWork unitOfWork, ClaimsPrincipal user, int? mosqueId = null)
    {
        if (IsPlatformAdmin(user))
        {
            var q = unitOfWork.Repository<Community>().QueryNoTracking()
                .Where(c => c.Type == CommunityType.Tariqa);
            if (mosqueId.HasValue) q = q.Where(c => c.MosqueId == mosqueId);
            return await q.Select(c => c.Id).ToListAsync();
        }

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var memberQuery = unitOfWork.Repository<CommunityMember>().QueryNoTracking()
            .Where(m => m.UserId == userId && LeaderRoles.Contains(m.Role));

        if (mosqueId.HasValue)
        {
            memberQuery = memberQuery.Where(m => m.Community!.MosqueId == mosqueId);
        }

        return await memberQuery.Select(m => m.CommunityId).Distinct().ToListAsync();
    }

    public static async Task<bool> CanManageCommunityAsync(
        IUnitOfWork unitOfWork, ClaimsPrincipal user, int communityId)
    {
        if (IsPlatformAdmin(user)) return true;
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return await unitOfWork.Repository<CommunityMember>().QueryNoTracking()
            .AnyAsync(m => m.CommunityId == communityId && m.UserId == userId && LeaderRoles.Contains(m.Role));
    }

    public static async Task<IActionResult?> RequireCommunityAccessAsync(
        IUnitOfWork unitOfWork, ClaimsPrincipal user, int communityId)
    {
        if (!await CanManageCommunityAsync(unitOfWork, user, communityId))
            return new ForbidResult();
        return null;
    }
}
