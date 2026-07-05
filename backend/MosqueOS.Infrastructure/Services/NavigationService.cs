using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Application.DTOs;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.Infrastructure.Services;

public class NavigationService : INavigationService
{
    private readonly ApplicationDbContext _db;

    public NavigationService(ApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<NavigationSectionDto>> GetMenuForRolesAsync(
        IEnumerable<string> roles,
        IEnumerable<string> permissions,
        IEnumerable<MosqueStatus> ownedMosqueStatuses)
    {
        var roleSet = roles.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var permSet = permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var statusList = ownedMosqueStatuses.ToList();
        var hasActiveMosque = statusList.Any(s => s == MosqueStatus.Active);
        var restrictByMosqueStatus = !hasActiveMosque
            && (roleSet.Contains(Roles.MosqueOwner) || roleSet.Contains(Roles.MosqueAdmin));

        if (roleSet.Contains(Roles.SuperAdmin))
        {
            var superItems = await _db.NavigationMenuItems.AsNoTracking()
                .Where(n => n.IsActive && n.RequiredRole == Roles.SuperAdmin)
                .OrderBy(n => n.Section).ThenBy(n => n.SortOrder)
                .ToListAsync();
            return GroupSections(superItems);
        }

        var items = await _db.NavigationMenuItems.AsNoTracking()
            .Where(n => n.IsActive)
            .OrderBy(n => n.Section).ThenBy(n => n.SortOrder)
            .ToListAsync();

        var filtered = items.Where(n =>
        {
            if (!string.IsNullOrEmpty(n.RequiredRole) && !roleSet.Contains(n.RequiredRole))
                return false;
            if (!string.IsNullOrEmpty(n.RequiredPermission) && !permSet.Contains(n.RequiredPermission))
                return false;
            if (string.IsNullOrEmpty(n.RequiredRole) && string.IsNullOrEmpty(n.RequiredPermission))
                return roleSet.Contains(Roles.Member) || roleSet.Contains(Roles.Parent);
            if (restrictByMosqueStatus && n.RequiresActiveMosque)
                return false;
            return true;
        }).ToList();

        return GroupSections(filtered);
    }

    private static IReadOnlyList<NavigationSectionDto> GroupSections(List<NavigationMenuItem> items)
    {
        return items
            .GroupBy(i => i.Section)
            .Select(g => new NavigationSectionDto
            {
                Section = g.Key,
                Items = g.Select(i => new NavigationItemDto
                {
                    Label = i.Label,
                    Route = i.Route,
                    Section = i.Section,
                    Icon = i.Icon,
                    RequiredPermission = i.RequiredPermission
                }).ToList()
            })
            .ToList();
    }
}
