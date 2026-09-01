using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public class OwnershipClaimService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly MosqueModuleSeedService _moduleSeed;
    private readonly SlugService _slugService;
    private readonly IWebHostEnvironment _env;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<OwnershipClaimService> _logger;
    private readonly MosqueAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly IFileStorageService _storage;
    private readonly MosquePublicProfileCache _publicCache;

    public OwnershipClaimService(
        IUnitOfWork unitOfWork,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        MosqueModuleSeedService moduleSeed,
        SlugService slugService,
        IWebHostEnvironment env,
        IEmailSender emailSender,
        ILogger<OwnershipClaimService> logger,
        MosqueAuditService audit,
        NotificationService notifications,
        IFileStorageService storage,
        MosquePublicProfileCache publicCache)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _roleManager = roleManager;
        _moduleSeed = moduleSeed;
        _slugService = slugService;
        _env = env;
        _emailSender = emailSender;
        _logger = logger;
        _audit = audit;
        _notifications = notifications;
        _storage = storage;
        _publicCache = publicCache;
    }

    public async Task<string> GenerateClaimReferenceAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"MC-{year}-";
        var latest = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .Where(c => c.ClaimReference != null && c.ClaimReference.StartsWith(prefix))
            .OrderByDescending(c => c.ClaimReference)
            .Select(c => c.ClaimReference)
            .FirstOrDefaultAsync();

        var seq = 1;
        if (!string.IsNullOrEmpty(latest))
        {
            var tail = latest[(prefix.Length)..];
            if (int.TryParse(tail, out var parsed))
                seq = parsed + 1;
        }

        return $"{prefix}{seq:D6}";
    }

    public async Task<(SubmitMosqueClaimResponse? Result, string? Error, int StatusCode)> SubmitOwnershipClaimAsync(
        string userId,
        SubmitMosqueClaimRequest dto,
        IFormFile? proofFile,
        ApplicationUser claimant)
    {
        var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(dto.MosqueId);
        if (mosque == null || mosque.IsDeleted)
            return (null, "Mosque not found.", 404);

        // Spec: UNCLAIMED | CLAIMED | ACTIVE — pending review is on the claim record only.
        if (mosque.Status == MosqueStatus.ClaimPending)
            mosque.Status = MosqueStatus.Unclaimed;

        if (mosque.Status != MosqueStatus.Unclaimed)
            return (null, "This mosque has already been claimed.", 400);

        if (!mosque.AllowClaimRequests)
            return (null, "This mosque is not accepting claim requests.", 400);

        var hasProofUrl = !string.IsNullOrWhiteSpace(dto.ProofDocument);
        var errors = MosqueValidation.ValidateOwnershipClaim(dto, proofFile != null, hasProofUrl);
        if (errors.Count > 0)
            return (null, string.Join(" ", errors), 400);

        var hasPendingForUser = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == dto.MosqueId && c.ClaimantId == userId
                && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPendingForUser)
            return (null, "A claim for this mosque is already under review.", 409);

        var hasPendingMosque = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == dto.MosqueId && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPendingMosque)
            return (null, "A claim for this mosque is already under review.", 409);

        string? docUrl = dto.ProofDocument;
        string? docsJson = null;
        if (proofFile != null)
        {
            var (primary, json, docErr) = await ClaimFormHelper.SaveProofDocumentAsync(dto.MosqueId, _storage, proofFile);
            if (docErr != null) return (null, docErr, 400);
            docUrl = primary;
            docsJson = json;
        }

        var claimRef = await GenerateClaimReferenceAsync();
        var fullName = string.IsNullOrWhiteSpace(dto.FullName)
            ? claimant.FullName
            : dto.FullName.Trim();

        var claim = new MosqueOwnershipClaim
        {
            MosqueId = dto.MosqueId,
            ClaimantId = userId,
            Status = OwnershipClaimStatus.Pending,
            FullName = fullName,
            Phone = dto.Phone.Trim(),
            Position = dto.Role.Trim(),
            DocumentUrl = docUrl,
            DocumentsJson = docsJson,
            Reason = dto.Notes?.Trim(),
            RelationshipToMosque = dto.Role.Trim(),
            AccurateInfoDeclaration = true,
            ClaimReference = claimRef,
            SubmittedAt = DateTime.UtcNow
        };

        mosque.Status = MosqueStatus.Unclaimed;
        mosque.AllowClaimRequests = false;
        mosque.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Repository<MosqueOwnershipClaim>().Add(claim);
        await _unitOfWork.SaveChangesAsync();
        await _publicCache.InvalidateMosqueAsync(mosque);

        await LogAuditAsync("CLAIM_SUBMITTED", userId, mosque.Id,
            $"New ownership claim received for {mosque.Name}. Reference {claimRef}.");

        await SendClaimEmailsAsync(claimant, mosque, claim);

        await _notifications.CreateAsync(
            userId,
            "CLAIM_SUBMITTED",
            "Claim submitted",
            $"Your ownership claim for '{mosque.Name}' ({claimRef}) is under review.",
            "/dashboard/owner/my-claims",
            relatedMosqueId: mosque.Id,
            relatedClaimId: claim.Id);

        var admins = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
        foreach (var admin in admins)
        {
            await _notifications.CreateAsync(
                admin.Id,
                "CLAIM_SUBMITTED",
                "New ownership claim",
                $"{mosque.Name} — claim {claimRef} awaits review.",
                "/dashboard/super/claims",
                relatedMosqueId: mosque.Id,
                relatedClaimId: claim.Id);
        }

        return (new SubmitMosqueClaimResponse
        {
            Success = true,
            ClaimReference = claimRef,
            Status = "PENDING",
            Message = "Claim submitted successfully."
        }, null, 200);
    }

    private async Task SendClaimEmailsAsync(ApplicationUser claimant, Mosque mosque, MosqueOwnershipClaim claim)
    {
        var submitted = claim.SubmittedAt.ToString("dd MMM yyyy HH:mm") + " UTC";
        var userHtml = $@"
            <p>Your mosque ownership claim has been submitted.</p>
            <ul>
              <li><strong>Reference:</strong> {claim.ClaimReference}</li>
              <li><strong>Mosque:</strong> {mosque.Name}</li>
              <li><strong>Submitted:</strong> {submitted}</li>
              <li><strong>Status:</strong> Pending</li>
            </ul>
            <p>You will receive an email when your claim is approved or rejected.</p>";

        if (!string.IsNullOrWhiteSpace(claimant.Email))
        {
            try
            {
                await _emailSender.SendEmailAsync(
                    claimant.Email,
                    "Mosque Ownership Claim Submitted",
                    userHtml);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send claim confirmation email to {Email}", claimant.Email);
            }
        }

        var admins = await _userManager.GetUsersInRoleAsync(Roles.SuperAdmin);
        var adminHtml = $@"
            <p>New ownership claim received for <strong>{mosque.Name}</strong>.</p>
            <p>Reference: {claim.ClaimReference}<br/>
            Claimant: {claim.FullName} ({claimant.Email})</p>
            <p><a href=""/dashboard/super/claims"">Review Claim</a></p>";

        foreach (var admin in admins.Where(a => !string.IsNullOrWhiteSpace(a.Email)))
        {
            try
            {
                await _emailSender.SendEmailAsync(
                    admin.Email!,
                    $"New ownership claim — {mosque.Name}",
                    adminHtml);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify super admin {Email}", admin.Email);
            }
        }
    }

    public async Task<(ClaimMosqueResponse? Result, string? Error, int StatusCode)> SubmitClaimAsync(
        int mosqueId,
        string userId,
        ClaimMosqueRequest dto,
        List<(string Label, IFormFile File)> documents)
    {
        var mosque = await _unitOfWork.Repository<Mosque>().FindAsync(mosqueId);
        if (mosque == null || mosque.IsDeleted)
            return (null, "Mosque not found.", 404);

        // Spec: UNCLAIMED | CLAIMED | ACTIVE — pending review is on the claim record only.
        if (mosque.Status == MosqueStatus.ClaimPending)
            mosque.Status = MosqueStatus.Unclaimed;

        if (mosque.Status != MosqueStatus.Unclaimed)
            return (null, "This mosque has already been claimed.", 400);

        if (!mosque.AllowClaimRequests)
            return (null, "This mosque is not accepting claim requests.", 400);

        var errors = MosqueValidation.ValidateClaim(dto, requireDocuments: documents.Count == 0 && string.IsNullOrWhiteSpace(dto.DocumentUrl));
        if (errors.Count > 0)
            return (null, string.Join(" ", errors), 400);

        var hasPendingForUser = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == mosqueId && c.ClaimantId == userId
                && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPendingForUser)
            return (null, "A claim for this mosque is already under review.", 409);

        var hasPendingMosque = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == mosqueId && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPendingMosque)
            return (null, "A claim for this mosque is already under review.", 409);

        var ownedActive = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .AnyAsync(m => m.OwnerId == userId && m.Status == MosqueStatus.Active && !m.IsDeleted);
        var allowMulti = await PlatformConfigHelper.AllowMultiMosqueOwnershipAsync(_unitOfWork);
        if (ownedActive && !allowMulti)
            return (null, "You already own an active mosque listing.", 409);

        string? docUrl = dto.DocumentUrl;
        string? docsJson = null;
        if (documents.Count > 0)
        {
            var (primary, json, docErr) = await ClaimFormHelper.SaveDocumentsAsync(mosqueId, _storage, documents);
            if (docErr != null) return (null, docErr, 400);
            docUrl = primary;
            docsJson = json;
        }

        var claim = new MosqueOwnershipClaim
        {
            MosqueId = mosqueId,
            ClaimantId = userId,
            Status = OwnershipClaimStatus.Pending,
            FullName = dto.FullName.Trim(),
            Phone = dto.Phone,
            Position = dto.Position,
            DocumentUrl = docUrl,
            DocumentsJson = docsJson,
            Reason = dto.Reason,
            Organization = dto.Organization,
            RelationshipToMosque = dto.RelationshipToMosque,
            YearsAssociated = dto.YearsAssociated,
            AccurateInfoDeclaration = dto.AccurateInfoDeclaration,
            ClaimReference = await GenerateClaimReferenceAsync(),
            SubmittedAt = DateTime.UtcNow
        };

        mosque.Status = MosqueStatus.ClaimPending;
        mosque.AllowClaimRequests = false;
        mosque.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Repository<MosqueOwnershipClaim>().Add(claim);
        await _unitOfWork.SaveChangesAsync();
        await _publicCache.InvalidateMosqueAsync(mosque);

        var claimant = await _userManager.FindByIdAsync(userId);
        if (claimant != null)
            await SendClaimEmailsAsync(claimant, mosque, claim);

        await LogAuditAsync("CLAIM_SUBMITTED", userId, mosqueId,
            $"Ownership claim {claim.ClaimReference} submitted for '{mosque.Name}'.");

        await _notifications.CreateAsync(
            userId,
            "CLAIM_SUBMITTED",
            "Claim submitted",
            $"Your ownership claim for '{mosque.Name}' ({claim.ClaimReference}) is under review.",
            "/dashboard/owner/my-claims",
            relatedMosqueId: mosque.Id,
            relatedClaimId: claim.Id);

        return (BuildClaimResponse(mosque, claim), null, 200);
    }

    public async Task<(ClaimMosqueResponse? Result, string? Error, int StatusCode)> SubmitNewListingAsync(
        string userId,
        MosqueCreateDto dto)
    {
        var errors = MosqueValidation.ValidateCreate(dto);
        if (errors.Count > 0)
            return (null, string.Join(" ", errors), 400);

        var hasPendingGlobal = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.ClaimantId == userId && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPendingGlobal)
            return (null, "You already have a pending claim.", 409);

        var ownedActive = await _unitOfWork.Repository<Mosque>().QueryNoTracking()
            .AnyAsync(m => m.OwnerId == userId && m.Status == MosqueStatus.Active && !m.IsDeleted);
        var allowMulti = await PlatformConfigHelper.AllowMultiMosqueOwnershipAsync(_unitOfWork);
        if (ownedActive && !allowMulti)
            return (null, "You already own an active mosque listing.", 409);

        var slug = string.IsNullOrWhiteSpace(dto.Slug)
            ? await _slugService.GenerateUniqueAsync(dto.Name)
            : await _slugService.GenerateUniqueAsync(dto.Slug);

        var mosque = new Mosque
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            Address = dto.Address?.Trim() ?? string.Empty,
            City = dto.City.Trim(),
            Postcode = dto.Postcode?.Trim() ?? string.Empty,
            Country = dto.Country?.Trim() ?? "United Kingdom",
            Phone = dto.Phone,
            Email = dto.Email,
            Website = dto.Website,
            Description = dto.Description,
            Status = MosqueStatus.PendingReview,
            Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? "Europe/London" : dto.Timezone.Trim()
        };

        _unitOfWork.Repository<Mosque>().Add(mosque);
        await _unitOfWork.SaveChangesAsync();
        await _moduleSeed.SeedAsync(mosque.Id);

        var claim = new MosqueOwnershipClaim
        {
            MosqueId = mosque.Id,
            ClaimantId = userId,
            Status = OwnershipClaimStatus.Pending,
            FullName = dto.Name.Trim(),
            Phone = dto.Phone,
            Position = "Submitter",
            RelationshipToMosque = "Community Member",
            Reason = dto.Description ?? "New mosque listing submission.",
            ClaimReference = await GenerateClaimReferenceAsync(),
            SubmittedAt = DateTime.UtcNow,
            AccurateInfoDeclaration = true
        };

        _unitOfWork.Repository<MosqueOwnershipClaim>().Add(claim);
        await _unitOfWork.SaveChangesAsync();

        return (BuildClaimResponse(mosque, claim), null, 200);
    }

    /// <summary>
    /// Module 3.1 Step 1 of verification: approve ownership → CLAIMED (not yet public).
    /// Activation is a separate Super Admin step.
    /// </summary>
    public async Task<(Mosque? Mosque, string? Error, int StatusCode)> ApproveAsync(int claimId, string reviewerId)
    {
        var claim = await LoadClaimAsync(claimId);
        if (claim == null) return (null, "Claim not found.", 404);
        if (claim.Status != OwnershipClaimStatus.Pending)
            return (null, "Claim is not pending.", 400);

        var mosque = claim.Mosque!;
        if (!string.IsNullOrEmpty(mosque.OwnerId) && mosque.OwnerId != claim.ClaimantId)
            return (null, "Mosque ownership has already been assigned.", 409);

        var claimant = await _userManager.FindByIdAsync(claim.ClaimantId);
        if (claimant == null) return (null, "Claimant not found.", 404);

        mosque.OwnerId = claim.ClaimantId;
        mosque.Status = MosqueStatus.Claimed;
        mosque.UpdatedAt = DateTime.UtcNow;

        claim.Status = OwnershipClaimStatus.Approved;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.ReviewedById = reviewerId;

        if (!await _userManager.IsInRoleAsync(claimant, Roles.MosqueOwner))
            await _userManager.AddToRoleAsync(claimant, Roles.MosqueOwner);
        if (!await _userManager.IsInRoleAsync(claimant, Roles.MosqueAdmin))
            await _userManager.AddToRoleAsync(claimant, Roles.MosqueAdmin);

        if (claimant.HomeMosqueId == null)
        {
            claimant.HomeMosqueId = mosque.Id;
            await _userManager.UpdateAsync(claimant);
        }

        await _unitOfWork.SaveChangesAsync();
        await _publicCache.InvalidateMosqueAsync(mosque);

        await LogClaimAuditAsync(
            "CLAIM_APPROVED",
            reviewerId,
            mosque.Id,
            claim.Id,
            $"Approved claim {claim.ClaimReference} for '{mosque.Name}'. Owner assigned; mosque remains CLAIMED pending activation.");

        await SendClaimApprovedEmailAsync(claimant, mosque, claim);

        await _notifications.CreateAsync(
            claimant.Id,
            "CLAIM_APPROVED",
            "Claim approved",
            $"Ownership of '{mosque.Name}' was assigned to you. A Super Admin will activate the public listing next.",
            "/dashboard/owner/my-mosque",
            relatedMosqueId: mosque.Id,
            relatedClaimId: claim.Id);

        return (mosque, null, 200);
    }

    /// <summary>
    /// Module 3.1 Step 2 of verification: CLAIMED → ACTIVE (public listing goes live).
    /// </summary>
    public async Task<(Mosque? Mosque, string? Error, int StatusCode)> ActivateAsync(int claimId, string reviewerId)
    {
        var claim = await LoadClaimAsync(claimId);
        if (claim == null) return (null, "Claim not found.", 404);
        if (claim.Status != OwnershipClaimStatus.Approved)
            return (null, "Only an approved claim can be used to activate the mosque.", 400);

        var mosque = claim.Mosque!;
        if (mosque.Status != MosqueStatus.Claimed && mosque.Status != MosqueStatus.Suspended)
            return (null, "Mosque must be in Claimed status before activation.", 400);

        if (string.IsNullOrEmpty(mosque.OwnerId))
            return (null, "Mosque has no assigned owner.", 400);

        var hasPending = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .AnyAsync(c => c.MosqueId == mosque.Id && c.Status == OwnershipClaimStatus.Pending && !c.IsDeleted);
        if (hasPending)
            return (null, "Cannot activate while a pending ownership claim exists.", 400);

        var (gateOk, completeness, missing) = MosqueProfileCompleteness.MeetsActivationGate(mosque);
        if (!gateOk)
            return (null, $"Mosque profile is incomplete for activation ({completeness}% complete). Missing: {string.Join(", ", missing)}.", 400);

        mosque.Status = MosqueStatus.Active;
        mosque.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        await _publicCache.InvalidateMosqueAsync(mosque);

        await LogClaimAuditAsync(
            "MOSQUE_ACTIVATED",
            reviewerId,
            mosque.Id,
            claim.Id,
            $"Activated mosque '{mosque.Name}' via claim {claim.ClaimReference}.");

        var owner = await _userManager.FindByIdAsync(mosque.OwnerId);
        if (owner != null)
        {
            await SendMosqueActivatedEmailAsync(owner, mosque, claim);
            await _notifications.CreateAsync(
                owner.Id,
                "MOSQUE_ACTIVATED",
                "Mosque activated",
                $"'{mosque.Name}' is now ACTIVE on the public directory.",
                "/dashboard/owner/my-mosque",
                relatedMosqueId: mosque.Id,
                relatedClaimId: claim.Id);
        }

        return (mosque, null, 200);
    }

    public async Task<(Mosque? Mosque, string? Error, int StatusCode)> RejectAsync(int claimId, string reviewerId, string? reason)
    {
        var claim = await LoadClaimAsync(claimId);
        if (claim == null) return (null, "Claim not found.", 404);
        if (claim.Status != OwnershipClaimStatus.Pending)
            return (null, "This claim has already been reviewed.", 400);

        if (string.IsNullOrWhiteSpace(reason))
            return (null, "Rejection reason is required.", 400);

        var mosque = claim.Mosque!;
        claim.Status = OwnershipClaimStatus.Rejected;
        claim.RejectionReason = reason.Trim();
        claim.ReviewedAt = DateTime.UtcNow;
        claim.ReviewedById = reviewerId;

        if (mosque.Status == MosqueStatus.PendingReview)
        {
            mosque.Status = MosqueStatus.Archived;
            mosque.IsDeleted = true;
            mosque.DeletedAt = DateTime.UtcNow;
            mosque.DeletedById = reviewerId;
        }
        else
        {
            mosque.Status = MosqueStatus.Unclaimed;
            mosque.OwnerId = null;
            mosque.AllowClaimRequests = true;
        }

        mosque.UpdatedAt = DateTime.UtcNow;

        var claimant = await _userManager.FindByIdAsync(claim.ClaimantId);
        if (claimant?.HomeMosqueId == mosque.Id)
        {
            claimant.HomeMosqueId = null;
            await _userManager.UpdateAsync(claimant);
        }

        await _unitOfWork.SaveChangesAsync();

        await LogClaimAuditAsync(
            "CLAIM_REJECTED",
            reviewerId,
            mosque.Id,
            claim.Id,
            $"Rejected claim {claim.ClaimReference} for '{mosque.Name}': {claim.RejectionReason}");

        if (claimant != null)
            await SendClaimRejectedEmailAsync(claimant, mosque, claim);

        if (claimant != null)
        {
            await _notifications.CreateAsync(
                claimant.Id,
                "CLAIM_REJECTED",
                "Claim rejected",
                $"Your claim for '{mosque.Name}' was rejected: {claim.RejectionReason}",
                "/dashboard/owner/my-claims",
                relatedMosqueId: mosque.Id,
                relatedClaimId: claim.Id);
        }

        return (mosque, null, 200);
    }

    public async Task<AdminClaimDetailDto?> GetClaimDetailAsync(int claimId)
    {
        var claim = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .Include(c => c.Mosque)
            .Include(c => c.Claimant)
            .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);

        if (claim == null) return null;

        return new AdminClaimDetailDto
        {
            ClaimId = claim.Id,
            MosqueId = claim.MosqueId,
            MosqueName = claim.Mosque?.Name ?? "",
            City = claim.Mosque?.City ?? "",
            Slug = claim.Mosque?.Slug ?? "",
            MosqueAddress = claim.Mosque?.Address,
            MosquePhone = claim.Mosque?.Phone,
            MosqueEmail = claim.Mosque?.Email,
            MosquePostcode = claim.Mosque?.Postcode,
            MosqueCountry = claim.Mosque?.Country,
            ApplicantUserId = claim.ClaimantId,
            ApplicantName = claim.FullName,
            ApplicantEmail = claim.Claimant?.Email,
            ApplicantPhone = claim.Phone,
            Position = claim.Position,
            Organization = claim.Organization,
            RelationshipToMosque = claim.RelationshipToMosque,
            YearsAssociated = claim.YearsAssociated,
            ClaimReference = claim.ClaimReference,
            Reason = claim.Reason,
            ProofDocumentUrl = claim.DocumentUrl,
            Documents = ClaimFormHelper.ParseDocumentsJson(claim.DocumentsJson, claim.DocumentUrl),
            Status = claim.Status.ToString(),
            MosqueStatus = claim.Mosque?.Status.ToString() ?? "",
            SubmittedDate = claim.SubmittedAt,
            DecidedDate = claim.ReviewedAt,
            RejectionReason = claim.RejectionReason,
            ReviewedById = claim.ReviewedById,
        };
    }

    public async Task<List<AdminClaimListItemDto>> GetClaimsAsync(OwnershipClaimStatus? status = OwnershipClaimStatus.Pending)
    {
        var query = _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .Include(c => c.Mosque)
            .Include(c => c.Claimant)
            .Where(c => !c.IsDeleted);

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        var claims = await query.OrderByDescending(c => c.SubmittedAt).ToListAsync();

        return claims.Select(c => new AdminClaimListItemDto
        {
            ClaimId = c.Id,
            MosqueId = c.MosqueId,
            MosqueName = c.Mosque?.Name ?? "",
            City = c.Mosque?.City ?? "",
            Slug = c.Mosque?.Slug ?? "",
            ApplicantUserId = c.ClaimantId,
            ApplicantName = c.FullName,
            ApplicantEmail = c.Claimant?.Email,
            ApplicantPhone = c.Phone,
            Position = c.Position,
            Organization = c.Organization,
            RelationshipToMosque = c.RelationshipToMosque,
            YearsAssociated = c.YearsAssociated,
            ClaimReference = c.ClaimReference,
            Reason = c.Reason,
            ProofDocumentUrl = c.DocumentUrl,
            Documents = ClaimFormHelper.ParseDocumentsJson(c.DocumentsJson, c.DocumentUrl),
            Status = c.Status.ToString(),
            MosqueStatus = c.Mosque?.Status.ToString() ?? "",
            SubmittedDate = c.SubmittedAt,
            DecidedDate = c.ReviewedAt,
            RejectionReason = c.RejectionReason
        }).ToList();
    }

    public async Task<List<MyClaimListItemDto>> GetMyClaimsAsync(string userId)
    {
        var claims = await _unitOfWork.Repository<MosqueOwnershipClaim>().QueryNoTracking()
            .Include(c => c.Mosque)
            .Where(c => c.ClaimantId == userId && !c.IsDeleted)
            .OrderByDescending(c => c.SubmittedAt)
            .ToListAsync();

        return claims.Select(c => new MyClaimListItemDto
        {
            ClaimId = c.Id,
            ClaimReference = c.ClaimReference ?? "",
            MosqueId = c.MosqueId,
            MosqueName = c.Mosque?.Name ?? "",
            MosqueSlug = c.Mosque?.Slug,
            Status = c.Status.ToString(),
            MosqueStatus = c.Mosque?.Status.ToString() ?? "Unclaimed",
            ReviewStatus = c.Status switch
            {
                OwnershipClaimStatus.Pending => "Pending Review",
                OwnershipClaimStatus.Approved => "Approved",
                OwnershipClaimStatus.Rejected => "Rejected",
                _ => c.Status.ToString()
            },
            SubmittedDate = c.SubmittedAt,
            LastUpdated = c.ReviewedAt,
            RejectionReason = c.RejectionReason
        }).ToList();
    }

    private async Task<MosqueOwnershipClaim?> LoadClaimAsync(int claimId) =>
        await _unitOfWork.Repository<MosqueOwnershipClaim>().Query()
            .Include(c => c.Mosque)
            .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);

    private static ClaimMosqueResponse BuildClaimResponse(Mosque mosque, MosqueOwnershipClaim claim) => new()
    {
        Message = "Claim submitted successfully.",
        Mosque = mosque,
        Claim = new ClaimSubmissionDetailsDto
        {
            ClaimId = claim.Id,
            ClaimReference = claim.ClaimReference ?? "",
            ReviewStatus = "Pending Review",
            SubmittedAt = claim.SubmittedAt
        }
    };

    private async Task SendClaimApprovedEmailAsync(ApplicationUser claimant, Mosque mosque, MosqueOwnershipClaim claim)
    {
        if (string.IsNullOrWhiteSpace(claimant.Email)) return;

        var html = $@"
            <p>Congratulations!</p>
            <p>Your ownership request for <strong>{mosque.Name}</strong> has been approved.</p>
            <p>You are now the assigned mosque owner. The listing is <strong>CLAIMED</strong> and not yet public.</p>
            <p>A Super Admin must still <strong>activate</strong> the mosque before it appears live on the public directory.</p>
            <p>You can log in to your Mosque Dashboard and prepare your profile while you wait.</p>
            <p>Reference: {claim.ClaimReference}</p>";

        try
        {
            await _emailSender.SendEmailAsync(
                claimant.Email,
                "Your Mosque Ownership Has Been Approved",
                html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send claim approval email to {Email}", claimant.Email);
        }
    }

    private async Task SendMosqueActivatedEmailAsync(ApplicationUser owner, Mosque mosque, MosqueOwnershipClaim claim)
    {
        if (string.IsNullOrWhiteSpace(owner.Email)) return;

        var html = $@"
            <p>Good news!</p>
            <p><strong>{mosque.Name}</strong> is now <strong>ACTIVE</strong> and live on the public directory.</p>
            <p>Public profile: /mosque/{mosque.Slug}</p>
            <p>Reference: {claim.ClaimReference}</p>";

        try
        {
            await _emailSender.SendEmailAsync(
                owner.Email,
                "Your Mosque Is Now Active",
                html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send mosque activation email to {Email}", owner.Email);
        }
    }

    private async Task SendClaimRejectedEmailAsync(ApplicationUser claimant, Mosque mosque, MosqueOwnershipClaim claim)
    {
        if (string.IsNullOrWhiteSpace(claimant.Email)) return;

        var html = $@"
            <p>Unfortunately, your ownership request could not be approved.</p>
            <p><strong>Mosque:</strong> {mosque.Name}<br/>
            <strong>Reference:</strong> {claim.ClaimReference}</p>
            <p><strong>Reason:</strong></p>
            <p>{claim.RejectionReason}</p>
            <p>You may submit another claim after correcting the required information.</p>";

        try
        {
            await _emailSender.SendEmailAsync(
                claimant.Email,
                "Mosque Ownership Claim Update",
                html);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send claim rejection email to {Email}", claimant.Email);
        }
    }

    private Task LogClaimAuditAsync(string action, string actorId, int mosqueId, int claimId, string description) =>
        _audit.LogClaimAsync(action, actorId, mosqueId, claimId, description);

    private Task LogAuditAsync(string action, string actorId, int mosqueId, string description) =>
        _audit.LogMosqueAsync(action, actorId, mosqueId, description);

    public async Task<(bool Success, string? Error)> UpdateClaimAsync(int claimId, UpdateClaimRequest dto)
    {
        var claim = await _unitOfWork.Repository<MosqueOwnershipClaim>().Query()
            .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);
        if (claim == null) return (false, "Claim not found.");

        if (!string.IsNullOrWhiteSpace(dto.FullName)) claim.FullName = dto.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Phone)) claim.Phone = dto.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Position)) claim.Position = dto.Position.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Organization)) claim.Organization = dto.Organization.Trim();
        if (!string.IsNullOrWhiteSpace(dto.RelationshipToMosque)) claim.RelationshipToMosque = dto.RelationshipToMosque.Trim();
        if (dto.YearsAssociated.HasValue) claim.YearsAssociated = dto.YearsAssociated;
        if (!string.IsNullOrWhiteSpace(dto.Reason)) claim.Reason = dto.Reason.Trim();

        await _unitOfWork.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteClaimAsync(int claimId)
    {
        var claim = await _unitOfWork.Repository<MosqueOwnershipClaim>().Query()
            .Include(c => c.Mosque)
            .FirstOrDefaultAsync(c => c.Id == claimId && !c.IsDeleted);
        if (claim == null) return (false, "Claim not found.");

        // Only allow deleting Rejected claims to prevent data loss
        if (claim.Status == OwnershipClaimStatus.Pending)
            return (false, "Cannot delete a pending claim. Reject it first.");

        claim.IsDeleted = true;
        claim.DeletedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return (true, null);
    }
}
