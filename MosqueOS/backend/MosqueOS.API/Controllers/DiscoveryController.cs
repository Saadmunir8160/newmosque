using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace MosqueOS.API.Controllers
{
    [Route("api/v1/discovery")]
    [ApiController]
    [AllowAnonymous]
    public class DiscoveryController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<DiscoveryController> _logger;

        public DiscoveryController(
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager,
            IEmailSender emailSender,
            ILogger<DiscoveryController> logger)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _emailSender = emailSender;
            _logger = logger;
        }

        /// <summary>Public — submit a "Can't find your mosque" discovery request.</summary>
        [HttpPost("request")]
        public async Task<IActionResult> SubmitRequest([FromBody] MosqueDiscoveryRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MosqueName) || dto.MosqueName.Trim().Length < 3)
                return BadRequest(new ApiMessageResponse { Message = "Mosque name is required (minimum 3 characters)." });

            if (string.IsNullOrWhiteSpace(dto.City))
                return BadRequest(new ApiMessageResponse { Message = "City is required." });

            if (!string.IsNullOrWhiteSpace(dto.Email) && !new EmailAddressAttribute().IsValid(dto.Email))
                return BadRequest(new ApiMessageResponse { Message = "Email format is invalid." });

            var payload = JsonSerializer.Serialize(new
            {
                mosqueName = dto.MosqueName.Trim(),
                city = dto.City.Trim(),
                postcode = dto.Postcode?.Trim(),
                address = dto.Address?.Trim(),
                submitterName = dto.SubmitterName?.Trim(),
                email = dto.Email?.Trim(),
                notes = dto.Notes?.Trim(),
                submittedAt = DateTime.UtcNow
            });

            _unitOfWork.Repository<PlatformAuditLog>().Add(new PlatformAuditLog
            {
                Action = "MOSQUE_DISCOVERY_REQUEST",
                Module = "Discovery",
                ActorId = "public",
                ActorName = dto.SubmitterName?.Trim() ?? "Anonymous",
                TargetType = "Discovery",
                Description = payload
            });
            await _unitOfWork.SaveChangesAsync();

            await NotifySuperAdminsAsync(dto);

            return Ok(new ApiMessageResponse
            {
                Message = "Thank you! Your request has been received. Our team will review it and add the mosque to the directory."
            });
        }

        private async Task NotifySuperAdminsAsync(MosqueDiscoveryRequestDto dto)
        {
            var admins = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
            var html = $@"
                <p>A new mosque discovery request has been submitted.</p>
                <ul>
                  <li><strong>Mosque Name:</strong> {dto.MosqueName.Trim()}</li>
                  <li><strong>City:</strong> {dto.City.Trim()}</li>
                  {(string.IsNullOrWhiteSpace(dto.Postcode) ? "" : $"<li><strong>Postcode:</strong> {dto.Postcode.Trim()}</li>")}
                  {(string.IsNullOrWhiteSpace(dto.Address) ? "" : $"<li><strong>Address:</strong> {dto.Address.Trim()}</li>")}
                  {(string.IsNullOrWhiteSpace(dto.SubmitterName) ? "" : $"<li><strong>Submitted by:</strong> {dto.SubmitterName.Trim()}</li>")}
                  {(string.IsNullOrWhiteSpace(dto.Email) ? "" : $"<li><strong>Contact email:</strong> {dto.Email.Trim()}</li>")}
                  {(string.IsNullOrWhiteSpace(dto.Notes) ? "" : $"<li><strong>Notes:</strong> {dto.Notes.Trim()}</li>")}
                </ul>
                <p><a href=""/dashboard/super/mosques"">Review in Super Admin → Mosques</a></p>";

            foreach (var admin in admins.Where(a => !string.IsNullOrWhiteSpace(a.Email)))
            {
                try
                {
                    await _emailSender.SendEmailAsync(
                        admin.Email!,
                        $"New Mosque Discovery Request — {dto.MosqueName.Trim()}, {dto.City.Trim()}",
                        html);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify super admin {Email} of discovery request", admin.Email);
                }
            }
        }
    }

    public class MosqueDiscoveryRequestDto
    {
        public string MosqueName { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string? Postcode { get; set; }
        public string? Address { get; set; }
        public string? SubmitterName { get; set; }
        public string? Email { get; set; }
        public string? Notes { get; set; }
    }
}
