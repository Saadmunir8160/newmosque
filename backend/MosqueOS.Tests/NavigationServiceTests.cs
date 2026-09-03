using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure;
using MosqueOS.Infrastructure.Services;
using Xunit;

namespace MosqueOS.Tests;

public class NavigationServiceTests
{
  private static ApplicationDbContext CreateDb()
  {
    var options = new DbContextOptionsBuilder<ApplicationDbContext>()
      .UseInMemoryDatabase(Guid.NewGuid().ToString())
      .Options;
    return new ApplicationDbContext(options);
  }

  [Fact]
  public async Task OwnerWithoutActiveMosque_ReceivesOnlyPreActivationNavItems()
  {
    await using var db = CreateDb();
    db.NavigationMenuItems.AddRange(
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Dashboard", Route = "/dashboard/owner", RequiredRole = Roles.MosqueOwner, SortOrder = 1 },
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Profile", Route = "/dashboard/owner/profile", RequiredRole = Roles.MosqueOwner, SortOrder = 2 },
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Listings", Route = "/dashboard/owner/mosque-listings", RequiredRole = Roles.MosqueOwner, SortOrder = 3 },
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Module settings", Route = "/dashboard/owner/settings", RequiredRole = Roles.MosqueOwner, SortOrder = 4, RequiresActiveMosque = true },
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Prayer Times", Route = "/dashboard/admin/prayer-times", RequiredRole = Roles.MosqueOwner, SortOrder = 5, RequiresActiveMosque = true }
    );
    await db.SaveChangesAsync();

    var svc = new NavigationService(db);
    var nav = await svc.GetMenuForRolesAsync(
      [Roles.MosqueOwner],
      [],
      [MosqueStatus.Claimed]);

    var routes = nav.SelectMany(s => s.Items).Select(i => i.Route).ToList();
    Assert.Contains("/dashboard/owner", routes);
    Assert.Contains("/dashboard/owner/profile", routes);
    Assert.Contains("/dashboard/owner/mosque-listings", routes);
    Assert.DoesNotContain("/dashboard/owner/settings", routes);
    Assert.DoesNotContain("/dashboard/admin/prayer-times", routes);
  }

  [Fact]
  public async Task OwnerWithActiveMosque_ReceivesOperationalNavItems()
  {
    await using var db = CreateDb();
    db.NavigationMenuItems.AddRange(
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Profile", Route = "/dashboard/owner/profile", RequiredRole = Roles.MosqueOwner, SortOrder = 1 },
      new NavigationMenuItem { Section = "Mosque Owner", Label = "Module settings", Route = "/dashboard/owner/settings", RequiredRole = Roles.MosqueOwner, SortOrder = 2, RequiresActiveMosque = true }
    );
    await db.SaveChangesAsync();

    var svc = new NavigationService(db);
    var nav = await svc.GetMenuForRolesAsync(
      [Roles.MosqueOwner],
      [],
      [MosqueStatus.Active]);

    var routes = nav.SelectMany(s => s.Items).Select(i => i.Route).ToList();
    Assert.Contains("/dashboard/owner/settings", routes);
  }
}
