using MosqueOS.Domain;

namespace MosqueOS.Domain.Entities;

public class MosqueOwnershipClaim : BaseEntity
{
    public int MosqueId { get; set; }
    public Mosque? Mosque { get; set; }
    public string ClaimantId { get; set; } = string.Empty;
    public ApplicationUser? Claimant { get; set; }
    public OwnershipClaimStatus Status { get; set; } = OwnershipClaimStatus.Pending;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? DocumentUrl { get; set; }
    public string? DocumentsJson { get; set; }
    public string? Reason { get; set; }
    public string? ClaimReference { get; set; }
    public string? Organization { get; set; }
    public string? RelationshipToMosque { get; set; }
    public int? YearsAssociated { get; set; }
    public bool AccurateInfoDeclaration { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedById { get; set; }
}
