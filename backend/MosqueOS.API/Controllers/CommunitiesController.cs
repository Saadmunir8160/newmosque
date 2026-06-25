using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/communities")]
    [ApiController]
    public class CommunitiesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public CommunitiesController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? mosqueId, [FromQuery] string? search, [FromQuery] string? type)
        {
            var query = _unitOfWork.Repository<Community>().QueryNoTracking().Where(c => c.IsPublic);
            if (mosqueId.HasValue) query = query.Where(c => c.MosqueId == mosqueId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(c => c.Name.Contains(term) || (c.Description != null && c.Description.Contains(term)));
            }
            if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<CommunityType>(type, true, out var communityType))
                query = query.Where(c => c.Type == communityType);
            return Ok(await query.OrderBy(c => c.Name).ToListAsync());
        }

        [Authorize]
        [HttpGet("mine")]
        public async Task<IActionResult> MyMemberships()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var ids = await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
                .Where(m => m.UserId == userId)
                .Select(m => m.CommunityId)
                .ToListAsync();
            return Ok(ids);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var community = await _unitOfWork.Repository<Community>().QueryNoTracking()
                .Include(c => c.Members)
                .Include(c => c.Resources)
                .FirstOrDefaultAsync(c => c.Id == id);
            return community == null ? NotFound() : Ok(community);
        }

        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Community community)
        {
            community.Id = 0;
            _unitOfWork.Repository<Community>().Add(community);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = community.Id }, community);
        }

        [Authorize]
        [HttpPost("{id:int}/join")]
        public async Task<IActionResult> Join(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (await _unitOfWork.Repository<CommunityMember>().Query()
                .AnyAsync(m => m.CommunityId == id && m.UserId == userId))
                return Conflict(new ApiMessageResponse { Message = "Already a member." });

            var member = new CommunityMember { CommunityId = id, UserId = userId, Role = CommunityRole.Member };
            _unitOfWork.Repository<CommunityMember>().Add(member);
            await _unitOfWork.SaveChangesAsync();
            return Ok(member);
        }

        // ---- Posts (text-based feed, MVP) ----

        [HttpGet("{id:int}/posts")]
        public async Task<IActionResult> GetPosts(int id) =>
            Ok(await _unitOfWork.Repository<CommunityPost>().QueryNoTracking()
                .Where(p => p.CommunityId == id)
                .OrderByDescending(p => p.CreatedAt)
                .Take(50)
                .ToListAsync());

        [Authorize]
        [HttpPost("{id:int}/posts")]
        public async Task<IActionResult> CreatePost(int id, [FromBody] CommunityPost post)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isMember = await _unitOfWork.Repository<CommunityMember>().Query()
                .AnyAsync(m => m.CommunityId == id && m.UserId == userId);
            if (!isMember) return Forbid();

            post.Id = 0;
            post.CommunityId = id;
            post.AuthorId = userId;
            _unitOfWork.Repository<CommunityPost>().Add(post);
            await _unitOfWork.SaveChangesAsync();
            return Ok(post);
        }

        // ---- Resources ----

        [Authorize]
        [HttpPost("{id:int}/resources")]
        public async Task<IActionResult> AddResource(int id, [FromBody] CommunityResource resource)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var membership = await _unitOfWork.Repository<CommunityMember>().Query()
                .FirstOrDefaultAsync(m => m.CommunityId == id && m.UserId == userId);
            var isPlatformAdmin = User.IsInRole(Roles.SuperAdmin) || User.IsInRole(Roles.MosqueAdmin);

            if (!isPlatformAdmin && (membership == null || membership.Role == CommunityRole.Member))
                return Forbid();

            resource.Id = 0;
            resource.CommunityId = id;
            _unitOfWork.Repository<CommunityResource>().Add(resource);
            await _unitOfWork.SaveChangesAsync();
            return Ok(resource);
        }
    }
}
