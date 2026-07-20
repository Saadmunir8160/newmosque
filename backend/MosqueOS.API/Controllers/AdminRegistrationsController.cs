using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;
using MosqueOS.Domain.Constants;
using MosqueOS.API.Models.Common;

namespace MosqueOS.API.Controllers
{
    [ApiController]
    [Route("api/v1/superadmin/registrations")]
    [Authorize(Roles = Roles.SuperAdmin)]
    public class AdminRegistrationsController : ControllerBase
    {
        private readonly MosqueRegistrationService _registrationService;
        private readonly IUnitOfWork _unitOfWork;

        public AdminRegistrationsController(
            MosqueRegistrationService registrationService,
            IUnitOfWork unitOfWork)
        {
            _registrationService = registrationService;
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        public async Task<IActionResult> ListRegistrations([FromQuery] MosqueRegistrationStatus? status)
        {
            var query = _unitOfWork.Repository<MosqueRegistrationRequest>().Query()
                .Include(r => r.SubmittedBy)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            var requests = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminRegistrationListDto
                {
                    Id = r.Id,
                    Name = r.Name,
                    City = r.City,
                    Country = r.Country,
                    Status = r.Status,
                    SubmittedById = r.SubmittedById,
                    SubmittedByName = r.SubmittedBy != null ? r.SubmittedBy.FullName : "Unknown",
                    CreatedAt = r.CreatedAt,
                    ApprovedAt = r.ApprovedAt,
                    RejectionReason = r.RejectionReason
                })
                .ToListAsync();

            return Ok(new { data = requests });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetRegistration(int id)
        {
            var request = await _unitOfWork.Repository<MosqueRegistrationRequest>().Query()
                .Include(r => r.SubmittedBy)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound(new ApiMessageResponse { Message = "Registration request not found." });

            var dto = new AdminRegistrationDetailDto
            {
                Id = request.Id,
                Name = request.Name,
                Address = request.Address,
                City = request.City,
                Country = request.Country,
                Phone = request.Phone,
                Email = request.Email,
                Website = request.Website,
                Description = request.Description,
                Status = request.Status,
                SubmittedById = request.SubmittedById,
                SubmittedByName = request.SubmittedBy != null ? request.SubmittedBy.FullName : "Unknown",
                CreatedAt = request.CreatedAt,
                ApprovedAt = request.ApprovedAt,
                RejectionReason = request.RejectionReason
            };

            return Ok(new { data = dto });
        }

        [HttpPut("{id:int}/approve")]
        public async Task<IActionResult> ApproveRegistration(int id, [FromBody] ApproveRegistrationDto req)
        {
            var superAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(superAdminId)) return Unauthorized();

            var result = await _registrationService.ApproveRegistrationAsync(id, superAdminId);

            if (!result.Success) return BadRequest(new ApiMessageResponse { Message = result.Message });

            return Ok(new { message = result.Message, mosqueId = result.MosqueId });
        }

        [HttpPut("{id:int}/reject")]
        public async Task<IActionResult> RejectRegistration(int id, [FromBody] RejectRegistrationDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Reason))
                return BadRequest(new ApiMessageResponse { Message = "Rejection reason is required." });

            var superAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(superAdminId)) return Unauthorized();

            var result = await _registrationService.RejectRegistrationAsync(id, req.Reason, superAdminId);

            if (!result.Success) return BadRequest(new ApiMessageResponse { Message = result.Message });

            return Ok(new ApiMessageResponse { Message = result.Message });
        }
    }
}
