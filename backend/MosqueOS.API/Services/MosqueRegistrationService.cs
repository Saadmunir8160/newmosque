using Microsoft.AspNetCore.Identity;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class MosqueRegistrationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SlugService _slugService;
    private readonly MosqueModuleSeedService _moduleSeed;
    private readonly MosqueAuditService _audit;
    private readonly NotificationService _notifications;

    public MosqueRegistrationService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        SlugService slugService,
        MosqueModuleSeedService moduleSeed,
        MosqueAuditService audit,
        NotificationService notifications)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _slugService = slugService;
        _moduleSeed = moduleSeed;
        _audit = audit;
        _notifications = notifications;
    }

    public static List<string> ValidateSubmit(SubmitRegistrationDto dto)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.Name)) errors.Add("Mosque name is required.");
        if (string.IsNullOrWhiteSpace(dto.City)) errors.Add("City is required.");
        if (string.IsNullOrWhiteSpace(dto.Address)) errors.Add("Address is required.");
        if (string.IsNullOrWhiteSpace(dto.Country)) errors.Add("Country is required.");
        if (string.IsNullOrWhiteSpace(dto.Phone) && string.IsNullOrWhiteSpace(dto.Email))
            errors.Add("Phone or email is required.");
        return errors;
    }

    public async Task<(MosqueRegistrationRequest? Request, string? Error)> SubmitRegistrationAsync(
        string userId, SubmitRegistrationDto dto)
    {
        var errors = ValidateSubmit(dto);
        if (errors.Count > 0)
            return (null, string.Join(" ", errors));

        var request = new MosqueRegistrationRequest
        {
            Name = dto.Name.Trim(),
            Address = dto.Address.Trim(),
            City = dto.City.Trim(),
            Country = string.IsNullOrWhiteSpace(dto.Country) ? "United Kingdom" : dto.Country.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Website = string.IsNullOrWhiteSpace(dto.Website) ? null : dto.Website.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Status = MosqueRegistrationStatus.Pending,
            SubmittedById = userId,
            CreatedAt = DateTime.UtcNow
        };

        _unitOfWork.Repository<MosqueRegistrationRequest>().Add(request);
        await _unitOfWork.SaveChangesAsync();

        await _audit.LogRegistrationAsync(
            "REGISTRATION_SUBMITTED",
            userId,
            request.Id,
            $"User submitted registration for '{request.Name}' in {request.City}.");

        var admins = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
        foreach (var admin in admins)
        {
            await _notifications.CreateAsync(
                admin.Id,
                "REGISTRATION_SUBMITTED",
                "New mosque registration",
                $"{request.Name} ({request.City}) awaits review.",
                "/dashboard/super/registrations",
                relatedClaimId: null);
        }

        return (request, null);
    }

    public async Task<(bool Success, string Message, int? MosqueId)> ApproveRegistrationAsync(
        int requestId, string superAdminId)
    {
        var request = await _unitOfWork.Repository<MosqueRegistrationRequest>().FindAsync(requestId);
        if (request == null) return (false, "Registration request not found.", null);
        if (request.Status != MosqueRegistrationStatus.Pending)
            return (false, "Request is not in pending state.", null);

        var submitter = await _userManager.FindByIdAsync(request.SubmittedById);
        if (submitter == null) return (false, "Submitter user not found.", null);

        var slug = await _slugService.GenerateUniqueAsync(request.Name);
        var mosque = new Mosque
        {
            Name = request.Name,
            Slug = slug,
            Address = request.Address,
            City = request.City,
            Country = request.Country,
            Phone = request.Phone,
            Email = request.Email,
            Website = request.Website,
            Description = request.Description,
            Status = MosqueStatus.Claimed,
            OwnerId = submitter.Id,
            Timezone = "Europe/London",
            CreatedAt = DateTime.UtcNow
        };
        MosqueSocialLinksHelper.SyncJsonFromLegacy(mosque);

        _unitOfWork.Repository<Mosque>().Add(mosque);

        request.Status = MosqueRegistrationStatus.Approved;
        request.ApprovedAt = DateTime.UtcNow;

        if (!await _userManager.IsInRoleAsync(submitter, Roles.MosqueOwner))
            await _userManager.AddToRoleAsync(submitter, Roles.MosqueOwner);
        if (!await _userManager.IsInRoleAsync(submitter, Roles.MosqueAdmin))
            await _userManager.AddToRoleAsync(submitter, Roles.MosqueAdmin);

        if (submitter.HomeMosqueId == null)
        {
            // HomeMosqueId set after SaveChanges when mosque.Id is available
        }

        await _unitOfWork.SaveChangesAsync();

        if (submitter.HomeMosqueId == null)
        {
            submitter.HomeMosqueId = mosque.Id;
            await _userManager.UpdateAsync(submitter);
        }

        await _moduleSeed.SeedAsync(mosque.Id);

        await _audit.LogMosqueAsync(
            "REGISTRATION_APPROVED",
            superAdminId,
            mosque.Id,
            $"Approved registration {requestId}; created mosque '{mosque.Name}' as CLAIMED.");

        await _notifications.CreateAsync(
            submitter.Id,
            "REGISTRATION_APPROVED",
            "Mosque registration approved",
            $"'{mosque.Name}' was created. Complete the profile, then a Super Admin will activate it for the public directory.",
            "/dashboard/owner/my-mosque",
            relatedMosqueId: mosque.Id);

        return (true, "Registration approved. Mosque created as CLAIMED — activate when the profile is ready.", mosque.Id);
    }

    public async Task<(bool Success, string Message)> RejectRegistrationAsync(
        int requestId, string reason, string superAdminId)
    {
        var request = await _unitOfWork.Repository<MosqueRegistrationRequest>().FindAsync(requestId);
        if (request == null) return (false, "Registration request not found.");
        if (request.Status != MosqueRegistrationStatus.Pending)
            return (false, "Request is not in pending state.");

        request.Status = MosqueRegistrationStatus.Rejected;
        request.RejectionReason = reason.Trim();
        request.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        await _audit.LogRegistrationAsync(
            "REGISTRATION_REJECTED",
            superAdminId,
            requestId,
            $"Rejected registration {requestId}. Reason: {reason.Trim()}");

        await _notifications.CreateAsync(
            request.SubmittedById,
            "REGISTRATION_REJECTED",
            "Mosque registration rejected",
            reason.Trim(),
            "/dashboard/owner/mosque-listings");

        return (true, "Registration rejected.");
    }
}
