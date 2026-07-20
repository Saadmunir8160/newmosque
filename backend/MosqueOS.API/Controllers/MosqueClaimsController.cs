using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Security.Claims;

namespace MosqueOS.API.Controllers;

[Route("api/v1/mosque-claims")]
[ApiController]
[Authorize]
public class MosqueClaimsController : ControllerBase
{
    private readonly OwnershipClaimService _claims;
    private readonly UserManager<ApplicationUser> _userManager;

    public MosqueClaimsController(OwnershipClaimService claims, UserManager<ApplicationUser> userManager)
    {
        _claims = claims;
        _userManager = userManager;
    }

    /// <summary>
    /// Submit ownership claim for an unclaimed mosque (Module 3.1).
    /// Policy: any authenticated, email-verified user except Super Admin (see ModuleRequirements Role Access).
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(12_582_912)]
    public async Task<IActionResult> Submit()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized(new ApiMessageResponse { Message = "You must be logged in to submit a claim." });

        if (!user.EmailConfirmed)
            return StatusCode(403, new ApiMessageResponse { Message = "Please verify your email before submitting a claim." });

        if (await _userManager.IsInRoleAsync(user, Roles.SuperAdmin))
            return StatusCode(403, new ApiMessageResponse { Message = "Super Admins cannot submit mosque ownership claims." });

        SubmitMosqueClaimRequest? body = null;
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            if (!int.TryParse(form["mosqueId"].ToString(), out var mosqueId) || mosqueId <= 0)
                return BadRequest(new ApiMessageResponse { Message = "Mosque id is required." });

            body = new SubmitMosqueClaimRequest
            {
                MosqueId = mosqueId,
                Role = form["role"].ToString(),
                Phone = form["phone"].ToString(),
                Notes = string.IsNullOrWhiteSpace(form["notes"]) ? null : form["notes"].ToString(),
                FullName = string.IsNullOrWhiteSpace(form["fullName"]) ? null : form["fullName"].ToString(),
                Email = string.IsNullOrWhiteSpace(form["email"]) ? null : form["email"].ToString(),
            };

            var proofFile = form.Files.GetFile("proofDocument");
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var (result, error, code) = await _claims.SubmitOwnershipClaimAsync(
                userId, body, proofFile is { Length: > 0 } ? proofFile : null, user);

            if (error != null)
                return StatusCode(code, new ApiMessageResponse { Message = error });

            return Ok(result);
        }

        body = await Request.ReadFromJsonAsync<SubmitMosqueClaimRequest>();
        if (body == null || body.MosqueId <= 0)
            return BadRequest(new ApiMessageResponse { Message = "Mosque id is required." });

        var jsonUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var (jsonResult, jsonError, jsonCode) = await _claims.SubmitOwnershipClaimAsync(
            jsonUserId, body, null, user);

        if (jsonError != null)
            return StatusCode(jsonCode, new ApiMessageResponse { Message = jsonError });

        return Ok(jsonResult);
    }
}
