using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/duas")]
    [ApiController]
    public class DuasController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public DuasController(ApplicationDbContext db) => _db = db;

        /// <summary>Browse organised by category (morning, wudu, after_prayer, mosque, general, food, sleep, travel).</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? category)
        {
            var query = _db.Duas.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Category == category);
            return Ok(await query.OrderBy(d => d.Category).ThenBy(d => d.Title).ToListAsync());
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories() =>
            Ok(await _db.Duas.AsNoTracking().Select(d => d.Category).Distinct().OrderBy(c => c).ToListAsync());

        /// <summary>Single most relevant dua for the current time (home screen, spec 3.9).</summary>
        [HttpGet("recommended-now")]
        public async Task<IActionResult> RecommendedNow()
        {
            var london = TimeZoneInfo.FindSystemTimeZoneById("GMT Standard Time");
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, london);

            var category = now.Hour switch
            {
                >= 4 and < 10 => "morning",
                >= 10 and < 18 => "general",
                >= 18 and < 22 => "after_prayer",
                _ => "sleep"
            };

            var dua = await _db.Duas.AsNoTracking()
                .Where(d => d.Category == category)
                .OrderBy(d => d.Id)
                .FirstOrDefaultAsync()
                ?? await _db.Duas.AsNoTracking().OrderBy(d => d.Id).FirstOrDefaultAsync();

            return Ok(dua);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var dua = await _db.Duas.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
            return dua == null ? NotFound() : Ok(dua);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Dua dua)
        {
            dua.Id = 0;
            _db.Duas.Add(dua);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = dua.Id }, dua);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Dua input)
        {
            var dua = await _db.Duas.FindAsync(id);
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

            await _db.SaveChangesAsync();
            return Ok(dua);
        }

        // ---- Collections (e.g. Ghazali Supplications, Friday Duas) ----

        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections() =>
            Ok(await _db.DuaCollections.AsNoTracking().OrderBy(c => c.Name).ToListAsync());

        [HttpGet("collections/{id:int}")]
        public async Task<IActionResult> GetCollection(int id)
        {
            var collection = await _db.DuaCollections.AsNoTracking()
                .Include(c => c.Items.OrderBy(i => i.OrderIndex))
                .ThenInclude(i => i.Dua)
                .FirstOrDefaultAsync(c => c.Id == id);
            return collection == null ? NotFound() : Ok(collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections")]
        public async Task<IActionResult> CreateCollection([FromBody] DuaCollection collection)
        {
            collection.Id = 0;
            _db.DuaCollections.Add(collection);
            await _db.SaveChangesAsync();
            return Ok(collection);
        }

        [Authorize(Roles = Roles.ContentManagers)]
        [HttpPost("collections/{id:int}/items")]
        public async Task<IActionResult> AddToCollection(int id, [FromBody] DuaCollectionItem item)
        {
            item.Id = 0;
            item.CollectionId = id;
            _db.DuaCollectionItems.Add(item);
            await _db.SaveChangesAsync();
            return Ok(item);
        }
    }
}
