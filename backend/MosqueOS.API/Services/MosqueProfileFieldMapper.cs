using System.Text.Json;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueProfileFieldMapper
{
    public static void ApplyUpdate(Mosque mosque, MosqueUpdateDto dto, string? newSlug = null)
    {
        if (newSlug != null)
            mosque.Slug = newSlug;
        if (dto.Status.HasValue)
            mosque.Status = dto.Status.Value;
        if (dto.OwnerId != null)
            mosque.OwnerId = string.IsNullOrWhiteSpace(dto.OwnerId) ? null : dto.OwnerId;
        if (!string.IsNullOrWhiteSpace(dto.Name))
            mosque.Name = dto.Name.Trim();
        if (dto.Address != null)
            mosque.Address = dto.Address.Trim();
        if (!string.IsNullOrWhiteSpace(dto.City))
            mosque.City = dto.City.Trim();
        if (dto.Postcode != null)
            mosque.Postcode = dto.Postcode.Trim();
        if (dto.Country != null)
            mosque.Country = dto.Country.Trim();
        if (dto.Phone != null)
            mosque.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone;
        if (dto.Email != null)
            mosque.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email;
        if (dto.Website != null)
            mosque.Website = string.IsNullOrWhiteSpace(dto.Website) ? null : dto.Website;
        if (dto.FacebookUrl != null)
            mosque.FacebookUrl = string.IsNullOrWhiteSpace(dto.FacebookUrl) ? null : dto.FacebookUrl;
        if (dto.InstagramUrl != null)
            mosque.InstagramUrl = string.IsNullOrWhiteSpace(dto.InstagramUrl) ? null : dto.InstagramUrl;
        if (dto.YoutubeUrl != null)
            mosque.YoutubeUrl = string.IsNullOrWhiteSpace(dto.YoutubeUrl) ? null : dto.YoutubeUrl;
        if (dto.TwitterUrl != null)
            mosque.TwitterUrl = string.IsNullOrWhiteSpace(dto.TwitterUrl) ? null : dto.TwitterUrl;
        if (dto.SocialLinks != null)
            MosqueSocialLinksHelper.ApplyLinks(mosque, dto.SocialLinks);
        else if (dto.FacebookUrl != null || dto.InstagramUrl != null || dto.YoutubeUrl != null || dto.TwitterUrl != null)
            MosqueSocialLinksHelper.SyncAfterLegacyEdit(mosque);
        if (dto.ShortDescription != null)
            mosque.ShortDescription = string.IsNullOrWhiteSpace(dto.ShortDescription) ? null : dto.ShortDescription.Trim();
        if (dto.Description != null)
            mosque.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        if (dto.LogoUrl != null)
            mosque.LogoUrl = string.IsNullOrWhiteSpace(dto.LogoUrl) ? null : dto.LogoUrl;
        if (dto.BannerUrl != null)
            mosque.BannerUrl = string.IsNullOrWhiteSpace(dto.BannerUrl) ? null : dto.BannerUrl;
        mosque.MapLocation = dto.MapLocation;
        mosque.Latitude = dto.Latitude;
        mosque.Longitude = dto.Longitude;
        if (dto.AllowClaimRequests.HasValue)
            mosque.AllowClaimRequests = dto.AllowClaimRequests.Value;
        if (dto.RequireManualApproval.HasValue)
            mosque.RequireManualApproval = dto.RequireManualApproval.Value;
        if (dto.PublicProfileEnabled.HasValue)
            mosque.PublicProfileEnabled = dto.PublicProfileEnabled.Value;
        if (!string.IsNullOrWhiteSpace(dto.Timezone))
            mosque.Timezone = dto.Timezone.Trim();
        if (dto.EstablishedYear.HasValue)
            mosque.EstablishedYear = dto.EstablishedYear;
        if (dto.Capacity.HasValue)
            mosque.Capacity = dto.Capacity;
        if (dto.Vision != null)
            mosque.Vision = string.IsNullOrWhiteSpace(dto.Vision) ? null : dto.Vision.Trim();
        if (dto.History != null)
            mosque.History = string.IsNullOrWhiteSpace(dto.History) ? null : dto.History.Trim();
        if (dto.ParkingInfo != null)
            mosque.ParkingInfo = string.IsNullOrWhiteSpace(dto.ParkingInfo) ? null : dto.ParkingInfo.Trim();
        if (dto.Gallery != null)
            mosque.GalleryJson = JsonSerializer.Serialize(dto.Gallery);
        if (dto.Services != null)
            mosque.ServicesJson = JsonSerializer.Serialize(dto.Services);
        MosqueProfileJsonHelper.ApplyProfileUpdate(mosque, dto);
        mosque.UpdatedAt = DateTime.UtcNow;
    }
}
