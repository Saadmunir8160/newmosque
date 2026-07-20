using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MosqueOS.API.Services;

/// <summary>Unified mosque/claim audit writer (Milestone 8) — wraps IAuditService.</summary>
public class MosqueAuditService
{
    private readonly IAuditService _audit;
    private readonly UserManager<ApplicationUser> _userManager;

    public MosqueAuditService(IAuditService audit, UserManager<ApplicationUser> userManager)
    {
        _audit = audit;
        _userManager = userManager;
    }

    public async Task LogMosqueAsync(
        string action,
        string actorId,
        int mosqueId,
        string description,
        string? ipAddress = null)
    {
        var actor = await _userManager.FindByIdAsync(actorId);
        await _audit.LogAsync(
            action,
            "Mosque",
            actorId,
            actor?.FullName ?? actor?.UserName,
            "Mosque",
            mosqueId,
            description,
            ipAddress);
    }

    public async Task LogClaimAsync(
        string action,
        string actorId,
        int mosqueId,
        int claimId,
        string description,
        string? ipAddress = null)
    {
        var actor = await _userManager.FindByIdAsync(actorId);
        await _audit.LogAsync(
            action,
            "Claims",
            actorId,
            actor?.FullName ?? actor?.UserName,
            "Mosque",
            mosqueId,
            $"{description} (ClaimId={claimId})",
            ipAddress);
    }

    public Task LogRegistrationAsync(
        string action,
        string actorId,
        int? registrationId,
        string description,
        string? ipAddress = null) =>
        _audit.LogAsync(
            action,
            "Registrations",
            actorId,
            null,
            registrationId.HasValue ? "Registration" : null,
            registrationId,
            description,
            ipAddress);
}
