using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/journey-guides")]
    [ApiController]
    public class JourneyGuidesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public JourneyGuidesController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] JourneyType? type)
        {
            var query = _unitOfWork.Repository<JourneyGuide>().QueryNoTracking().AsQueryable();
            if (type.HasValue) query = query.Where(g => g.Type == type);
            return Ok(await query.ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var guide = await _unitOfWork.Repository<JourneyGuide>().QueryNoTracking()
                .Include(g => g.Stages.OrderBy(s => s.OrderIndex))
                .FirstOrDefaultAsync(g => g.Id == id);
            return guide == null ? NotFound() : Ok(guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] JourneyGuide guide)
        {
            guide.Id = 0;
            _unitOfWork.Repository<JourneyGuide>().Add(guide);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = guide.Id }, guide);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/stages")]
        public async Task<IActionResult> AddStage(int id, [FromBody] JourneyStage stage)
        {
            stage.Id = 0;
            stage.GuideId = id;
            _unitOfWork.Repository<JourneyStage>().Add(stage);
            await _unitOfWork.SaveChangesAsync();
            return Ok(stage);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{guideId:int}/stages/{stageId:int}")]
        public async Task<IActionResult> UpdateStage(int guideId, int stageId, [FromBody] JourneyStage input)
        {
            var stage = await _unitOfWork.Repository<JourneyStage>().FindAsync(stageId);
            if (stage == null || stage.GuideId != guideId) return NotFound();
            stage.Title = input.Title;
            stage.Description = input.Description;
            stage.OrderIndex = input.OrderIndex;
            stage.Duas = input.Duas;
            stage.Notes = input.Notes;
            stage.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(stage);
        }

        /// <summary>Ensure a structured Hajj guide (days 8–13) exists for mobile/offline reading.</summary>
        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("ensure-hajj")]
        public async Task<IActionResult> EnsureHajjGuide()
        {
            var existing = await _unitOfWork.Repository<JourneyGuide>().Query()
                .Include(g => g.Stages)
                .FirstOrDefaultAsync(g => g.Type == JourneyType.Hajj);
            if (existing != null)
            {
                if (existing.Stages != null)
                    existing.Stages = existing.Stages.OrderBy(s => s.OrderIndex).ToList();
                return Ok(existing);
            }

            var guide = new JourneyGuide { Type = JourneyType.Hajj, Title = "Hajj — Days of Dhul Hijjah" };
            _unitOfWork.Repository<JourneyGuide>().Add(guide);
            await _unitOfWork.SaveChangesAsync();

            var stages = new (string Title, string Desc, string Duas, string Notes)[]
            {
                ("8th — Yaum at-Tarwiyah", "Enter ihram (if not already), travel to Mina, pray shortened prayers.", "Labayk Allahumma labayk", "Stay overnight in Mina."),
                ("9th — Day of Arafah", "Stand at Arafah from zuhr to maghrib in dua and remembrance.", "Best dua of Arafah: La ilaha illallah...", "The heart of Hajj."),
                ("10th — Yaum an-Nahr", "Leave for Muzdalifah overnight then Mina: ramy, sacrifice, halq/taqsir, Tawaf al-Ifadah.", "Takbir and du'a after stoning", "First day of Eid."),
                ("11th — Days of Tashreeq", "Remain in Mina; stone the three jamaraat after zuhr.", "Allah akbar after each pebble", "Eat from sacrifice if available."),
                ("12th — Days of Tashreeq", "Stone the jamaraat; may leave Mina after stoning if departing early.", "Same stoning duas", "Optional early departure."),
                ("13th — Final Tashreeq", "If still in Mina, stone then proceed to farewell tawaf.", "Tawaf al-Wada duas", "Complete with calm farewell.")
            };
            var i = 1;
            foreach (var s in stages)
            {
                _unitOfWork.Repository<JourneyStage>().Add(new JourneyStage
                {
                    GuideId = guide.Id,
                    OrderIndex = i++,
                    Title = s.Title,
                    Description = s.Desc,
                    Duas = s.Duas,
                    Notes = s.Notes
                });
            }
            await _unitOfWork.SaveChangesAsync();
            return Ok(await _unitOfWork.Repository<JourneyGuide>().QueryNoTracking()
                .Include(g => g.Stages)
                .FirstAsync(g => g.Id == guide.Id));
        }
    }
}
