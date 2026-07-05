using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Domain.Constants;

namespace MosqueOS.API.Controllers;

[Route("api/v1/claims")]
[ApiController]
[Authorize(Roles = Roles.SuperAdmin)]
public class ClaimsController : ControllerBase
{
    private readonly OwnershipClaimService _claims;

    public ClaimsController(OwnershipClaimService claims) => _claims = claims;

    [HttpPost("{claimId:int}/approve")]
    public async Task<IActionResult> Approve(int claimId)
    {
        var reviewerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
        var (mosque, error, code) = await _claims.ApproveAndActivateAsync(claimId, reviewerId);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(new { mosque, message = "Claim approved and mosque activated.", activated = true });
    }

    [HttpPost("{claimId:int}/activate")]
    public async Task<IActionResult> Activate(int claimId)
    {
        var reviewerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
        var (mosque, error, code) = await _claims.ActivateAsync(claimId, reviewerId);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(new { mosque, message = "Mosque activated.", activated = true });
    }

    [HttpPost("{claimId:int}/reject")]
    public async Task<IActionResult> Reject(int claimId, [FromBody] RejectMosqueClaimRequest? dto)
    {
        var reviewerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system";
        var (mosque, error, code) = await _claims.RejectAsync(claimId, reviewerId, dto?.Reason);
        if (error != null) return StatusCode(code, new ApiMessageResponse { Message = error });
        return Ok(mosque);
    }
}
