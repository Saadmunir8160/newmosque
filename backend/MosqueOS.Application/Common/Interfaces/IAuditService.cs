namespace MosqueOS.Application.Common.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string action,
        string module,
        string actorId,
        string? actorName = null,
        string? targetType = null,
        int? targetId = null,
        string? description = null,
        string? ipAddress = null);
}
