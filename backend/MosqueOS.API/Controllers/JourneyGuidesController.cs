using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/journey-guides")]
    [ApiController]
    public class JourneyGuidesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public JourneyGuidesController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] JourneyType? type)
        {
            var query = _db.JourneyGuides.AsNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var guide = await _db.JourneyGuides.AsNoTracking()
                .Include(g => g.Stages.OrderBy(s => s.OrderIndex))
                .FirstOrDefaultAsync(g => g.Id == id);
            return guide == null ? NotFound() : Ok(guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] JourneyGuide guide)
        {
            guide.Id = 0;
            _db.JourneyGuides.Add(guide);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = guide.Id }, guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/stages")]
        public async Task<IActionResult> AddStage(int id, [FromBody] JourneyStage stage)
        {
            stage.Id = 0;
            stage.GuideId = id;
            _db.JourneyStages.Add(stage);
            await _db.SaveChangesAsync();
            return Ok(stage);
        }
    }
}
