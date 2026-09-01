using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Ritual;
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
            var query = _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                .Where(g => !g.IsDeleted);
            if (type.HasValue) query = query.Where(g => g.Type == type);

            var guides = await query
                .OrderByDescending(g => g.UpdatedAt ?? g.CreatedAt)
                .Select(g => new RitualGuideListItem
                {
                    Id = g.Id,
                    Title = g.Title,
                    Type = g.Type.ToString(),
                    StepCount = g.Steps.Count(s => !s.IsDeleted),
                    CreatedAt = g.CreatedAt,
                    UpdatedAt = g.UpdatedAt
                })
                .ToListAsync();

            return Ok(guides);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var guide = await _unitOfWork.Repository<RitualGuide>().QueryNoTracking()
                .Include(g => g.Steps.Where(s => !s.IsDeleted).OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.Dua)
                .FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted);
            return guide == null ? NotFound() : Ok(guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertRitualGuideRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Title is required.");

            var type = Enum.TryParse<RitualGuideType>(request.Type, true, out var parsed)
                ? parsed
                : RitualGuideType.Wudu;

            var guide = new RitualGuide
            {
                Title = request.Title.Trim(),
                Type = type
            };
            _unitOfWork.Repository<RitualGuide>().Add(guide);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = guide.Id }, guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpsertRitualGuideRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Title is required.");

            var guide = await _unitOfWork.Repository<RitualGuide>().FindAsync(id);
            if (guide == null || guide.IsDeleted) return NotFound();

            var type = Enum.TryParse<RitualGuideType>(request.Type, true, out var parsed)
                ? parsed
                : guide.Type;

            guide.Title = request.Title.Trim();
            guide.Type = type;
            guide.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var guide = await _unitOfWork.Repository<RitualGuide>().Query()
                .Include(g => g.Steps)
                .FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted);
            if (guide == null) return NotFound();

            guide.IsDeleted = true;
            guide.DeletedAt = DateTime.UtcNow;
            guide.UpdatedAt = DateTime.UtcNow;
            foreach (var step in guide.Steps.Where(s => !s.IsDeleted))
            {
                step.IsDeleted = true;
                step.DeletedAt = DateTime.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/steps")]
        public async Task<IActionResult> AddStep(int id, [FromBody] UpsertRitualStepRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Step title is required.");

            var guide = await _unitOfWork.Repository<RitualGuide>().FindAsync(id);
            if (guide == null || guide.IsDeleted) return NotFound();

            var step = new RitualStep
            {
                GuideId = id,
                Title = request.Title.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                OrderIndex = request.OrderIndex > 0 ? request.OrderIndex : 1,
                ImageUrl = request.ImageUrl?.Trim(),
                DuaId = request.DuaId
            };
            _unitOfWork.Repository<RitualStep>().Add(step);
            guide.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(step);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{guideId:int}/steps/{stepId:int}")]
        public async Task<IActionResult> UpdateStep(int guideId, int stepId, [FromBody] UpsertRitualStepRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Step title is required.");

            var step = await _unitOfWork.Repository<RitualStep>().FindAsync(stepId);
            if (step == null || step.IsDeleted || step.GuideId != guideId) return NotFound();

            step.Title = request.Title.Trim();
            step.Description = request.Description?.Trim() ?? string.Empty;
            step.OrderIndex = request.OrderIndex > 0 ? request.OrderIndex : step.OrderIndex;
            if (request.ImageUrl != null) step.ImageUrl = request.ImageUrl.Trim();
            if (request.DuaId.HasValue) step.DuaId = request.DuaId;
            step.UpdatedAt = DateTime.UtcNow;

            var guide = await _unitOfWork.Repository<RitualGuide>().FindAsync(guideId);
            if (guide != null) guide.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(step);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpDelete("{guideId:int}/steps/{stepId:int}")]
        public async Task<IActionResult> DeleteStep(int guideId, int stepId)
        {
            var step = await _unitOfWork.Repository<RitualStep>().FindAsync(stepId);
            if (step == null || step.IsDeleted || step.GuideId != guideId) return NotFound();

            step.IsDeleted = true;
            step.DeletedAt = DateTime.UtcNow;
            step.UpdatedAt = DateTime.UtcNow;

            var guide = await _unitOfWork.Repository<RitualGuide>().FindAsync(guideId);
            if (guide != null) guide.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }
    }
}
