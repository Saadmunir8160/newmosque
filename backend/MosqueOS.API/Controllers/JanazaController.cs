using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Filters;
using MosqueOS.API.Models.DeathReading;
using MosqueOS.API.Models.Janaza;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/mosques/{mosqueId:int}/janaza")]
    [ApiController]
    [RequireMosqueModule("Janaza")]
    public class JanazaController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly MosqueAccessService _mosqueAccess;

        public JanazaController(IUnitOfWork unitOfWork, MosqueAccessService mosqueAccess)
        {
            _unitOfWork = unitOfWork;
            _mosqueAccess = mosqueAccess;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId, [FromQuery] string? search = null)
        {
            var query = _unitOfWork.Repository<JanazaAnnouncement>().QueryNoTracking()
                .Where(j => j.MosqueId == mosqueId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(j =>
                    j.Name.Contains(term) ||
                    j.Location.Contains(term) ||
                    (j.BurialLocation != null && j.BurialLocation.Contains(term)));
            }

            var rows = await query.OrderByDescending(j => j.JanazaDate).ThenByDescending(j => j.JanazaTime).ToListAsync();
            var userIds = rows.Select(r => r.CreatedById).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
            var users = await LoadUserLookupAsync(userIds!);

            var items = rows.Select(j => ToListItem(j, users)).ToList();
            return Ok(items);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var item = await _unitOfWork.Repository<JanazaAnnouncement>().QueryNoTracking()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            if (item == null) return NotFound();

            var users = await LoadUserLookupAsync(new[] { item.CreatedById }.Where(x => x != null)!);
            return Ok(ToListItem(item, users));
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] UpsertJanazaRequest request)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required." });

            var status = request.Status ?? PublishStatus.Draft;
            var item = new JanazaAnnouncement
            {
                MosqueId = mosqueId,
                Name = request.Name.Trim(),
                DateOfDeath = request.DateOfDeath,
                JanazaDate = request.JanazaDate,
                JanazaTime = request.JanazaTime,
                Location = request.Location?.Trim() ?? string.Empty,
                BurialLocation = request.BurialLocation?.Trim(),
                Notes = request.Notes?.Trim(),
                MosqueSiteUrl = request.MosqueSiteUrl?.Trim(),
                Status = status,
                CreatedById = UserId,
                PublishedAt = status == PublishStatus.Published ? DateTime.UtcNow : null
            };

            _unitOfWork.Repository<JanazaAnnouncement>().Add(item);
            await _unitOfWork.SaveChangesAsync();

            // Optional push notification (v1 records intent on notes metadata — no push provider wired)
            if (request.NotifyFollowers && status == PublishStatus.Published)
            {
                item.Notes = string.IsNullOrWhiteSpace(item.Notes)
                    ? "[notify:followers]"
                    : item.Notes + "\n[notify:followers]";
                item.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.SaveChangesAsync();
            }

            var users = await LoadUserLookupAsync(new[] { item.CreatedById }.Where(x => x != null)!);
            return CreatedAtAction(nameof(Get), new { mosqueId, id = item.Id }, ToListItem(item, users));
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int mosqueId, int id, [FromBody] UpsertJanazaRequest request)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required." });

            var item = await _unitOfWork.Repository<JanazaAnnouncement>().Query()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Name = request.Name.Trim();
            item.DateOfDeath = request.DateOfDeath;
            item.JanazaDate = request.JanazaDate;
            item.JanazaTime = request.JanazaTime;
            item.Location = request.Location?.Trim() ?? string.Empty;
            item.BurialLocation = request.BurialLocation?.Trim();
            item.Notes = request.Notes?.Trim();
            item.MosqueSiteUrl = request.MosqueSiteUrl?.Trim();
            item.UpdatedAt = DateTime.UtcNow;

            if (request.Status.HasValue)
            {
                if (request.Status == PublishStatus.Published && item.Status != PublishStatus.Published)
                    item.PublishedAt = DateTime.UtcNow;
                item.Status = request.Status.Value;
            }

            await _unitOfWork.SaveChangesAsync();

            var users = await LoadUserLookupAsync(new[] { item.CreatedById }.Where(x => x != null)!);
            return Ok(ToListItem(item, users));
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/publish")]
        public async Task<IActionResult> Publish(int mosqueId, int id)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;

            var item = await _unitOfWork.Repository<JanazaAnnouncement>().Query()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            if (item == null) return NotFound();

            item.Status = PublishStatus.Published;
            item.PublishedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();

            var users = await LoadUserLookupAsync(new[] { item.CreatedById }.Where(x => x != null)!);
            return Ok(ToListItem(item, users));
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int mosqueId, int id)
        {
            if (await MosqueAccessHelper.RequireAccessAsync(_mosqueAccess, User, mosqueId) is { } denied) return denied;
            var item = await _unitOfWork.Repository<JanazaAnnouncement>().Query()
                .FirstOrDefaultAsync(j => j.Id == id && j.MosqueId == mosqueId);
            if (item == null) return NotFound();

            _unitOfWork.Repository<JanazaAnnouncement>().Remove(item);
            await _unitOfWork.SaveChangesAsync();
            return NoContent();
        }

        private static JanazaListItem ToListItem(JanazaAnnouncement j, Dictionary<string, ApplicationUser> users)
        {
            users.TryGetValue(j.CreatedById ?? string.Empty, out var user);
            var name = !string.IsNullOrWhiteSpace(user?.FullName) ? user!.FullName : user?.Email ?? "Admin";
            var initials = BuildInitials(name);

            return new JanazaListItem
            {
                Id = j.Id,
                MosqueId = j.MosqueId,
                Name = j.Name,
                DateOfDeath = j.DateOfDeath,
                JanazaDate = j.JanazaDate,
                JanazaTime = j.JanazaTime,
                Location = j.Location,
                BurialLocation = j.BurialLocation,
                Notes = j.Notes,
                MosqueSiteUrl = j.MosqueSiteUrl,
                Status = j.Status,
                PostedByName = name,
                PostedByInitials = initials,
                CreatedAt = j.CreatedAt,
                PublishedAt = j.PublishedAt,
                NotificationRequested = j.Notes != null && j.Notes.Contains("[notify:followers]", StringComparison.Ordinal)
            };
        }

        private static string BuildInitials(string name)
        {
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "A";
            if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
            return $"{parts[0][0]}{parts[^1][0]}".ToUpperInvariant();
        }

        private async Task<Dictionary<string, ApplicationUser>> LoadUserLookupAsync(IEnumerable<string> userIds)
        {
            var ids = userIds.Distinct().Where(id => !string.IsNullOrWhiteSpace(id)).ToList();
            if (ids.Count == 0) return new Dictionary<string, ApplicationUser>();

            var users = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking()
                .Where(u => ids.Contains(u.Id))
                .ToListAsync();
            return users.ToDictionary(u => u.Id, u => u);
        }
    }

    [Route("api/v1/mosques/{mosqueId:int}/reading-campaigns")]
    [ApiController]
    [RequireMosqueModule("DeathReadings")]
    public class DeathReadingsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public DeathReadingsController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [HttpGet("monitor")]
        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        public async Task<IActionResult> Monitor(int mosqueId, [FromQuery] int? campaignId = null,
            [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            var campaign = await ResolveCampaignAsync(mosqueId, campaignId);
            if (campaign == null) return NotFound(new { message = "No reading campaign found." });

            var fromDt = from ?? campaign.CreatedAt.Date;
            var toDt = to ?? DateTime.UtcNow;

            var allocations = await _unitOfWork.Repository<ReadingAllocation>().QueryNoTracking()
                .Where(a => a.CampaignId == campaign.Id)
                .ToListAsync();

            var userIds = allocations.Select(a => a.UserId).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id!).Distinct().ToList();
            var users = await LoadUsersAsync(userIds);

            var completedInRange = allocations
                .Where(a => a.Status == ReadingAllocationStatus.Completed &&
                            InRange(a.UpdatedAt ?? a.CreatedAt, fromDt, toDt))
                .ToList();

            var completedAll = allocations.Where(a => a.Status == ReadingAllocationStatus.Completed).ToList();
            var completedReadings = completedAll.Sum(a => a.ReadingCount);
            var target = campaign.TargetReadings > 0 ? campaign.TargetReadings : 100_000;
            var remaining = Math.Max(0, target - completedReadings);
            var percent = target > 0 ? Math.Round(completedReadings * 100.0 / target, 1) : 0;

            var contributors = completedAll
                .Where(a => !string.IsNullOrWhiteSpace(a.UserId))
                .GroupBy(a => a.UserId!)
                .Select(g => new { UserId = g.Key, Count = g.Sum(x => x.ReadingCount) })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();

            var topContributors = contributors.Select((c, i) =>
            {
                users.TryGetValue(c.UserId, out var u);
                var name = !string.IsNullOrWhiteSpace(u?.FullName) ? u!.FullName : u?.Email ?? "Member";
                return new ContributorRow
                {
                    UserId = c.UserId,
                    Name = name,
                    Initials = BuildInitials(name),
                    ReadingCount = c.Count,
                    Rank = i + 1
                };
            }).ToList();

            var recentActivity = completedInRange
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .Take(8)
                .Select(a =>
                {
                    users.TryGetValue(a.UserId ?? string.Empty, out var u);
                    var name = !string.IsNullOrWhiteSpace(u?.FullName) ? u!.FullName : u?.Email ?? "Member";
                    return new ActivityRow
                    {
                        UserName = name,
                        ReadingCount = a.ReadingCount,
                        At = a.UpdatedAt ?? a.CreatedAt
                    };
                }).ToList();

            var regions = allocations
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Region) ? "Other" : a.Region!)
                .Select(g =>
                {
                    var done = g.Where(a => a.Status == ReadingAllocationStatus.Completed).Sum(a => a.ReadingCount);
                    var tgt = g.Sum(a => a.ReadingCount);
                    return new GroupProgressRow
                    {
                        Region = g.Key,
                        Completed = done,
                        Target = tgt,
                        Percent = tgt > 0 ? Math.Round(done * 100.0 / tgt, 0) : 0
                    };
                })
                .OrderByDescending(g => g.Percent)
                .Take(6)
                .ToList();

            var activeContributors = completedAll
                .Select(a => a.UserId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .Count();

            return Ok(new DeathReadingMonitorResponse
            {
                CampaignId = campaign.Id,
                Title = campaign.Title ?? $"Esaal-e-Sawab — {campaign.DeceasedName}",
                DeceasedName = campaign.DeceasedName,
                IsActive = campaign.IsActive,
                IsArchived = campaign.IsArchived,
                TargetReadings = target,
                CompletedReadings = completedReadings,
                RemainingReadings = remaining,
                CompletionPercent = percent,
                ActiveContributors = activeContributors,
                TopContributors = topContributors,
                RecentActivity = recentActivity,
                GroupProgress = regions
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(int mosqueId) =>
            Ok(await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Where(c => c.MosqueId == mosqueId && c.IsActive && !c.IsArchived)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync());

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int mosqueId, int id)
        {
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Include(c => c.Allocations)
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            return Ok(new
            {
                campaign,
                totalAllocations = campaign.Allocations.Count,
                completed = campaign.Allocations.Count(a => a.Status == ReadingAllocationStatus.Completed)
            });
        }

        [HttpGet("{id:int}/export")]
        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        public async Task<IActionResult> Export(int mosqueId, int id)
        {
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Include(c => c.Allocations)
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            var userIds = campaign.Allocations.Select(a => a.UserId).Where(x => x != null).Select(x => x!).Distinct().ToList();
            var users = await LoadUsersAsync(userIds);

            var sb = new System.Text.StringBuilder();
            sb.AppendLine("Death Readings Campaign Report");
            sb.AppendLine($"Campaign,{campaign.Title ?? campaign.DeceasedName}");
            sb.AppendLine($"Deceased,{campaign.DeceasedName}");
            sb.AppendLine($"Target,{campaign.TargetReadings}");
            sb.AppendLine($"Completed,{campaign.Allocations.Where(a => a.Status == ReadingAllocationStatus.Completed).Sum(a => a.ReadingCount)}");
            sb.AppendLine();
            sb.AppendLine("Description,Type,Status,ReadingCount,Region,Contributor");
            foreach (var a in campaign.Allocations.OrderBy(x => x.Id))
            {
                users.TryGetValue(a.UserId ?? string.Empty, out var u);
                var name = u?.FullName ?? u?.Email ?? "";
                sb.AppendLine($"\"{a.Description}\",{a.Type},{a.Status},{a.ReadingCount},{a.Region},{name}");
            }

            var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"death-readings-{id}.csv");
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost]
        public async Task<IActionResult> Create(int mosqueId, [FromBody] ReadingCampaign campaign)
        {
            campaign.Id = 0;
            campaign.MosqueId = mosqueId;
            campaign.CreatedById = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (campaign.TargetReadings <= 0) campaign.TargetReadings = 100_000;
            if (string.IsNullOrWhiteSpace(campaign.Title))
                campaign.Title = $"Esaal-e-Sawab — {campaign.DeceasedName}";
            _unitOfWork.Repository<ReadingCampaign>().Add(campaign);
            await _unitOfWork.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { mosqueId, id = campaign.Id }, campaign);
        }

        [Authorize(Roles = Roles.Admins + "," + Roles.Muqaddam)]
        [HttpPut("{id:int}/target")]
        public async Task<IActionResult> UpdateTarget(int mosqueId, int id, [FromBody] UpdateReadingTargetRequest request)
        {
            if (request.TargetReadings <= 0) return BadRequest(new { message = "Target must be greater than zero." });
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().Query()
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            campaign.TargetReadings = request.TargetReadings;
            campaign.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(new { campaign.TargetReadings });
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/archive")]
        public async Task<IActionResult> Archive(int mosqueId, int id)
        {
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().Query()
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            campaign.IsActive = false;
            campaign.IsArchived = true;
            campaign.ArchivedAt = DateTime.UtcNow;
            campaign.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(new { message = "Campaign archived." });
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/reset")]
        public async Task<IActionResult> Reset(int mosqueId, int id)
        {
            var campaign = await _unitOfWork.Repository<ReadingCampaign>().Query()
                .Include(c => c.Allocations)
                .FirstOrDefaultAsync(c => c.Id == id && c.MosqueId == mosqueId);
            if (campaign == null) return NotFound();

            foreach (var a in campaign.Allocations)
            {
                a.Status = ReadingAllocationStatus.Assigned;
                a.UpdatedAt = DateTime.UtcNow;
            }
            campaign.IsArchived = false;
            campaign.IsActive = true;
            campaign.ArchivedAt = null;
            campaign.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(new { message = "Campaign progress reset." });
        }

        [Authorize(Roles = Roles.Admins)]
        [HttpPost("{id:int}/allocations")]
        public async Task<IActionResult> AddAllocation(int mosqueId, int id, [FromBody] ReadingAllocation allocation)
        {
            allocation.Id = 0;
            allocation.CampaignId = id;
            if (allocation.ReadingCount <= 0) allocation.ReadingCount = 1;
            _unitOfWork.Repository<ReadingAllocation>().Add(allocation);
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }

        [Authorize]
        [HttpPost("allocations/{allocationId:int}/claim")]
        public async Task<IActionResult> ClaimAllocation(int mosqueId, int allocationId)
        {
            var allocation = await _unitOfWork.Repository<ReadingAllocation>().FindAsync(allocationId);
            if (allocation == null) return NotFound();
            if (allocation.UserId != null) return Conflict(new { message = "Already assigned." });

            allocation.UserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            allocation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }

        [Authorize]
        [HttpPost("allocations/{allocationId:int}/complete")]
        public async Task<IActionResult> CompleteAllocation(int mosqueId, int allocationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var allocation = await _unitOfWork.Repository<ReadingAllocation>().Query()
                .FirstOrDefaultAsync(a => a.Id == allocationId);
            if (allocation == null) return NotFound();

            if (allocation.UserId != null && allocation.UserId != userId)
                return Conflict(new { message = "This portion is assigned to another member." });

            if (allocation.Status == ReadingAllocationStatus.Completed)
                return Ok(allocation);

            if (allocation.UserId == null)
                allocation.UserId = userId;

            if (allocation.ReadingCount <= 0)
                allocation.ReadingCount = InferReadingCount(allocation);

            allocation.Status = ReadingAllocationStatus.Completed;
            allocation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return Ok(allocation);
        }

        private async Task<ReadingCampaign?> ResolveCampaignAsync(int mosqueId, int? campaignId)
        {
            if (campaignId.HasValue)
            {
                return await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == campaignId && c.MosqueId == mosqueId);
            }
            return await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
                .Where(c => c.MosqueId == mosqueId && !c.IsArchived)
                .OrderByDescending(c => c.IsActive)
                .ThenByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();
        }

        private static bool InRange(DateTime dt, DateTime from, DateTime to) =>
            dt >= from && dt <= to.AddDays(1);

        private static int InferReadingCount(ReadingAllocation a)
        {
            if (a.Type == ReadingAllocationType.Adhkar && a.Description.Contains("x", StringComparison.OrdinalIgnoreCase))
            {
                var idx = a.Description.LastIndexOf('x');
                if (idx >= 0 && int.TryParse(new string(a.Description[(idx + 1)..].TakeWhile(char.IsDigit).ToArray()), out var n))
                    return n;
            }
            return 1;
        }

        private static string BuildInitials(string name)
        {
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "M";
            if (parts.Length == 1) return parts[0][..Math.Min(2, parts[0].Length)].ToUpperInvariant();
            return $"{parts[0][0]}{parts[^1][0]}".ToUpperInvariant();
        }

        private async Task<Dictionary<string, ApplicationUser>> LoadUsersAsync(IEnumerable<string> userIds)
        {
            var ids = userIds.Distinct().Where(id => !string.IsNullOrWhiteSpace(id)).ToList();
            if (ids.Count == 0) return new Dictionary<string, ApplicationUser>();
            var users = await _unitOfWork.Repository<ApplicationUser>().QueryNoTracking()
                .Where(u => ids.Contains(u.Id)).ToListAsync();
            return users.ToDictionary(u => u.Id, u => u);
        }
    }
}
