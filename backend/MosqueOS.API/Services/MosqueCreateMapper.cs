using System.Text.Json;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueCreateMapper
{
    public static Mosque MapFromEnterprise(MosqueEnterpriseCreateDto dto, string slug)
    {
        var status = ResolveStatus(dto);
        var mosque = new Mosque
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            ShortDescription = dto.ShortDescription?.Trim(),
            Description = (dto.FullDescription ?? dto.ShortDescription)?.Trim(),
            Address = dto.Address?.Trim() ?? string.Empty,
            City = dto.City.Trim(),
            Postcode = dto.Postcode?.Trim() ?? string.Empty,
            Country = dto.Country?.Trim() ?? "United Kingdom",
            Phone = dto.Phone,
            Email = dto.Email,
            Website = dto.Website,
            FacebookUrl = dto.FacebookUrl,
            InstagramUrl = dto.InstagramUrl,
            YoutubeUrl = dto.YoutubeUrl,
            TwitterUrl = dto.TwitterUrl,
            LogoUrl = dto.LogoUrl,
            BannerUrl = dto.BannerUrl,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? "Europe/London" : dto.Timezone.Trim(),
            OwnerId = dto.PublishImmediately && !string.IsNullOrWhiteSpace(dto.OwnerId)
                ? dto.OwnerId.Trim()
                : null,
            Status = status,
            IsDraft = dto.IsDraft,
            AllowClaimRequests = dto.AllowClaimRequests,
            RequireManualApproval = dto.RequireManualApproval,
            PublicProfileEnabled = dto.PublicProfileEnabled,
            MetaTitle = dto.MetaTitle?.Trim(),
            MetaDescription = dto.MetaDescription?.Trim(),
            FacilitiesJson = dto.Facilities.Count > 0 ? JsonSerializer.Serialize(dto.Facilities) : null,
            PrayerSettingsJson = dto.PrayerSettings != null ? JsonSerializer.Serialize(dto.PrayerSettings) : null,
        };
        MosqueSocialLinksHelper.SyncJsonFromLegacy(mosque);
        return mosque;
    }

    public static MosqueStatus ResolveStatus(MosqueEnterpriseCreateDto dto)
    {
        if (dto.IsDraft) return MosqueStatus.Unclaimed;
        if (dto.PublishImmediately) return MosqueStatus.Active;
        return MosqueStatus.Unclaimed;
    }

    public static List<string> ValidateEnterprise(MosqueEnterpriseCreateDto dto)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(dto.Name)) errors.Add("Mosque name is required.");
        if (string.IsNullOrWhiteSpace(dto.City)) errors.Add("City is required.");
        if (!dto.IsDraft)
        {
            if (string.IsNullOrWhiteSpace(dto.Address)) errors.Add("Address is required.");
            if (string.IsNullOrWhiteSpace(dto.Postcode)) errors.Add("Postcode is required.");
        }
        return errors;
    }
}
