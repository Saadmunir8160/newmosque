using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Models.Platform;
using MosqueOS.API.Services;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using System.Security.Claims;

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
                ClaimPendingListings = 0, // Legacy
                PendingReviewListings = all.Count(c => c.MosqueStatus == nameof(MosqueStatus.PendingVerification))
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

    /// <summary>Get single claim detail.</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var detail = await _claims.GetClaimDetailAsync(id);
        if (detail == null) return NotFound(new ApiMessageResponse { Message = "Claim not found." });
        return Ok(detail);
    }

    /// <summary>Approve claim — assign owner, set mosque to CLAIMED (activation is a separate step).</summary>
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var (mosque, error, code) = await _claims.ApproveAsync(id, reviewerId);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(new
        {
            message = "Claim approved. Ownership assigned. Mosque is CLAIMED — activate separately to go public.",
            mosqueId = mosque!.Id,
            mosqueStatus = mosque.Status.ToString()
        });
    }

    /// <summary>Activate mosque after approval — CLAIMED → ACTIVE.</summary>
    [HttpPost("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var (mosque, error, code) = await _claims.ActivateAsync(id, reviewerId);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(new
        {
            message = "Mosque activated. Public profile is now live.",
            mosqueId = mosque!.Id,
            mosqueStatus = mosque.Status.ToString()
        });
    }

    /// <summary>Reject claim with a reason (Module 3.1 verification flow).</summary>
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] MosqueOS.API.Models.Platform.RejectClaimRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new ApiMessageResponse { Message = "Rejection reason is required." });

        var reviewerId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var (mosque, error, code) = await _claims.RejectAsync(id, reviewerId, dto.Reason);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(new { message = "Claim rejected.", mosqueId = mosque!.Id });
    }

    /// <summary>Update claim details — Super Admin can add notes or correct applicant info.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateClaim(int id, [FromBody] UpdateClaimRequest dto)
    {
        var result = await _claims.UpdateClaimAsync(id, dto);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(new { message = "Claim updated.", claimId = id });
    }

    /// <summary>Delete a claim record — Super Admin only, non-reversible.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteClaim(int id)
    {
        var result = await _claims.DeleteClaimAsync(id);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(new { message = "Claim deleted." });
    }
}
