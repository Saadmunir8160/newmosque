using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Member;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/events")]
    [ApiController]
    [RequireMosqueModule("Events")]
    public class EventsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly MosqueAccessService _mosqueAccess;

        public EventsController(IUnitOfWork unitOfWork, MosqueAccessService mosqueAccess)
        {
            _unitOfWork = unitOfWork;
            _mosqueAccess = mosqueAccess;
        }

        /// <summary>
        /// Public endpoint to get all events for a mosque.
        /// ✅ FIX: Added [AllowAnonymous] so guest users can see events on landing page.
        /// </summary>
        [AllowAnonymous] // ✅ Guest users ke liye allow karo
        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] bool upcomingOnly = true, [FromQuery] string? search = null, [FromQuery] EventType? type = null, [FromQuery] EventStatus? status = null)
        {
            var query = _unitOfWork.Repository<Event>().QueryNoTracking().Where(e => e.MosqueId == mosqueId);
            if (upcomingOnly)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                query = query.Where(e => e.Date >= today);
            }
            if (type.HasValue) query = query.Where(e => e.EventType == type);
            if (status.HasValue) query = query.Where(e => e.Status == status);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e => e.Title.Contains(term) || e.Description.Contains(term) || (e.Location != null && e.Location.Contains(term)));
            }
            return Ok(await query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ToListAsync());
        }

        /// <summary>
        /// Public endpoint to get a single event by ID.
        /// ✅ FIX: Added [AllowAnonymous] so guest users can view event details.
        /// </summary>
        [AllowAnonymous] // ✅ Guest users ke liye allow karo
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<Event>().QueryNoTracking()
                .Include(e => e.WirdCollection)
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            return item == null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] Event input)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            input.Id = 0;
            input.MosqueId = mosqueId;
            _unitOfWork.Repository<Event>().Add(input);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = input.Id }, input);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int mosqueId, int id, [FromBody] Event input)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<Event>().Query()
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

            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int id)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<Event>().Query()
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _unitOfWork.Repository<Event>().Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        [Authorize]
        [HttpGet("mine/registrations")]
        public async Task<IActionResult> MyRegistrations(int mosqueId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var rows = await _unitOfWork.Repository<EventRegistration>().QueryNoTracking()
                .Include(r => r.Event)
                .Where(r => r.UserId == userId && r.Event!.MosqueId == mosqueId && r.Status != RegistrationStatus.Cancelled)
                .OrderBy(r => r.Event!.Date)
                .Select(r => new EventRegistrationDto
                {
                    Id = r.Id,
                    EventId = r.EventId,
                    EventTitle = r.Event!.Title,
                    EventDate = r.Event.Date,
                    Status = r.Status.ToString(),
                    RegisteredAt = r.RegisteredAt
                })
                .ToListAsync();
            return Ok(rows);
        }

        [Authorize]
        [HttpPost("{id:int}/register")]
        public async Task<IActionResult> Register(int mosqueId, int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var ev = await _unitOfWork.Repository<Event>().QueryNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id && e.MosqueId == mosqueId);
            if (ev == null) return NotFound();
            if (ev.Status != EventStatus.Scheduled)
                return BadRequest(new ApiMessageResponse { Message = "Event is not open for registration." });

            if (await _unitOfWork.Repository<EventRegistration>().Query()
                .AnyAsync(r => r.EventId == id && r.UserId == userId && r.Status != RegistrationStatus.Cancelled))
                return Conflict(new ApiMessageResponse { Message = "Already registered for this event." });

            var reg = new EventRegistration { EventId = id, UserId = userId };
            _unitOfWork.Repository<EventRegistration>().Add(reg);
            await _unitOfWork.SaveChangesAsync();
            return Ok(reg);
        }

        [Authorize]
        [HttpDelete("{id:int}/register")]
        public async Task<IActionResult> CancelRegistration(int mosqueId, int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var reg = await _unitOfWork.Repository<EventRegistration>().Query()
                .Include(r => r.Event)
                .FirstOrDefaultAsync(r => r.EventId == id && r.UserId == userId && r.Event!.MosqueId == mosqueId);
            if (reg == null) return NotFound();
            reg.Status = RegistrationStatus.Cancelled;
            reg.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(reg);
        }
    }
}