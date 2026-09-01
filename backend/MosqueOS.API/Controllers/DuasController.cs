using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/duas")]
    [ApiController]
    public class DuasController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public DuasController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        /// <summary>Browse organised by category — not a flat dump (spec 3.9).</summary>
        [HttpGet("browse")]
        public async Task<IActionResult> Browse()
        {
            var duas = await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == ContentPublishStatus.Published)
                .OrderBy(d => d.Category).ThenBy(d => d.Title)
                .ToListAsync();

            var grouped = duas
                .GroupBy(d => string.IsNullOrWhiteSpace(d.Category) ? "general" : d.Category)
                .OrderBy(g => CategorySort(g.Key))
                .Select(g => new { category = g.Key, count = g.Count(), items = g.ToList() });

            return Ok(grouped);
        }

        /// <summary>Flat list with optional category filter.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? category)
        {
            var query = _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == ContentPublishStatus.Published);
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);
            return Ok(await query.OrderBy(d => d.Category).ThenBy(d => d.Title).ToListAsync());
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var known = new[] { "morning", "wudu", "after_prayer", "mosque", "general", "food", "sleep", "travel" };
            var fromDb = await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .Where(d => d.Status == ContentPublishStatus.Published)
                .Select(d => d.Category)
                .Distinct()
                .ToListAsync();
            return Ok(known.Union(fromDb.Where(c => !string.IsNullOrWhiteSpace(c))).Distinct().OrderBy(CategorySort));
        }

        /// <summary>Single most relevant dua for the current time (home screen).</summary>
        [HttpGet("recommended-now")]
        public async Task<IActionResult> RecommendedNow()
        {
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);
            var dua = await DuaRecommendationHelper.ResolveAsync(_unitOfWork, now);
            return Ok(dua);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var dua = await _unitOfWork.Repository<Dua>().QueryNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id && d.Status == ContentPublishStatus.Published);
            return dua == null ? NotFound() : Ok(dua);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Dua dua)
        {
            dua.Id = 0;
            dua.Status = ContentPublishStatus.Draft;
            _unitOfWork.Repository<Dua>().Add(dua);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = dua.Id }, dua);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Dua input)
        {
            var dua = await _unitOfWork.Repository<Dua>().FindAsync(id);
            if (dua == null) return NotFound();

            dua.Title = input.Title;
            dua.ArabicText = input.ArabicText;
            dua.Transliteration = input.Transliteration;
            dua.Translation = input.Translation;
            dua.SourceName = input.SourceName;
            dua.SourceRef = input.SourceRef;
            dua.Category = input.Category;
            dua.Tags = input.Tags;
            dua.Tradition = input.Tradition;
            dua.AudioUrl = input.AudioUrl;
            dua.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            return Ok(dua);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("{id:int}/publish")]
        public async Task<IActionResult> Publish(int id)
        {
            var dua = await _unitOfWork.Repository<Dua>().FindAsync(id);
            if (dua == null) return NotFound();
            dua.Status = ContentPublishStatus.Published;
            dua.PublishedAt = DateTime.UtcNow;
            dua.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(dua);
        }

        // ---- Collections ----

        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections() =>
            Ok(await _unitOfWork.Repository<DuaCollection>().QueryNoTracking().OrderBy(c => c.Name).ToListAsync());

        [HttpGet("collections/{id:int}")]
        public async Task<IActionResult> GetCollection(int id)
        {
            var collection = await _unitOfWork.Repository<DuaCollection>().QueryNoTracking()
                .Include(c => c.Items)
                .ThenInclude(i => i.Dua)
                .FirstOrDefaultAsync(c => c.Id == id);
            if (collection == null) return NotFound();
            if (collection.Items != null)
                collection.Items = collection.Items.OrderBy(i => i.OrderIndex).ToList();
            return Ok(collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections")]
        public async Task<IActionResult> CreateCollection([FromBody] DuaCollection collection)
        {
            collection.Id = 0;
            _unitOfWork.Repository<DuaCollection>().Add(collection);
            await _unitOfWork.SaveChangesAsync();
            return Ok(collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections/{id:int}/items")]
        public async Task<IActionResult> AddToCollection(int id, [FromBody] DuaCollectionItem item)
        {
            item.Id = 0;
            item.CollectionId = id;
            _unitOfWork.Repository<DuaCollectionItem>().Add(item);
            await _unitOfWork.SaveChangesAsync();
            return Ok(item);
        }

        private static int CategorySort(string c) => c switch
        {
            "morning" => 0,
            "wudu" => 1,
            "after_prayer" => 2,
            "mosque" => 3,
            "food" => 4,
            "sleep" => 5,
            "travel" => 6,
            "general" => 7,
            _ => 8
        };
    }
}
