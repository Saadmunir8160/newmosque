using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Application.DTOs;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers;

[Route("api/v1/navigation")]
[ApiController]
[Authorize]
public class NavigationController : ControllerBase
{
    private readonly INavigationService _navigation;
    private readonly IPermissionService _permissions;
    private readonly UserManager<ApplicationUser> _userManager;

    public NavigationController(
        INavigationService navigation,
        IPermissionService permissions,
        UserManager<ApplicationUser> userManager)
    {
        _navigation = navigation;
        _permissions = permissions;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetMenu()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        var perms = await _permissions.GetPermissionsForRolesAsync(roles);
        var nav = await _navigation.GetMenuForRolesAsync(roles, perms);

        return Ok(new UserAccessDto
        {
            Roles = roles.ToList(),
            Permissions = perms.ToList(),
            Navigation = nav
        });
    }
}
