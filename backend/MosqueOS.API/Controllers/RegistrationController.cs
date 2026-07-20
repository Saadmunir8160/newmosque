using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MosqueOS.API.Models.Common;
using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;

namespace MosqueOS.API.Controllers
{
    [ApiController]
    [Route("api/v1/registrations")]
    public class RegistrationController : ControllerBase
    {
        private readonly MosqueRegistrationService _registrationService;

        public RegistrationController(MosqueRegistrationService registrationService)
        {
            _registrationService = registrationService;
        }

        [HttpPost]
        [Authorize]
        [EnableRateLimiting(MosqueRateLimitPolicies.RegistrationSubmit)]
        public async Task<IActionResult> SubmitRegistration([FromBody] SubmitRegistrationDto req)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var (request, error) = await _registrationService.SubmitRegistrationAsync(userId, req);
            if (error != null)
                return BadRequest(new ApiMessageResponse { Message = error });

            return Ok(new { message = "Registration request submitted successfully.", data = new { request!.Id } });
        }
    }
}
