namespace MosqueOS.Domain.Entities;

public class UserNotification : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser? User { get; set; }

    /// <summary>Machine key e.g. CLAIM_APPROVED, CLAIM_REJECTED, MOSQUE_ACTIVATED.</summary>
    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional in-app deep link (frontend route).</summary>
    public string? Route { get; set; }

    public int? RelatedMosqueId { get; set; }
    public int? RelatedClaimId { get; set; }

    public bool IsRead { get; set; }
}
