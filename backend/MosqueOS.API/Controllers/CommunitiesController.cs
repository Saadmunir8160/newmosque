using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/communities")]
    [ApiController]
    public class CommunitiesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public CommunitiesController(ApplicationDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? mosqueId)
        {
            var query = _db.Communities.AsNoTracking().Where(c => c.IsPublic);
            if (mosqueId.HasValue) query = query.Where(c => c.MosqueId == mosqueId);
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var community = await _db.Communities.AsNoTracking()
                .Include(c => c.Members)
                .Include(c => c.Resources)
                .FirstOrDefaultAsync(c => c.Id == id);
            return community == null ? NotFound() : Ok(community);
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Community community)
        {
            community.Id = 0;
            _db.Communities.Add(community);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = community.Id }, community);
        }

        [Authorize]
        [HttpPost("{id:int}/join")]
        public async Task<IActionResult> Join(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (await _db.CommunityMembers.AnyAsync(m => m.CommunityId == id && m.UserId == userId))
                return Conflict(new { message = "Already a member." });

            var member = new CommunityMember { CommunityId = id, UserId = userId, Role = CommunityRole.Member };
            _db.CommunityMembers.Add(member);
            await _db.SaveChangesAsync();
            return Ok(member);
        }

        // ---- Posts (text-based feed, MVP) ----

        [HttpGet("{id:int}/posts")]
        public async Task<IActionResult> GetPosts(int id) =>
            Ok(await _db.CommunityPosts.AsNoTracking()
                .Where(p => p.CommunityId == id)
                .OrderByDescending(p => p.CreatedAt)
                .Take(50)
                .ToListAsync());

        [Authorize]
        [HttpPost("{id:int}/posts")]
        public async Task<IActionResult> CreatePost(int id, [FromBody] CommunityPost post)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isMember = await _db.CommunityMembers
                .AnyAsync(m => m.CommunityId == id && m.UserId == userId);
            if (!isMember) return Forbid();

            post.Id = 0;
            post.CommunityId = id;
            post.AuthorId = userId;
            _db.CommunityPosts.Add(post);
            await _db.SaveChangesAsync();
            return Ok(post);
        }

        // ---- Resources ----

        [Authorize]
        [HttpPost("{id:int}/resources")]
        public async Task<IActionResult> AddResource(int id, [FromBody] CommunityResource resource)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var membership = await _db.CommunityMembers
                .FirstOrDefaultAsync(m => m.CommunityId == id && m.UserId == userId);
            var isPlatformAdmin = User.IsInRole(Roles.SuperAdmin) || User.IsInRole(Roles.MosqueAdmin);

            if (!isPlatformAdmin && (membership == null || membership.Role == CommunityRole.Member))
                return Forbid();

            resource.Id = 0;
            resource.CommunityId = id;
            _db.CommunityResources.Add(resource);
            await _db.SaveChangesAsync();
            return Ok(resource);
        }
    }
}
