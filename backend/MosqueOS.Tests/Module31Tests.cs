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
            BannerUrl = null
        };

        var (completeness, missing) = MosqueProfileCompleteness.Calculate(mosque);

        Assert.Equal(89, completeness);
        Assert.Single(missing);
        Assert.Equal("bannerUrl", missing[0]);
    }
}
