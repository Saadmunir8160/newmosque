using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/announcements")]
    [ApiController]
    [RequireMosqueModule("Announcements")]
    public class AnnouncementsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly MosqueAccessService _mosqueAccess;

        public AnnouncementsController(IUnitOfWork unitOfWork, MosqueAccessService mosqueAccess)
        {
            _unitOfWork = unitOfWork;
            _mosqueAccess = mosqueAccess;
        }

        /// <summary>Public: published announcements only. Admins see all via ?all=true.</summary>
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            int mosqueId, [FromQuery] bool all = false,
            [FromQuery] string? search = null, [FromQuery] PublishStatus? status = null)
        {
            var query = _unitOfWork.Repository<Announcement>().QueryNoTracking().Where(a => a.MosqueId == mosqueId);

            var isAdmin = User.IsInRole(Roles.SuperAdmin) || User.IsInRole(Roles.MosqueAdmin)
                || User.IsInRole(Roles.MosqueOwner);
            if (!all || !isAdmin)
                query = query.Where(a => a.Status == PublishStatus.Published);
            else if (status.HasValue)
                query = query.Where(a => a.Status == status);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(a => a.Title.Contains(term)
                    || (a.Summary != null && a.Summary.Contains(term))
                    || (a.Body != null && a.Body.Contains(term)));
            }

            return Ok(await query
                .OrderByDescending(a => a.IsFeatured)
                .ThenByDescending(a => a.PublishedAt ?? a.CreatedAt)
                .ToListAsync());
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<Announcement>().QueryNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            var isAdmin = User.IsInRole(Roles.SuperAdmin) || User.IsInRole(Roles.MosqueAdmin)
                || User.IsInRole(Roles.MosqueOwner) || User.IsInRole(Roles.ContentEditor);
            if (!isAdmin && item.Status != PublishStatus.Published)
                return NotFound();

            return Ok(item);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] Announcement input)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            input.Id = 0;
            input.MosqueId = mosqueId;
            input.CreatedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (input.Status == PublishStatus.Published)
                input.PublishedAt = DateTime.UtcNow;

            _unitOfWork.Repository<Announcement>().Add(input);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = input.Id }, input);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int mosqueId, int id, [FromBody] Announcement input)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<Announcement>().Query()
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.Summary = input.Summary;
            item.Body = input.Body;
            item.ImageUrl = input.ImageUrl;
            item.IsFeatured = input.IsFeatured;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/publish")]
        public async Task<IActionResult> Publish(int mosqueId, int id) =>
            await SetStatus(mosqueId, id, PublishStatus.Published);

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/unpublish")]
        public async Task<IActionResult> Unpublish(int mosqueId, int id) =>
            await SetStatus(mosqueId, id, PublishStatus.Unpublished);

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int id)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<Announcement>().Query()
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _unitOfWork.Repository<Announcement>().Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        private async Task<IActionResult> SetStatus(int mosqueId, int id, PublishStatus status)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<Announcement>().Query()
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Status = status;
            if (status == PublishStatus.Published && item.PublishedAt == null)
                item.PublishedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }
    }
}
