using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers;

[Route("api/v1/mosque")]
[ApiController]
public class MosqueProfileController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly MosqueAccessService _mosqueAccess;

    public MosqueProfileController(IUnitOfWork unitOfWork, MosqueAccessService mosqueAccess)
    {
        _unitOfWork = unitOfWork;
        _mosqueAccess = mosqueAccess;
    }

    [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins + "," + Roles.MosqueOwner)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProfile(int id, [FromBody] MosqueUpdateDto dto)
    {
        var mosque = await _unitOfWork.Repository<Mosque>().Query()
            .Include(m => m.Settings)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        if (mosque == null) return NotFound();

        if (!await _mosqueAccess.CanEditMosqueAsync(User, mosque))
            return Forbid();

        MosqueProfileFieldMapper.ApplyUpdate(mosque, dto);
        await _unitOfWork.SaveChangesAsync();
        return Ok(MosqueAdminProfileDto.FromEntity(mosque));
    }

    [Authorize(Roles = Roles.SuperAdmin + "," + Roles.Admins)]
    [HttpPut("{id:int}/settings")]
    public async Task<IActionResult> BulkSettings(int id, [FromBody] UpdateMosqueFeaturesRequest dto)
    {
        if (dto.Modules == null || dto.Modules.Count == 0)
            return BadRequest(new ApiMessageResponse { Message = "At least one module toggle is required." });

        if (!User.IsInRole(Roles.SuperAdmin))
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, id) is { } denied)
                return denied;
        }

        foreach (var toggle in dto.Modules)
        {
            if (string.IsNullOrWhiteSpace(toggle.ModuleKey)) continue;
            var setting = await _unitOfWork.Repository<MosqueSetting>().Query()
                .FirstOrDefaultAsync(s => s.MosqueId == id && s.ModuleKey == toggle.ModuleKey);

            if (setting == null)
            {
                setting = new MosqueSetting { MosqueId = id, ModuleKey = toggle.ModuleKey.Trim(), IsEnabled = toggle.IsEnabled };
                _unitOfWork.Repository<MosqueSetting>().Add(setting);
            }
            else
            {
                setting.IsEnabled = toggle.IsEnabled;
                setting.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        var settings = await _unitOfWork.Repository<MosqueSetting>().QueryNoTracking()
            .Where(s => s.MosqueId == id).ToListAsync();
        return Ok(settings);
    }
}
