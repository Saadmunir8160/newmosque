using MosqueOS.Domain;

namespace MosqueOS.Domain.Entities;

public class MosqueInvitation : BaseEntity
{
    public int MosqueId { get; set; }
    public Mosque? Mosque { get; set; }
    public string InviteEmail { get; set; } = string.Empty;
    public string? InviteName { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public string InvitedById { get; set; } = string.Empty;
    public ApplicationUser? InvitedBy { get; set; }
    public string? AcceptedById { get; set; }
    public ApplicationUser? AcceptedBy { get; set; }
    public DateTime? AcceptedAt { get; set; }
}
