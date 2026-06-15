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
    [Route("api/v1/mosques/{mosqueId:int}/participation")]
    [ApiController]
    public class ParticipationController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public ParticipationController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] ParticipationType? type)
        {
            var query = _unitOfWork.Repository<ParticipationOpportunity>().QueryNoTracking()
                .Where(o => o.MosqueId == mosqueId && o.IsActive);
            if (type.HasValue) query = query.Where(o => o.Type == type);
            return Ok(await query.OrderBy(o => o.Date).ToListAsync());
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

        [Authorize]
        [HttpPost("{opportunityId:int}/register")]
        public async Task<IActionResult> Register(int mosqueId, int opportunityId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (await _unitOfWork.Repository<ParticipationRegistration>().Query()
                .AnyAsync(r => r.OpportunityId == opportunityId && r.UserId == userId))
                return Conflict(new { message = "Already registered." });

            var registration = new ParticipationRegistration
            {
                OpportunityId = opportunityId,
                UserId = userId
            };
            _unitOfWork.Repository<ParticipationRegistration>().Add(registration);
            await _unitOfWork.SaveChangesAsync();
            return Ok(registration);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpGet("{opportunityId:int}/registrations")]
        public async Task<IActionResult> GetRegistrations(int mosqueId, int opportunityId) =>
            Ok(await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
                .Where(r => r.OpportunityId == opportunityId)
                .ToListAsync());
    }
}
