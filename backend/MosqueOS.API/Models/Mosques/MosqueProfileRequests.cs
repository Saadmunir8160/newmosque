namespace MosqueOS.API.Models.Mosques;

public class SocialLinkDto
{
    public string Platform { get; set; } = "custom";
    public string? Label { get; set; }
    public string Url { get; set; } = string.Empty;
}

public class ClaimDocumentDto
{
    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class ApproveMosqueClaimRequest
{
    /// <summary>Reserved for future use. Approval always sets CLAIMED; activation is a separate endpoint.</summary>
    public string Mode { get; set; } = "approveOnly";
}

public class RejectMosqueClaimRequest
{
    public string? Reason { get; set; }
}

public class AdminClaimListItemDto
{
    public int ClaimId { get; set; }
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string ApplicantUserId { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string? ApplicantEmail { get; set; }
    public string? ApplicantPhone { get; set; }
    public string? Position { get; set; }
    public string? Organization { get; set; }
    public string? RelationshipToMosque { get; set; }
    public int? YearsAssociated { get; set; }
    public string? ClaimReference { get; set; }
    public string? Reason { get; set; }
    public string? ProofDocumentUrl { get; set; }
    public IReadOnlyList<ClaimDocumentDto> Documents { get; set; } = Array.Empty<ClaimDocumentDto>();
    public string Status { get; set; } = string.Empty;
    public string MosqueStatus { get; set; } = string.Empty;
    public DateTime SubmittedDate { get; set; }
    public DateTime? DecidedDate { get; set; }
    public string? RejectionReason { get; set; }
}

public class AdminClaimDetailDto : AdminClaimListItemDto
{
    public string? MosqueAddress { get; set; }
    public string? MosquePhone { get; set; }
    public string? MosqueEmail { get; set; }
    public string? MosquePostcode { get; set; }
    public string? MosqueCountry { get; set; }
    public new string? RejectionReason { get; set; }
    public string? ReviewedById { get; set; }
}

public class AdminUpdateClaimRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? Organization { get; set; }
    public string? RelationshipToMosque { get; set; }
    public int? YearsAssociated { get; set; }
    public string? Reason { get; set; }
}

public class TransferOwnershipRequest
{
    public string NewOwnerId { get; set; } = string.Empty;
}
