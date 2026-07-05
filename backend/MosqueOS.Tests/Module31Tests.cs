using MosqueOS.API.Models.Mosques;
using MosqueOS.API.Services;
using MosqueOS.Domain;
using Xunit;

namespace MosqueOS.Tests;

public class Module31Tests
{
    [Theory]
    [InlineData(MosqueStatus.Unclaimed, true)]
    [InlineData(MosqueStatus.Active, true)]
    [InlineData(MosqueStatus.ClaimPending, false)]
    [InlineData(MosqueStatus.Claimed, false)]
    [InlineData(MosqueStatus.PendingReview, false)]
    [InlineData(MosqueStatus.Suspended, false)]
    public void PublicProfile_IsVisibleOnlyForUnclaimedAndActive(MosqueStatus status, bool expected)
    {
        Assert.Equal(expected, MosquePublicVisibility.IsPubliclyVisible(status));
    }

    [Theory]
    [InlineData(MosqueStatus.Claimed, false, true)]
    [InlineData(MosqueStatus.Active, false, true)]
    [InlineData(MosqueStatus.Unclaimed, false, false)]
    [InlineData(MosqueStatus.ClaimPending, false, false)]
    [InlineData(MosqueStatus.Unclaimed, true, true)]
    public void ProfileEdit_AllowedForClaimedActiveOrSuperAdmin(MosqueStatus status, bool isSuperAdmin, bool expected)
    {
        Assert.Equal(expected, MosquePublicVisibility.CanEditProfile(status, isSuperAdmin));
    }

    [Fact]
    public void ProfileCompleteness_CountsMissingFields()
    {
        var mosque = new Domain.Entities.Mosque
        {
            Name = "Test Mosque",
            Address = "1 High Street",
            City = "London",
            Postcode = "E1 1AA",
            Phone = "+441234567890",
            Email = "info@test.org",
            Description = "A test mosque",
            LogoUrl = "/logo.png",
            BannerUrl = null,
            Vision = "Serve the local community",
            History = "Established by the neighbourhood",
            EstablishedYear = 1999,
            GalleryJson = "[\"/gallery.jpg\"]",
            ProfileJson = "{\"leadership\":[{\"name\":\"Imam Test\",\"role\":\"Imam\"}]}"
        };

        var (completeness, missing) = MosqueProfileCompleteness.Calculate(mosque);

        Assert.Equal(93, completeness);
        Assert.Single(missing);
        Assert.Equal("bannerUrl", missing[0]);
    }

    [Fact]
    public void MosqueValidation_RejectsInvalidMilestone1Fields()
    {
        var dto = new MosqueUpdateDto
        {
            Name = "Test Mosque",
            City = "London",
            Slug = "Bad Slug!",
            Timezone = "Not/A-Timezone",
            Status = (MosqueStatus)99,
            Latitude = 91,
            Longitude = -181,
            EstablishedYear = 500,
            Capacity = -1
        };

        var errors = MosqueValidation.ValidateUpdate(dto);

        Assert.Contains(errors, e => e.Contains("Slug", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Timezone", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Status", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Latitude", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Longitude", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Established year", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(errors, e => e.Contains("Capacity", StringComparison.OrdinalIgnoreCase));
    }
}
