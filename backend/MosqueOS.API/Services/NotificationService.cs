using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class NotificationService
{
    private readonly IUnitOfWork _unitOfWork;

    public NotificationService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task CreateAsync(
        string userId,
        string type,
        string title,
        string message,
        string? route = null,
        int? relatedMosqueId = null,
        int? relatedClaimId = null)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;

        _unitOfWork.Repository<UserNotification>().Add(new UserNotification
        {
            UserId = userId,
            Type = type,
            Title = title.Trim(),
            Message = message.Trim(),
            Route = route,
            RelatedMosqueId = relatedMosqueId,
            RelatedClaimId = relatedClaimId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task CreateManyAsync(IEnumerable<(string UserId, string Type, string Title, string Message, string? Route, int? MosqueId, int? ClaimId)> items)
    {
        var list = items.Where(i => !string.IsNullOrWhiteSpace(i.UserId)).ToList();
        if (list.Count == 0) return;

        foreach (var i in list)
        {
            _unitOfWork.Repository<UserNotification>().Add(new UserNotification
            {
                UserId = i.UserId,
                Type = i.Type,
                Title = i.Title.Trim(),
                Message = i.Message.Trim(),
                Route = i.Route,
                RelatedMosqueId = i.MosqueId,
                RelatedClaimId = i.ClaimId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _unitOfWork.SaveChangesAsync();
    }
}
