using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/ritual-guides")]
    [ApiController]
    public class RitualGuidesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public RitualGuidesController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] RitualGuideType? type)
        {
            var query = _db.RitualGuides.AsNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.ToListAsync());
        }

        /// <summary>Step-by-step guide with dua attached to each step where applicable.</summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var guide = await _db.RitualGuides.AsNoTracking()
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
            _db.RitualGuides.Add(guide);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = guide.Id }, guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/steps")]
        public async Task<IActionResult> AddStep(int id, [FromBody] RitualStep step)
        {
            step.Id = 0;
            step.GuideId = id;
            _db.RitualSteps.Add(step);
            await _db.SaveChangesAsync();
            return Ok(step);
        }
    }
}
