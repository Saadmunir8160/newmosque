using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class MosqueInvitationService
{
    private const int DefaultExpiryDays = 14;

    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly MosqueModuleSeedService _moduleSeed;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MosqueInvitationService> _logger;

    public MosqueInvitationService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        MosqueModuleSeedService moduleSeed,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<MosqueInvitationService> logger)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _roleManager = roleManager;
        _moduleSeed = moduleSeed;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(MosqueInvitation? Invitation, string? Error, int StatusCode, bool EmailSent)> SendInvitationAsync(
        int mosqueId,
        string inviteEmail,
        string? inviteName,
        string role,
        string invitedById)
    {
        var email = inviteEmail.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return (null, "Invite email is required.", 400, false);

        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            return (null, "Please enter a valid email address.", 400, false);

        var normalizedRole = NormalizeInviteRole(role);
        if (normalizedRole == null)
            return (null, "Role must be MosqueOwner or MosqueAdmin.", 400, false);

        var mosque = await _unitOfWork.Repository<Mosque>().Query()
            .FirstOrDefaultAsync(m => m.Id == mosqueId && !m.IsDeleted);
        if (mosque == null)
            return (null, "Mosque not found.", 404, false);

        if (normalizedRole == Roles.MosqueOwner)
        {
            if (mosque.Status != MosqueStatus.Unclaimed)
                return (null, "Owner invitations are only allowed for unclaimed mosques.", 400, false);
            if (!string.IsNullOrEmpty(mosque.OwnerId))
                return (null, "This mosque already has an owner.", 409, false);
        }
        else if (mosque.Status != MosqueStatus.Active)
        {
            return (null, "Admin invitations require an active mosque.", 400, false);
        }

        var pendingClaim = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == mosqueId && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (pendingClaim)
            return (null, "A pending ownership claim exists for this mosque.", 409, false);

        var repo = _unitOfWork.Repository<MosqueInvitation>();
        var existingPending = await repo.Query()
            .Where(i => i.MosqueId == mosqueId && i.Status == InvitationStatus.Pending && !i.IsDeleted)
            .ToListAsync();
        foreach (var old in existingPending)
        {
            old.Status = InvitationStatus.Revoked;
            old.UpdatedAt = DateTime.UtcNow;
        }

        var invitation = new MosqueInvitation
        {
            MosqueId = mosqueId,
            InviteEmail = email,
            InviteName = string.IsNullOrWhiteSpace(inviteName) ? null : inviteName.Trim(),
            Role = normalizedRole,
            Token = GenerateToken(),
            Status = InvitationStatus.Pending,
            SentAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(DefaultExpiryDays),
            InvitedById = invitedById,
        };
        repo.Add(invitation);


        await _unitOfWork.SaveChangesAsync();
        var emailSent = await SendInvitationEmailAsync(invitation, mosque);

        return (invitation, null, 200, emailSent);
    }

    public async Task<(InvitePreviewDto? Preview, string? Error, int StatusCode)> GetInvitePreviewAsync(string token)
    {
        var invitation = await LoadPendingInvitationAsync(token);
        if (invitation == null)
            return (null, "Invalid or expired invitation.", 404);

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.Status = InvitationStatus.Expired;
            invitation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return (null, "This invitation has expired.", 410);
        }

        var mosque = invitation.Mosque!;
        return (new InvitePreviewDto
        {
            MosqueId = mosque.Id,
            MosqueName = mosque.Name,
            MosqueCity = mosque.City,
            InviteEmail = invitation.InviteEmail,
            InviteName = invitation.InviteName,
            Role = invitation.Role,
            ExpiresAt = invitation.ExpiresAt,
            RequiresLogin = true,
        }, null, 200);
    }

    public async Task<(string? Message, string? Error, int StatusCode)> AcceptInvitationAsync(string token, string userId)
    {
        var invitation = await LoadPendingInvitationAsync(token);
        if (invitation == null)
            return (null, "Invalid or expired invitation.", 404);

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.Status = InvitationStatus.Expired;
            invitation.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return (null, "This invitation has expired.", 410);
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return (null, "User not found.", 404);

        var userEmail = (user.Email ?? user.UserName ?? string.Empty).Trim().ToLowerInvariant();
        if (!string.Equals(userEmail, invitation.InviteEmail, StringComparison.OrdinalIgnoreCase))
            return (null, "This invitation was sent to a different email address. Log in with the invited email.", 403);

        var mosque = invitation.Mosque!;
        if (invitation.Role == Roles.MosqueOwner)
        {
            if (!string.IsNullOrEmpty(mosque.OwnerId) && mosque.OwnerId != userId)
                return (null, "This mosque already has a different owner.", 409);

            mosque.OwnerId = userId;
            mosque.Status = MosqueStatus.Claimed;
            mosque.UpdatedAt = DateTime.UtcNow;

            if (!await _userManager.IsInRoleAsync(user, Roles.MosqueOwner))
                await _userManager.AddToRoleAsync(user, Roles.MosqueOwner);
            if (!await _userManager.IsInRoleAsync(user, Roles.MosqueAdmin))
                await _userManager.AddToRoleAsync(user, Roles.MosqueAdmin);

            if (user.HomeMosqueId == null)
            {
                user.HomeMosqueId = mosque.Id;
                await _userManager.UpdateAsync(user);
            }

            await _moduleSeed.SeedAsync(mosque.Id);
        }
        else
        {
            // Assign exactly the invited role (user cannot change it)
            if (!await _userManager.IsInRoleAsync(user, invitation.Role))
                await _userManager.AddToRoleAsync(user, invitation.Role);

            if (user.HomeMosqueId == null)
            {
                user.HomeMosqueId = mosque.Id;
                await _userManager.UpdateAsync(user);
            }
        }

        invitation.Status = InvitationStatus.Accepted;
        invitation.AcceptedById = userId;
        invitation.AcceptedAt = DateTime.UtcNow;
        invitation.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return ($"Invitation accepted. You are now assigned as {invitation.Role} for {mosque.Name}.", null, 200);
    }

    public async Task<List<InvitationListItemDto>> ListInvitationsAsync(InvitationStatus? status = null)
    {
        var query = _unitOfWork.Repository<MosqueInvitation>().QueryNoTracking()
            .Include(i => i.Mosque)
            .Include(i => i.InvitedBy)
            .Where(i => !i.IsDeleted);

        if (status.HasValue)
            query = query.Where(i => i.Status == status.Value);

        var rows = await query
            .OrderByDescending(i => i.SentAt)
            .Take(500)
            .ToListAsync();

        return rows.Select(i =>
        {
            var item = MapListItem(i);
            item.AcceptLink = BuildAcceptLink(i.Token);
            return item;
        }).ToList();
    }

    public string BuildAcceptLink(string token)
    {
        var frontendUrl = (_configuration["App:FrontendUrl"] ?? "http://localhost:4200").TrimEnd('/');
        return $"{frontendUrl}/invite/accept?token={Uri.EscapeDataString(token)}";
    }

    public bool IsSmtpConfigured()
    {
        var smtp = _configuration.GetSection("Email:Smtp");
        return !string.IsNullOrWhiteSpace(smtp["Host"])
            && !string.IsNullOrWhiteSpace(smtp["Username"])
            && !string.IsNullOrWhiteSpace(smtp["Password"]);
    }

    public async Task<(string? Message, string? Error, int StatusCode)> ResendInvitationAsync(int invitationId)
    {
        var invitation = await _unitOfWork.Repository<MosqueInvitation>().Query()
            .Include(i => i.Mosque)
            .FirstOrDefaultAsync(i => i.Id == invitationId && !i.IsDeleted);
        if (invitation == null)
            return (null, "Invitation not found.", 404);

        if (invitation.Status != InvitationStatus.Pending)
            return (null, "Only pending invitations can be resent.", 400);

        invitation.SentAt = DateTime.UtcNow;
        invitation.ExpiresAt = DateTime.UtcNow.AddDays(DefaultExpiryDays);
        invitation.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        await SendInvitationEmailAsync(invitation, invitation.Mosque!);
        return ("Invitation resent.", null, 200);
    }

    public async Task<(string? Message, string? Error, int StatusCode)> RevokeInvitationAsync(int invitationId)
    {
        var invitation = await _unitOfWork.Repository<MosqueInvitation>().Query()
            .Include(i => i.Mosque)
            .FirstOrDefaultAsync(i => i.Id == invitationId && !i.IsDeleted);
        if (invitation == null)
            return (null, "Invitation not found.", 404);

        if (invitation.Status != InvitationStatus.Pending)
            return (null, "Only pending invitations can be revoked.", 400);

        invitation.Status = InvitationStatus.Revoked;
        invitation.UpdatedAt = DateTime.UtcNow;

        var mosque = invitation.Mosque!;


        await _unitOfWork.SaveChangesAsync();
        return ("Invitation revoked.", null, 200);
    }

    public async Task<int> CountPendingAsync() =>
        await _unitOfWork.Repository<MosqueInvitation>().QueryNoTracking()
            .CountAsync(i => i.Status == InvitationStatus.Pending && !i.IsDeleted && i.ExpiresAt > DateTime.UtcNow);

    private async Task<MosqueInvitation?> LoadPendingInvitationAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        return await _unitOfWork.Repository<MosqueInvitation>().Query()
            .Include(i => i.Mosque)
            .FirstOrDefaultAsync(i => i.Token == token.Trim()
                && i.Status == InvitationStatus.Pending
                && !i.IsDeleted);
    }

    private async Task<bool> SendInvitationEmailAsync(MosqueInvitation invitation, Mosque mosque)
    {
        var link = BuildAcceptLink(invitation.Token);
        var roleLabel = invitation.Role == Roles.MosqueOwner ? "Mosque Owner" : "Mosque Admin";
        var greeting = string.IsNullOrWhiteSpace(invitation.InviteName)
            ? "Assalamu alaikum"
            : $"Assalamu alaikum {System.Net.WebUtility.HtmlEncode(invitation.InviteName)}";

        var encodedName = System.Net.WebUtility.HtmlEncode(mosque.Name);
        var encodedLink = System.Net.WebUtility.HtmlEncode(link);

        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f4;font-family:Segoe UI,Arial,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f4;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #d1e0db;overflow:hidden;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#022c22,#064e3b);padding:24px 28px;">
                          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">MosqueOS</p>
                          <p style="margin:6px 0 0;font-size:13px;color:#a7f3d0;">Mosque invitation</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px;">
                          <p style="margin:0 0 16px;font-size:15px;color:#1f2937;line-height:1.6;">{greeting},</p>
                          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                            You have been invited to join <strong>{encodedName}</strong> as <strong>{roleLabel}</strong> on MosqueOS.
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                            <tr>
                              <td style="border-radius:10px;background:#0d5c4b;">
                                <a href="{encodedLink}" target="_blank"
                                   style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                                  Accept invitation
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:1.5;">
                            This link expires on {invitation.ExpiresAt:dd MMM yyyy} UTC.
                          </p>
                          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;word-break:break-all;">
                            If the button does not work, copy this link:<br>
                            <a href="{encodedLink}" style="color:#0d5c4b;">{encodedLink}</a>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 28px;background:#f8faf9;border-top:1px solid #e5ece8;">
                          <p style="margin:0;font-size:12px;color:#6b7280;">If you did not expect this invitation, you can ignore this email.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        var plain = $"""
            {greeting},

            You have been invited to join {mosque.Name} as {roleLabel} on MosqueOS.

            Accept invitation: {link}

            This link expires on {invitation.ExpiresAt:dd MMM yyyy} UTC.

            — MosqueOS
            """;

        try
        {
            await _emailSender.SendEmailAsync(invitation.InviteEmail, $"Invitation — {mosque.Name}", html, plain);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send invitation email to {Email}", invitation.InviteEmail);
            return false;
        }
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string? NormalizeInviteRole(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return Roles.MosqueOwner;

        var trimmed = role.Trim();
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [Roles.MosqueOwner] = Roles.MosqueOwner,
            ["MosqueOwner"] = Roles.MosqueOwner,
            [Roles.MosqueAdmin] = Roles.MosqueAdmin,
            ["MosqueAdmin"] = Roles.MosqueAdmin,
            [Roles.PrayerTimesEditor] = Roles.PrayerTimesEditor,
            ["PrayerTimesEditor"] = Roles.PrayerTimesEditor,
            [Roles.Teacher] = Roles.Teacher,
            [Roles.Muqaddam] = Roles.Muqaddam,
            [Roles.ContentEditor] = Roles.ContentEditor,
            ["ContentEditor"] = Roles.ContentEditor,
            [Roles.Parent] = Roles.Parent,
        };

        return map.TryGetValue(trimmed, out var normalized) ? normalized : null;
    }

    private static InvitationListItemDto MapListItem(MosqueInvitation i) => new()
    {
        Id = i.Id,
        MosqueId = i.MosqueId,
        MosqueName = i.Mosque?.Name ?? string.Empty,
        MosqueCity = i.Mosque?.City ?? string.Empty,
        MosqueStatus = i.Mosque?.Status.ToString() ?? string.Empty,
        InviteEmail = i.InviteEmail,
        InviteName = i.InviteName,
        Role = i.Role,
        Status = i.Status.ToString(),
        SentAt = i.SentAt,
        ExpiresAt = i.ExpiresAt,
        InvitedByName = i.InvitedBy?.FullName ?? i.InvitedBy?.UserName ?? "System",
        AcceptedAt = i.AcceptedAt,
    };
}

public class InvitePreviewDto
{
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public string MosqueCity { get; set; } = string.Empty;
    public string InviteEmail { get; set; } = string.Empty;
    public string? InviteName { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool RequiresLogin { get; set; }
}

public class InvitationListItemDto
{
    public int Id { get; set; }
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public string MosqueCity { get; set; } = string.Empty;
    public string MosqueStatus { get; set; } = string.Empty;
    public string InviteEmail { get; set; } = string.Empty;
    public string? InviteName { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string InvitedByName { get; set; } = string.Empty;
    public DateTime? AcceptedAt { get; set; }
    public string? AcceptLink { get; set; }
}

public class SendMosqueInviteRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string Role { get; set; } = Roles.MosqueOwner;
}

public class AcceptInviteRequest
{
    public string Token { get; set; } = string.Empty;
}

public class RegisterFromInviteRequest
{
    public string Token { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? ConfirmPassword { get; set; }
    public string? FullName { get; set; }
}
