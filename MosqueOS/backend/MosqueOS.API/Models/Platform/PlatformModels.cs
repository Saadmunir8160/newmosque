namespace MosqueOS.API.Models.Platform;

public class AssignRoleRequest
{
    public string Role { get; set; } = string.Empty;
}

public class UpdatePlatformUserRequest
{
    public int? HomeMosqueId { get; set; }
    public bool ClearMosque { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
}

public class BulkUserActionRequest
{
    public string[] UserIds { get; set; } = Array.Empty<string>();
    public string Action { get; set; } = string.Empty;
    public string? Role { get; set; }
    public int? MosqueId { get; set; }
}

public class PlatformUserResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string FullName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public int? HomeMosqueId { get; set; }
    public string? MosqueName { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class ResetPasswordResponse
{
    public string Message { get; set; } = string.Empty;
    public string TemporaryPassword { get; set; } = string.Empty;
}

public class AssignAdminRequest
{
    public string UserId { get; set; } = string.Empty;
    public bool SetAsOwner { get; set; }
}

public class RejectClaimRequest
{
    public string? Reason { get; set; }
}

public class UpdateMosqueRequest
{
    public string? Name { get; set; }
    public string? Slug { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Postcode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? Description { get; set; }
    public string? MapLocation { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Timezone { get; set; }
    public string? Status { get; set; }
    public string? OwnerId { get; set; }
}

public class MosqueBulkActionRequest
{
    public int[] Ids { get; set; } = Array.Empty<int>();
    public string Status { get; set; } = string.Empty;
}

public class MosqueListingResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Postcode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? Description { get; set; }
    public string? MapLocation { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public string? OwnerName { get; set; }
    public string? OwnerEmail { get; set; }
    public List<MosquePersonResponse> Admins { get; set; } = [];
    public int AdminCount { get; set; }
    public int UserCount { get; set; }
    public bool IsDuplicate { get; set; }
    public string? DuplicateReason { get; set; }
    public int ProfileCompleteness { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class MosquePersonResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class AuditLogResponse
{
    public int Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public string? ActorName { get; set; }
    public string? TargetType { get; set; }
    public int? TargetId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class RoleMonitorResponse
{
    public int TotalUsers { get; set; }
    public int StandardRoleAssignments { get; set; }
    public int AdminRoleAssignments { get; set; }
    public int UnassignedUsers { get; set; }
    public double AssignmentCompletionPercent { get; set; }
    public int TotalRoleTypes { get; set; }
    public List<RoleWorkflowStep> Workflow { get; set; } = [];
    public List<RoleAssignmentRow> TopAssignments { get; set; } = [];
    public List<AuditLogResponse> AuditTrail { get; set; } = [];
}

public class RoleWorkflowStep
{
    public string Label { get; set; } = string.Empty;
    public int Value { get; set; }
}

public class RoleAssignmentRow
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string PrimaryRole { get; set; } = string.Empty;
    public int RoleCount { get; set; }
    public int Rank { get; set; }
}

public class PlatformSettingsResponse
{
    public string BaAlawiDefault { get; set; } = string.Empty;
    public string ShadhiliDefault { get; set; } = string.Empty;
    public string GlobalBanner { get; set; } = string.Empty;
}

public class SaveTariqaMappingRequest
{
    public string BaAlawiDefault { get; set; } = string.Empty;
    public string ShadhiliDefault { get; set; } = string.Empty;
}

public class SaveGlobalBannerRequest
{
    public string Text { get; set; } = string.Empty;
}

public class PendingOwnershipClaimResponse
{
    public int ClaimId { get; set; }
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Postcode { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string ClaimantId { get; set; } = string.Empty;
    public string ClaimantName { get; set; } = string.Empty;
    public string? ClaimantEmail { get; set; }
    public string MosqueStatus { get; set; } = string.Empty;
    public string ClaimType { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? DocumentUrl { get; set; }
}

public class PendingClaimsSummaryResponse
{
    public int Pending { get; set; }
    public int Rejected { get; set; }
    public int ClaimPendingListings { get; set; }
    public int PendingReviewListings { get; set; }
}

public class PendingClaimsResponse
{
    public PendingClaimsSummaryResponse Summary { get; set; } = new();
    public List<PendingOwnershipClaimResponse> Items { get; set; } = [];
}

public class BulkMosqueStatusRequest
{
    public int[] Ids { get; set; } = Array.Empty<int>();
    public string Status { get; set; } = string.Empty;
}
