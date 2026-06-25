using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Member;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers;

[Route("api/v1/member")]
[ApiController]
[Authorize]
public class MemberController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;

    public MemberController(IUnitOfWork unitOfWork, UserManager<ApplicationUser> userManager)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
    }

    /// <summary>Member dashboard: progress summary and notifications.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int mosqueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var mosque = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .FirstOrDefaultAsync(m => m.Id == mosqueId);
        if (mosque == null) return NotFound();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var wirdDone = await _unitOfWork.Repository<UserWirdProgress>().QueryNoTracking()
            .CountAsync(p => p.UserId == userId && p.Completed && p.LastCompletedAt != null
                && DateOnly.FromDateTime(p.LastCompletedAt.Value) == today);

        var adhkarLogs = await _unitOfWork.Repository<UserAdhkarLog>().QueryNoTracking()
            .Include(l => l.UserAdhkar)
            .Where(l => l.UserAdhkar!.UserId == userId && l.Date == today)
            .Select(l => l.UserAdhkarId)
            .Distinct()
            .CountAsync();

        var quranDone = await _unitOfWork.Repository<QuranProgress>().QueryNoTracking()
            .Include(p => p.Plan)
            .CountAsync(p => p.Plan!.UserId == userId && p.Completed);

        var eventsReg = await _unitOfWork.Repository<EventRegistration>().QueryNoTracking()
            .Include(r => r.Event)
            .CountAsync(r => r.UserId == userId && r.Event!.MosqueId == mosqueId && r.Status != RegistrationStatus.Cancelled);

        var communities = await _unitOfWork.Repository<CommunityMember>().QueryNoTracking()
            .Include(m => m.Community)
            .CountAsync(m => m.UserId == userId && m.Community!.MosqueId == mosqueId);

        var participationIds = await _unitOfWork.Repository<ParticipationRegistration>().QueryNoTracking()
            .Include(r => r.Opportunity)
            .CountAsync(r => r.UserId == userId && r.Opportunity!.MosqueId == mosqueId);

        var notifications = new List<MemberNotificationItem>();

        var upcomingEvent = await _unitOfWork.Repository<Event>().QueryNoTracking()
            .Where(e => e.MosqueId == mosqueId && e.Date >= today && e.Status == EventStatus.Scheduled)
            .OrderBy(e => e.Date)
            .FirstOrDefaultAsync();
        if (upcomingEvent != null)
        {
            notifications.Add(new MemberNotificationItem
            {
                Type = "event",
                Title = "Upcoming event",
                Message = upcomingEvent.Title,
                Route = "/dashboard/events",
                At = upcomingEvent.Date.ToDateTime(upcomingEvent.StartTime)
            });
        }

        var latestAnnouncement = await _unitOfWork.Repository<Announcement>().QueryNoTracking()
            .Where(a => a.MosqueId == mosqueId && a.Status == PublishStatus.Published)
            .OrderByDescending(a => a.PublishedAt ?? a.CreatedAt)
            .FirstOrDefaultAsync();
        if (latestAnnouncement != null)
        {
            notifications.Add(new MemberNotificationItem
            {
                Type = "announcement",
                Title = "New announcement",
                Message = latestAnnouncement.Title,
                Route = "/dashboard/announcements",
                At = latestAnnouncement.PublishedAt ?? latestAnnouncement.CreatedAt
            });
        }

        var activeCampaign = await _unitOfWork.Repository<ReadingCampaign>().QueryNoTracking()
            .Where(c => c.MosqueId == mosqueId && c.IsActive)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();
        if (activeCampaign != null)
        {
            notifications.Add(new MemberNotificationItem
            {
                Type = "reading",
                Title = "Death reading campaign",
                Message = activeCampaign.DeceasedName,
                Route = "/dashboard/member/readings",
                At = activeCampaign.CreatedAt
            });
        }

        return Ok(new MemberDashboardResponse
        {
            MosqueId = mosqueId,
            MosqueName = mosque.Name,
            Progress = new MemberProgressSummary
            {
                WirdCompletedToday = wirdDone,
                AdhkarCompletedToday = adhkarLogs,
                QuranParasCompleted = quranDone,
                EventsRegistered = eventsReg,
                CommunitiesJoined = communities,
                ParticipationRegistered = participationIds
            },
            Notifications = notifications
        });
    }

    /// <summary>Member's death reading allocations.</summary>
    [HttpGet("reading-allocations")]
    public async Task<IActionResult> GetMyReadingAllocations([FromQuery] int mosqueId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var rows = await _unitOfWork.Repository<ReadingAllocation>().QueryNoTracking()
            .Include(a => a.Campaign)
            .Where(a => a.UserId == userId && a.Campaign!.MosqueId == mosqueId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.CampaignId,
                DeceasedName = a.Campaign!.DeceasedName,
                a.Description,
                a.Type,
                a.Status
            })
            .ToListAsync();
        return Ok(rows);
    }
}
