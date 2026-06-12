using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/announcements")]
    [ApiController]
    public class AnnouncementsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public AnnouncementsController(ApplicationDbContext db) => _db = db;

        /// <summary>Public: published announcements only. Admins see all via ?all=true.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] bool all = false)
        {
            var query = _db.Announcements.AsNoTracking().Where(a => a.MosqueId == mosqueId);

            var isAdmin = User.IsInRole(Roles.SuperAdmin) || User.IsInRole(Roles.MosqueAdmin);
            if (!all || !isAdmin)
                query = query.Where(a => a.Status == PublishStatus.Published);

            return Ok(await query
                .OrderByDescending(a => a.IsFeatured)
                .ThenByDescending(a => a.PublishedAt ?? a.CreatedAt)
                .ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _db.Announcements.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            return item == null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] Announcement input)
        {
            input.Id = 0;
            input.MosqueId = mosqueId;
            input.CreatedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (input.Status == PublishStatus.Published)
                input.PublishedAt = DateTime.UtcNow;

            _db.Announcements.Add(input);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = input.Id }, input);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int mosqueId, int id, [FromBody] Announcement input)
        {
            var item = await _db.Announcements
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.Summary = input.Summary;
            item.Body = input.Body;
            item.ImageUrl = input.ImageUrl;
            item.IsFeatured = input.IsFeatured;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
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
            var item = await _db.Announcements
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _db.Announcements.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private async Task<IActionResult> SetStatus(int mosqueId, int id, PublishStatus status)
        {
            var item = await _db.Announcements
                .FirstOrDefaultAsync(a => a.Id == id && a.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Status = status;
            if (status == PublishStatus.Published && item.PublishedAt == null)
                item.PublishedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(item);
        }
    }
}
