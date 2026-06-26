using System.Text.Json;
using MosqueOS.API.Models.Mosques;
using MosqueOS.Domain.Entities;

namespace MosqueOS.API.Services;

public static class MosqueProfileFieldMapper
{
    public static void ApplyUpdate(Mosque mosque, MosqueUpdateDto dto)
    {
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
            mosque.Phone = dto.Phone;
        if (dto.Email != null)
            mosque.Email = dto.Email;
        if (dto.Website != null)
            mosque.Website = dto.Website;
        if (dto.FacebookUrl != null)
            mosque.FacebookUrl = dto.FacebookUrl;
        if (dto.InstagramUrl != null)
            mosque.InstagramUrl = dto.InstagramUrl;
        if (dto.YoutubeUrl != null)
            mosque.YoutubeUrl = dto.YoutubeUrl;
        if (dto.TwitterUrl != null)
            mosque.TwitterUrl = dto.TwitterUrl;
        if (dto.ShortDescription != null)
            mosque.ShortDescription = dto.ShortDescription.Trim();
        if (dto.Description != null)
            mosque.Description = dto.Description.Trim();
        if (dto.LogoUrl != null)
            mosque.LogoUrl = dto.LogoUrl;
        if (dto.BannerUrl != null)
            mosque.BannerUrl = dto.BannerUrl;
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
            mosque.Vision = dto.Vision.Trim();
        if (dto.History != null)
            mosque.History = dto.History.Trim();
        if (dto.ParkingInfo != null)
            mosque.ParkingInfo = dto.ParkingInfo.Trim();
        if (dto.Gallery != null)
            mosque.GalleryJson = JsonSerializer.Serialize(dto.Gallery);
        if (dto.Services != null)
            mosque.ServicesJson = JsonSerializer.Serialize(dto.Services);
        MosqueProfileJsonHelper.ApplyProfileUpdate(mosque, dto);
        mosque.UpdatedAt = DateTime.UtcNow;
    }
}
