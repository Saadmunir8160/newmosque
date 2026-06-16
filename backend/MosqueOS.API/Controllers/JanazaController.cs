using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/janaza")]
    [ApiController]
    public class JanazaController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public JanazaController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId) =>
            Ok(await _unitOfWork.Repository<JanazaAnnouncement>().QueryNoTracking()
                .Where(j => j.MosqueId == mosqueId)
                .OrderByDescending(j => j.JanazaDate)
                .ToListAsync());

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<JanazaAnnouncement>().QueryNoTracking()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            return item == null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] JanazaAnnouncement input)
        {
            input.Id = 0;
            input.MosqueId = mosqueId;
            _unitOfWork.Repository<JanazaAnnouncement>().Add(input);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = input.Id }, input);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<JanazaAnnouncement>().Query()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _unitOfWork.Repository<JanazaAnnouncement>().Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }
    }

    [Route("api/v1/mosques/{mosqueId:int}/reading-campaigns")]
    [ApiController]
    public class DeathReadingsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public DeathReadingsController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId) =>
            Ok(await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Where(c => c.MosqueId == mosqueId && c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync());

        /// <summary>Community participation view: allocations and who has completed.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Include(c => c.Allocations)
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            return Ok(new
            {
                campaign,
                totalAllocations = campaign.Allocations.Count,
                completed = campaign.Allocations.Count(a => a.Status == ReadingAllocationStatus.Completed)
            });
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] ReadingCampaign campaign)
        {
            campaign.Id = 0;
            campaign.MosqueId = mosqueId;
            campaign.CreatedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _unitOfWork.Repository<ReadingCampaign>().Add(campaign);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = campaign.Id }, campaign);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/allocations")]
        public async Task<IActionResult> AddAllocation(int mosqueId, int id, [FromBody] ReadingAllocation allocation)
        {
            allocation.Id = 0;
            allocation.CampaignId = id;
            _unitOfWork.Repository<ReadingAllocation>().Add(allocation);
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }

        /// <summary>User claims an unassigned portion.</summary>
        [Authorize]
        [HttpPost("allocations/{allocationId:int}/claim")]
        public async Task<IActionResult> ClaimAllocation(int mosqueId, int allocationId)
        {
            var allocation = await _unitOfWork.Repository<ReadingAllocation>().FindAsync(allocationId);
            if (allocation == null) return NotFound();
            if (allocation.UserId != null) return Conflict(new { message = "Already assigned." });

            allocation.UserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            allocation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }

        [Authorize]
        [HttpPost("allocations/{allocationId:int}/complete")]
        public async Task<IActionResult> CompleteAllocation(int mosqueId, int allocationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var allocation = await _unitOfWork.Repository<ReadingAllocation>().Query()
                .FirstOrDefaultAsync(a => a.Id == allocationId);
            if (allocation == null) return NotFound();

            if (allocation.UserId != null && allocation.UserId != userId)
                return Conflict(new { message = "This portion is assigned to another member." });

            if (allocation.Status == ReadingAllocationStatus.Completed)
                return Ok(allocation);

            if (allocation.UserId == null)
                allocation.UserId = userId;

            allocation.Status = ReadingAllocationStatus.Completed;
            allocation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }
    }
}
