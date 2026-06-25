using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Filters;

/// <summary>Ensure teachers only access their own assigned classes.</summary>
public static class TeacherAccessHelper
{
    public static bool IsAdmin(ClaimsPrincipal user) =>
        user.IsInRole(Roles.SuperAdmin) || user.IsInRole(Roles.MosqueOwner) || user.IsInRole(Roles.MosqueAdmin);

    public static async Task<MadrassahClass?> GetClassIfAllowedAsync(
        IUnitOfWork unitOfWork, ClaimsPrincipal user, int classId)
    {
        var cls = await unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Include(c => c.Enrolments).ThenInclude(e => e.Student)
            .FirstOrDefaultAsync(c => c.Id == classId);
        if (cls == null) return null;
        if (IsAdmin(user)) return cls;

        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return cls.TeacherId == userId ? cls : null;
    }

    public static async Task<IActionResult?> RequireClassAccessAsync(
        IUnitOfWork unitOfWork, ClaimsPrincipal user, int classId)
    {
        var cls = await GetClassIfAllowedAsync(unitOfWork, user, classId);
        if (cls == null) return new ForbidResult();
        return null;
    }

    public static IQueryable<MadrassahClass> MyClassesQuery(IUnitOfWork unitOfWork, ClaimsPrincipal user)
    {
        var query = unitOfWork.Repository<MadrassahClass>().QueryNoTracking()
            .Include(c => c.Enrolments).ThenInclude(e => e.Student);
        if (IsAdmin(user)) return query;
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return query.Where(c => c.TeacherId == userId);
    }
}
