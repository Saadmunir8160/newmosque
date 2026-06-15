using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/ritual-guides")]
    [ApiController]
    public class RitualGuidesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public RitualGuidesController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] RitualGuideType? type)
        {
            var query = _unitOfWork.Repository<RitualGuide>().QueryNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.ToListAsync());
        }

        /// <summary>Step-by-step guide with dua attached to each step where applicable.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var guide = await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                .Include(g => g.Steps.OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.Dua)
                .FirstOrDefaultAsync(g => g.Id == id);
            return guide == null ? NotFound() : Ok(guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RitualGuide guide)
        {
            guide.Id = 0;
            _unitOfWork.Repository<RitualGuide>().Add(guide);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = guide.Id }, guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/steps")]
        public async Task<IActionResult> AddStep(int id, [FromBody] RitualStep step)
        {
            step.Id = 0;
            step.GuideId = id;
            _unitOfWork.Repository<RitualStep>().Add(step);
            await _unitOfWork.SaveChangesAsync();
            return Ok(step);
        }
    }
}
