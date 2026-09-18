using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.Common;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/participation")]
    [ApiController]
    [RequireMosqueModule("Participation")]
    public class ParticipationController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly MosqueOS.API.Services.MosqueAccessService _mosqueAccess;

        public ParticipationController(IUnitOfWork unitOfWork, MosqueOS.API.Services.MosqueAccessService mosqueAccess)
        {
            _unitOfWork = unitOfWork;
            _mosqueAccess = mosqueAccess;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] ParticipationType? type, [FromQuery] bool all = false)
        {
            var query = _unitOfWork.Repository<ParticipationOpportunity>().QueryNoTracking()
                .Where(o => o.MosqueId == mosqueId);

            bool isAdmin = User.Identity?.IsAuthenticated == true &&
                           await _mosqueAccess.CanAccessMosqueAsync(User, mosqueId) == null;

            if (!all || !isAdmin)
            {
                query = query.Where(o => o.IsActive);
            }

            if (type.HasValue) query = query.Where(o => o.Type == type);
            return Ok(await query.OrderBy(o => o.Date).ToListAsync());
        }

        [Authorize]
        [HttpGet("mine")]
        public async Task<IActionResult> MyRegistrations(int mosqueId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var ids = await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
                .Include(r => r.Opportunity)
                .Where(r => r.UserId == userId && r.Opportunity!.MosqueId == mosqueId)
                .Select(r => r.OpportunityId)
                .ToListAsync();
            return Ok(ids);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] ParticipationOpportunity opportunity)
        {
            opportunity.Id = 0;
            opportunity.MosqueId = mosqueId;
            _unitOfWork.Repository<ParticipationOpportunity>().Add(opportunity);
            await _unitOfWork.SaveChangesAsync();
            return Ok(opportunity);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPut("{opportunityId:int}")]
        public async Task<IActionResult> Update(int mosqueId, int opportunityId, [FromBody] ParticipationOpportunity input)
        {
            var opp = await _unitOfWork.Repository<ParticipationOpportunity>().FindAsync(opportunityId);
            if (opp == null || opp.MosqueId != mosqueId) return NotFound();

            opp.Title = input.Title;
            opp.Description = input.Description;
            opp.Type = input.Type;
            opp.Date = input.Date;
            opp.IsActive = input.IsActive;

            _unitOfWork.Repository<ParticipationOpportunity>().Update(opp);
            await _unitOfWork.SaveChangesAsync();
            return Ok(opp);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{opportunityId:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int opportunityId)
        {
            var opp = await _unitOfWork.Repository<ParticipationOpportunity>().FindAsync(opportunityId);
            if (opp == null || opp.MosqueId != mosqueId) return NotFound();

            // Prevent deleting if people are registered (just deactivate instead)
            bool hasReg = await _unitOfWork.Repository<ParticipationRegistration>().Query().AnyAsync(r => r.OpportunityId == opportunityId);
            if (hasReg)
            {
                opp.IsActive = false;
                _unitOfWork.Repository<ParticipationOpportunity>().Update(opp);
            }
            else
            {
                _unitOfWork.Repository<ParticipationOpportunity>().Remove(opp);
            }

            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        [Authorize]
        [HttpPost("{opportunityId:int}/register")]
        public async Task<IActionResult> Register(int mosqueId, int opportunityId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (await _unitOfWork.Repository<ParticipationRegistration>().Query()
                .AnyAsync(r => r.OpportunityId == opportunityId && r.UserId == userId))
                return Conflict(new ApiMessageResponse { Message = "Already registered." });

            var registration = new ParticipationRegistration
            {
                OpportunityId = opportunityId,
                UserId = userId
            };
            _unitOfWork.Repository<ParticipationRegistration>().Add(registration);
            await _unitOfWork.SaveChangesAsync();
            return Ok(registration);
        }

        [Authorize(Roles = Roles.ParticipationManagers)]
        [HttpGet("{opportunityId:int}/registrations")]
        public async Task<IActionResult> GetRegistrations(int mosqueId, int opportunityId) =>
            Ok(await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
                .Where(r => r.OpportunityId == opportunityId)
                .ToListAsync());
    }
}
