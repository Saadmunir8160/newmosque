using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Common;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public NotificationsController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int limit = 30, [FromQuery] bool unreadOnly = false)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        limit = Math.Clamp(limit, 1, 100);
        var query = _unitOfWork.Repository<UserNotification>().QueryNoTracking()
            .Where(n => n.UserId == userId && !n.IsDeleted);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.Route,
                n.RelatedMosqueId,
                n.RelatedClaimId,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();

        var unreadCount = await _unitOfWork.Repository<UserNotification>().QueryNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsDeleted && !n.IsRead);

        return Ok(new { unreadCount, items });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var count = await _unitOfWork.Repository<UserNotification>().QueryNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsDeleted && !n.IsRead);

        return Ok(new { count });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var note = await _unitOfWork.Repository<UserNotification>().FindAsync(id);
        if (note == null || note.IsDeleted || note.UserId != userId)
            return NotFound(new ApiMessageResponse { Message = "Notification not found." });

        note.IsRead = true;
        note.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return Ok(new ApiMessageResponse { Message = "Marked as read." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var unread = await _unitOfWork.Repository<UserNotification>().Query()
            .Where(n => n.UserId == userId && !n.IsDeleted && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();
        return Ok(new { message = "All notifications marked as read.", count = unread.Count });
    }
}
