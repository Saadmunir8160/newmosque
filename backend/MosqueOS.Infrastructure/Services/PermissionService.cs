using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly ApplicationDbContext _db;
    private readonly RoleManager<IdentityRole> _roleManager;

    public PermissionService(ApplicationDbContext db, RoleManager<IdentityRole> roleManager)
    {
        _db = db;
        _roleManager = roleManager;
    }

    public async Task<IReadOnlyList<string>> GetPermissionsForRolesAsync(IEnumerable<string> roles)
    {
        var roleList = roles.ToList();
        if (roleList.Contains(Roles.SuperAdmin))
        {
            return await _db.Permissions.AsNoTracking()
                .Select(p => p.Code)
                .ToListAsync();
        }

        var roleIds = new List<string>();
        foreach (var role in roleList)
        {
            var entity = await _roleManager.FindByNameAsync(role);
            if (entity != null) roleIds.Add(entity.Id);
        }

        if (roleIds.Count == 0) return Array.Empty<string>();

        return await _db.RolePermissions.AsNoTracking()
            .Include(rp => rp.Permission)
            .Where(rp => roleIds.Contains(rp.RoleId) && rp.Permission != null)
            .Select(rp => rp.Permission!.Code)
            .Distinct()
            .ToListAsync();
    }

    public async Task<bool> HasPermissionAsync(IEnumerable<string> roles, string permissionCode)
    {
        if (roles.Contains(Roles.SuperAdmin)) return true;
        var perms = await GetPermissionsForRolesAsync(roles);
        return perms.Contains(permissionCode, StringComparer.OrdinalIgnoreCase);
    }
}
