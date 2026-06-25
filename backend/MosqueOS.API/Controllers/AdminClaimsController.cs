using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Models.Platform;
using MosqueOS.API.Services;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;

namespace MosqueOS.API.Controllers;

[Route("api/v1/admin/claims")]
[ApiController]
[Authorize(Roles = Roles.SuperAdmin)]
public class AdminClaimsController : ControllerBase
{
    private readonly OwnershipClaimService _claims;

    public AdminClaimsController(OwnershipClaimService claims) => _claims = claims;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status = "Pending")
    {
        OwnershipClaimStatus? filter = status?.ToLowerInvariant() switch
        {
            "pending" => OwnershipClaimStatus.Pending,
            "approved" => OwnershipClaimStatus.Approved,
            "rejected" => OwnershipClaimStatus.Rejected,
            "all" => null,
            _ => OwnershipClaimStatus.Pending
        };

        var items = await _claims.GetClaimsAsync(filter);
        var all = await _claims.GetClaimsAsync(null);

        return Ok(new
        {
            summary = new PendingClaimsSummaryResponse
            {
                Pending = all.Count(c => c.Status == nameof(OwnershipClaimStatus.Pending)),
                Rejected = all.Count(c => c.Status == nameof(OwnershipClaimStatus.Rejected)),
                ClaimPendingListings = all.Count(c => c.MosqueStatus == nameof(MosqueStatus.ClaimPending)),
                PendingReviewListings = all.Count(c => c.MosqueStatus == nameof(MosqueStatus.PendingReview))
            },
            items = items.Select(i => new
            {
                claimId = i.ClaimId,
                mosqueId = i.MosqueId,
                mosqueName = i.MosqueName,
                city = i.City,
                slug = i.Slug,
                applicantUserId = i.ApplicantUserId,
                applicantName = i.ApplicantName,
                applicantEmail = i.ApplicantEmail,
                applicantPhone = i.ApplicantPhone,
                fullName = i.ApplicantName,
                position = i.Position,
                organization = i.Organization,
                relationshipToMosque = i.RelationshipToMosque,
                yearsAssociated = i.YearsAssociated,
                claimReference = i.ClaimReference,
                reason = i.Reason,
                proofDocumentUrl = i.ProofDocumentUrl,
                documents = i.Documents,
                status = i.Status,
                mosqueStatus = i.MosqueStatus,
                submittedDate = i.SubmittedDate,
                decidedDate = i.DecidedDate
            })
        });
    }
}
