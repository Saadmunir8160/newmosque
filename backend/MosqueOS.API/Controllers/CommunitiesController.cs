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

        /// <summary>Feed posts — community Admin/Teacher (and Muqaddam) or platform admins (Module 3.6).</summary>
        [Authorize]
        [HttpPost("{id:int}/posts")]
        public async Task<IActionResult> CreatePost(int id, [FromBody] CommunityPost post)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var isPlatformAdmin = User.IsInRole(Roles.SuperAdmin)
                || User.IsInRole(Roles.MosqueOwner)
                || User.IsInRole(Roles.MosqueAdmin);
            if (!isPlatformAdmin)
            {
                var membership = await _unitOfWork.Repository<CommunityMember>().Query()
                    .FirstOrDefaultAsync(m => m.CommunityId == id && m.UserId == userId);
                if (membership == null
                    || (membership.Role != CommunityRole.Admin
                        && membership.Role != CommunityRole.Teacher
                        && membership.Role != CommunityRole.Muqaddam))
                    return Forbid();
            }

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

        /// <summary>Invite/add a member with role (Admin/Teacher/Member). Module 3.6.</summary>
        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        [HttpPost("{id:int}/members")]
        public async Task<IActionResult> InviteMember(int id, [FromBody] CommunityMember input)
        {
            var community = await _unitOfWork.Repository<Community>().FindAsync(id);
            if (community == null) return NotFound();
            if (string.IsNullOrWhiteSpace(input.UserId))
                return BadRequest(new ApiMessageResponse { Message = "UserId is required." });

            if (await _unitOfWork.Repository<CommunityMember>().Query()
                .AnyAsync(m => m.CommunityId == id && m.UserId == input.UserId))
                return Conflict(new ApiMessageResponse { Message = "Already a member." });

            var role = input.Role;
            if (role is not (CommunityRole.Admin or CommunityRole.Teacher or CommunityRole.Member or CommunityRole.Muqaddam))
                role = CommunityRole.Member;

            var member = new CommunityMember
            {
                CommunityId = id,
                UserId = input.UserId,
                Role = role
            };
            _unitOfWork.Repository<CommunityMember>().Add(member);
            await _unitOfWork.SaveChangesAsync();
            return Ok(member);
        }

        /// <summary>Link a mosque event to this community (community_events). Module 3.6.</summary>
        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        [HttpPost("{id:int}/events")]
        public async Task<IActionResult> LinkEvent(int id, [FromBody] CommunityEventLinkRequest request)
        {
            var community = await _unitOfWork.Repository<Community>().FindAsync(id);
            if (community == null) return NotFound();

            var ev = await _unitOfWork.Repository<Event>().FindAsync(request.EventId);
            if (ev == null) return NotFound(new ApiMessageResponse { Message = "Event not found." });

            if (await _unitOfWork.Repository<CommunityEvent>().Query()
                .AnyAsync(ce => ce.CommunityId == id && ce.EventId == request.EventId))
                return Conflict(new ApiMessageResponse { Message = "Event already linked." });

            var link = new CommunityEvent { CommunityId = id, EventId = request.EventId };
            _unitOfWork.Repository<CommunityEvent>().Add(link);
            await _unitOfWork.SaveChangesAsync();
            return Ok(link);
        }

        [HttpGet("{id:int}/events")]
        public async Task<IActionResult> GetLinkedEvents(int id) =>
            Ok(await _unitOfWork.Repository<CommunityEvent>().QueryNoTracking()
                .Include(ce => ce.Event)
                .Where(ce => ce.CommunityId == id)
                .ToListAsync());
    }

    public class CommunityEventLinkRequest
    {
        public int EventId { get; set; }
    }
}
