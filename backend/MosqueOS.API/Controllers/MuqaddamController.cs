using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/muqaddam")]
    [ApiController]
    [Authorize(Roles = Roles.MuridSummaryViewers)]
    public class MuqaddamController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public MuqaddamController(ApplicationDbContext db) => _db = db;

        /// <summary>Tariqa community members with wird progress summaries.</summary>
        [HttpGet("murids")]
        public async Task<IActionResult> GetMuridSummaries([FromQuery] int? mosqueId)
        {
            var communityQuery = _db.Communities.AsNoTracking()
                .Where(c => c.Type == CommunityType.Tariqa);

            if (mosqueId.HasValue)
                communityQuery = communityQuery.Where(c => c.MosqueId == mosqueId);

            var communityIds = await communityQuery.Select(c => c.Id).ToListAsync();

            var members = await _db.CommunityMembers.AsNoTracking()
                .Include(m => m.User)
                .Include(m => m.Community)
                .Where(m => communityIds.Contains(m.CommunityId))
                .ToListAsync();

            var userIds = members.Select(m => m.UserId).Distinct().ToList();

            var wirdProgress = await _db.UserWirdProgress.AsNoTracking()
                .Include(p => p.Collection)
                .Where(p => userIds.Contains(p.UserId))
                .ToListAsync();

            var quranPlans = await _db.QuranPlans.AsNoTracking()
                .Include(p => p.Progress)
                .Where(p => userIds.Contains(p.UserId))
                .ToListAsync();

            var readingAllocations = await _db.ReadingAllocations.AsNoTracking()
                .Include(a => a.Campaign)
                .Where(a => a.UserId != null && userIds.Contains(a.UserId))
                .ToListAsync();

            var summaries = members
                .GroupBy(m => m.UserId)
                .Select(g =>
                {
                    var user = g.First().User;
                    var progress = wirdProgress.Where(p => p.UserId == g.Key).ToList();
                    var plan = quranPlans.FirstOrDefault(p => p.UserId == g.Key);
                    var readings = readingAllocations.Where(a => a.UserId == g.Key).ToList();

                    return new
                    {
                        userId = g.Key,
                        fullName = user?.FullName ?? user?.UserName ?? "Unknown",
                        communities = g.Select(m => new { m.Community!.Name, role = m.Role.ToString() }),
                        wirdCompleted = progress.Count(p => p.Completed),
                        wirdTotal = progress.Count,
                        quranParasCompleted = plan?.Progress.Count(p => p.Completed) ?? 0,
                        deathReadingsCompleted = readings.Count(r => r.Status == ReadingAllocationStatus.Completed),
                        deathReadingsTotal = readings.Count
                    };
                })
                .OrderBy(s => s.fullName)
                .ToList();

            return Ok(summaries);
        }

        [HttpGet("communities")]
        public async Task<IActionResult> GetTariqaCommunities([FromQuery] int? mosqueId)
        {
            var query = _db.Communities.AsNoTracking()
                .Where(c => c.Type == CommunityType.Tariqa);

            if (mosqueId.HasValue)
                query = query.Where(c => c.MosqueId == mosqueId);

            var communities = await query
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.MosqueId,
                    memberCount = c.Members.Count
                })
                .ToListAsync();

            return Ok(communities);
        }
    }
}
