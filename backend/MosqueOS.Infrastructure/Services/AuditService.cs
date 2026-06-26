using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;

namespace MosqueOS.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _db;

    public AuditService(ApplicationDbContext db) => _db = db;

    public async Task LogAsync(
        string action,
        string module,
        string actorId,
        string? actorName = null,
        string? targetType = null,
        int? targetId = null,
        string? description = null,
        string? ipAddress = null)
    {
        _db.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Action = action,
            Module = module,
            ActorId = actorId,
            ActorName = actorName,
            TargetType = targetType,
            TargetId = targetId,
            Description = description ?? string.Empty,
            IpAddress = ipAddress
        });
        await _db.SaveChangesAsync();
    }
}
