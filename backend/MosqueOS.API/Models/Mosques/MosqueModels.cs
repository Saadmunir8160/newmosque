using MosqueOS.Domain;
using MosqueOS.Domain.Entities;
using MosqueOS.API.Services;
using System.Text.Json;

namespace MosqueOS.API.Models.Mosques;

public class AssignStaffRequest
{
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class OwnerMosqueResponse
{
    public Mosque? Mosque { get; set; }
    public int ProfileCompleteness { get; set; }
    public IReadOnlyList<string> MissingFields { get; set; } = Array.Empty<string>();
}

public class ClaimMosqueResponse
{
    public string Message { get; set; } = string.Empty;
    public Mosque Mosque { get; set; } = null!;
    public ClaimSubmissionDetailsDto? Claim { get; set; }
}

public class ClaimSubmissionDetailsDto
{
    public int ClaimId { get; set; }
    public string ClaimReference { get; set; } = string.Empty;
    public string ReviewStatus { get; set; } = "Pending Review";
    public DateTime SubmittedAt { get; set; }
    public string ExpectedReviewTime { get; set; } = "3–5 business days";
}

public class MosqueSettingPublicDto
{
    public string ModuleKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}

public class MyClaimListItemDto
{
    public int ClaimId { get; set; }
    public string ClaimReference { get; set; } = string.Empty;
    public int MosqueId { get; set; }
    public string MosqueName { get; set; } = string.Empty;
    public string? MosqueSlug { get; set; }
    public string Status { get; set; } = string.Empty;
    public string MosqueStatus { get; set; } = string.Empty;
    public string ReviewStatus { get; set; } = string.Empty;
    public DateTime SubmittedDate { get; set; }
    public DateTime? LastUpdated { get; set; }
    public string? RejectionReason { get; set; }
}

public class SubmitMosqueClaimRequest
{
    public int MosqueId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ProofDocument { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
}

public class SubmitMosqueClaimResponse
{
    public bool Success { get; set; } = true;
    public string ClaimReference { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public string Message { get; set; } = string.Empty;
}

public class ClaimMosqueRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string? Organization { get; set; }
    public string RelationshipToMosque { get; set; } = string.Empty;
    public int? YearsAssociated { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool AuthorizedDeclaration { get; set; }
    public bool AccurateInfoDeclaration { get; set; }
    public string? DocumentUrl { get; set; }
}

public class MosqueCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Postcode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public MosqueStatus Status { get; set; } = MosqueStatus.Unclaimed;
    public string? Timezone { get; set; }
}

public class MosqueUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Postcode { get; set; }
    public string? Country { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public List<SocialLinkDto>? SocialLinks { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? MapLocation { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Timezone { get; set; }
    public MosqueStatus? Status { get; set; }
    public string? OwnerId { get; set; }
    public bool? AllowClaimRequests { get; set; }
    public bool? RequireManualApproval { get; set; }
    public bool? PublicProfileEnabled { get; set; }
    public int? EstablishedYear { get; set; }
    public int? Capacity { get; set; }
    public string? Vision { get; set; }
    public string? History { get; set; }
    public string? ParkingInfo { get; set; }
    public List<string>? Gallery { get; set; }
    public List<string>? Services { get; set; }
    public List<MosqueLeadershipDto>? Leadership { get; set; }
    public MosqueStatsOverrideDto? StatsOverride { get; set; }
}

public class MosquePublicDto
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
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public List<SocialLinkDto>? SocialLinks { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public List<string> Facilities { get; set; } = new();
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string Timezone { get; set; } = "Europe/London";
    /// <summary>Public-safe status token for UI (Unclaimed, Active, ClaimPending).</summary>
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public bool AllowClaimRequests { get; set; } = true;
    public bool PublicProfileEnabled { get; set; } = true;
    public ICollection<MosqueSettingPublicDto> Settings { get; set; } = new List<MosqueSettingPublicDto>();
    public int? EstablishedYear { get; set; }
    public int? Capacity { get; set; }
    public string? Vision { get; set; }
    public string? History { get; set; }
    public string? ParkingInfo { get; set; }
    public List<string> Gallery { get; set; } = new();
    public List<string> Services { get; set; } = new();
    public List<MosqueLeadershipDto> Leadership { get; set; } = new();

    public static MosquePublicDto FromEntity(Mosque m, bool showPendingState = false) => new()
    {
        Id = m.Id,
        Name = m.Name,
        Slug = m.Slug,
        Address = m.Address,
        City = m.City,
        Postcode = m.Postcode,
        Country = m.Country,
        Phone = m.Phone,
        Email = m.Email,
        Website = m.Website,
        FacebookUrl = m.FacebookUrl,
        InstagramUrl = m.InstagramUrl,
        YoutubeUrl = m.YoutubeUrl,
        TwitterUrl = m.TwitterUrl,
        SocialLinks = MosqueSocialLinksHelper.Parse(m),
        ShortDescription = m.ShortDescription,
        Description = m.Description,
        MetaTitle = m.MetaTitle,
        MetaDescription = m.MetaDescription,
        Latitude = m.Latitude,
        Longitude = m.Longitude,
        Facilities = ParseFacilities(m.FacilitiesJson),
        LogoUrl = m.LogoUrl,
        BannerUrl = m.BannerUrl,
        Timezone = m.Timezone,
        Status = MapPublicStatus(m.Status, showPendingState),
        StatusLabel = MapStatusLabel(m.Status, showPendingState),
        AllowClaimRequests = m.AllowClaimRequests,
        PublicProfileEnabled = m.PublicProfileEnabled,
        Settings = m.Settings.Select(s => new MosqueSettingPublicDto
        {
            ModuleKey = s.ModuleKey,
            IsEnabled = s.IsEnabled
        }).ToList(),
        EstablishedYear = m.EstablishedYear,
        Capacity = m.Capacity,
        Vision = m.Vision,
        History = m.History,
        ParkingInfo = m.ParkingInfo,
        Gallery = ParseStringList(m.GalleryJson),
        Services = ParseStringList(m.ServicesJson),
        Leadership = MosqueProfileJsonHelper.Parse(m.ProfileJson).Leadership
    };

    private static string MapPublicStatus(MosqueStatus status, bool showPendingState) => status switch
    {
        MosqueStatus.Unclaimed => nameof(MosqueStatus.Unclaimed),
        MosqueStatus.Claimed => nameof(MosqueStatus.Claimed),
        MosqueStatus.Active => nameof(MosqueStatus.Active),
        _ => status.ToString()
    };

    private static string MapStatusLabel(MosqueStatus status, bool showPendingState) => status switch
    {
        MosqueStatus.Unclaimed => "Unclaimed listing",
        MosqueStatus.Claimed => "Claimed — awaiting activation",
        MosqueStatus.Active => "Active",
        _ => "Unknown"
    };

    private static List<string> ParseFacilities(string? json) => ParseJsonStringList(json);

    public static List<string> ParseJsonStringList(string? json) => ParseStringList(json);

    private static List<string> ParseStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>(); }
        catch { return new List<string>(); }
    }
}

public class MosqueAdminProfileDto
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
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public List<SocialLinkDto>? SocialLinks { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? MapLocation { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string Timezone { get; set; } = "Europe/London";
    public MosqueStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string? OwnerId { get; set; }
    public bool AllowClaimRequests { get; set; } = true;
    public bool RequireManualApproval { get; set; } = true;
    public bool PublicProfileEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? EstablishedYear { get; set; }
    public int? Capacity { get; set; }
    public string? Vision { get; set; }
    public string? History { get; set; }
    public string? ParkingInfo { get; set; }
    public List<string> Gallery { get; set; } = new();
    public List<string> Services { get; set; } = new();
    public List<MosqueLeadershipDto> Leadership { get; set; } = new();
    public MosqueStatsOverrideDto? StatsOverride { get; set; }
    public ICollection<MosqueSetting> Settings { get; set; } = new List<MosqueSetting>();

    public static MosqueAdminProfileDto FromEntity(Mosque m)
    {
        var profile = MosqueProfileJsonHelper.Parse(m.ProfileJson);
        return new MosqueAdminProfileDto
    {
        Id = m.Id,
        Name = m.Name,
        Slug = m.Slug,
        Address = m.Address,
        City = m.City,
        Postcode = m.Postcode,
        Country = m.Country,
        Phone = m.Phone,
        Email = m.Email,
        Website = m.Website,
        FacebookUrl = m.FacebookUrl,
        InstagramUrl = m.InstagramUrl,
        YoutubeUrl = m.YoutubeUrl,
        TwitterUrl = m.TwitterUrl,
        SocialLinks = MosqueSocialLinksHelper.Parse(m),
        ShortDescription = m.ShortDescription,
        Description = m.Description,
        LogoUrl = m.LogoUrl,
        BannerUrl = m.BannerUrl,
        MapLocation = m.MapLocation,
        Latitude = m.Latitude,
        Longitude = m.Longitude,
        Timezone = m.Timezone,
        Status = m.Status,
        StatusLabel = MosquePublicDto.FromEntity(m, showPendingState: true).StatusLabel,
        OwnerId = m.OwnerId,
        AllowClaimRequests = m.AllowClaimRequests,
        RequireManualApproval = m.RequireManualApproval,
        PublicProfileEnabled = m.PublicProfileEnabled,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,
        EstablishedYear = m.EstablishedYear,
        Capacity = m.Capacity,
        Vision = m.Vision,
        History = m.History,
        ParkingInfo = m.ParkingInfo,
        Gallery = MosquePublicDto.ParseJsonStringList(m.GalleryJson),
        Services = MosquePublicDto.ParseJsonStringList(m.ServicesJson),
        Leadership = profile.Leadership,
        StatsOverride = profile.Stats,
        Settings = m.Settings
        };
    }
}

public class MosqueUploadResponse
{
    public string Url { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
}

public class MosqueClaimDto
{
    public int Id { get; set; }
    public int MosqueId { get; set; }
    public string ClaimantId { get; set; } = string.Empty;
    public string? ClaimantName { get; set; }
    public string? ClaimantEmail { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? DocumentUrl { get; set; }
    public OwnershipClaimStatus Status { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public class UpdateMosqueFeaturesRequest
{
    public List<MosqueFeatureToggle> Modules { get; set; } = new();
}

public class MosqueFeatureToggle
{
    public string ModuleKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}

public class MosqueModuleUpdateDto
{
    public string ModuleKey { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class MosquePrayerSettingsDto
{
    public string CalculationMethod { get; set; } = "MWL";
    public int FajrAdjustment { get; set; }
    public int DhuhrAdjustment { get; set; }
    public int AsrAdjustment { get; set; }
    public int MaghribAdjustment { get; set; }
    public int IshaAdjustment { get; set; }
    public List<string> JumuahTimes { get; set; } = new();
}

/// <summary>Enterprise Add Mosque wizard payload (Module 1).</summary>
public class MosqueEnterpriseCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Postcode { get; set; }
    public string? Country { get; set; }
    public string? Timezone { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public string? LogoUrl { get; set; }
    public string? BannerUrl { get; set; }
    public string? OwnerId { get; set; }
    public MosqueStatus Status { get; set; } = MosqueStatus.Unclaimed;
    public bool IsDraft { get; set; }
    public bool PublishImmediately { get; set; }
    public bool AllowClaimRequests { get; set; } = true;
    public bool RequireManualApproval { get; set; } = true;
    public bool PublicProfileEnabled { get; set; } = true;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public List<string> Facilities { get; set; } = new();
    public MosquePrayerSettingsDto? PrayerSettings { get; set; }
    public List<MosqueFeatureToggle> Modules { get; set; } = new();
}

public class MosqueLeadershipDto
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? PhotoUrl { get; set; }
}

public class MosqueStatsOverrideDto
{
    public int? Members { get; set; }
    public int? WeeklyAttendance { get; set; }
    public int? EventsHosted { get; set; }
    public int? YearsOfService { get; set; }
}

public class MosquePublicStatsDto
{
    public int Members { get; set; }
    public int? WeeklyAttendance { get; set; }
    public int EventsHosted { get; set; }
    public int? YearsOfService { get; set; }
}

public class MosquePublicClassDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Schedule { get; set; }
    public int EnrolmentCount { get; set; }
}

public class DonationFundPublicDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FundType { get; set; } = "General";
    public string? Description { get; set; }
    public string? ExternalUrl { get; set; }
}

public class DonationFundAdminDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FundType { get; set; } = "General";
    public string? Description { get; set; }
    public string? ExternalUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class UpdateDonationFundsRequest
{
    public List<DonationFundAdminDto> Funds { get; set; } = new();
}

public class UpdateClaimRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public string? Organization { get; set; }
    public string? RelationshipToMosque { get; set; }
    public int? YearsAssociated { get; set; }
    public string? Reason { get; set; }
}

public class RejectClaimRequest
{
    public string Reason { get; set; } = string.Empty;
}