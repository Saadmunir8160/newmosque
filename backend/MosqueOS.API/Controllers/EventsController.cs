using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/events")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public EventsController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] bool upcomingOnly = true)
        {
            var query = _db.Events.AsNoTracking().Where(e => e.MosqueId == mosqueId);
            if (upcomingOnly)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                query = query.Where(e => e.Date >= today);
            }
            return Ok(await query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _db.Events.AsNoTracking()
                .Include(e => e.WirdCollection)
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            return item == null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] Event input)
        {
            input.Id = 0;
            input.MosqueId = mosqueId;
            _db.Events.Add(input);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = input.Id }, input);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int mosqueId, int id, [FromBody] Event input)
        {
            var item = await _db.Events
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Title = input.Title;
            item.Description = input.Description;
            item.Date = input.Date;
            item.StartTime = input.StartTime;
            item.EndTime = input.EndTime;
            item.Location = input.Location;
            item.Speaker = input.Speaker;
            item.IsRecurring = input.IsRecurring;
            item.Status = input.Status;
            item.EventType = input.EventType;
            item.WirdCollectionId = input.WirdCollectionId;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int id)
        {
            var item = await _db.Events
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _db.Events.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
