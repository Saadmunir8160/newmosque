using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;

namespace MosqueOS.Infrastructure;

/// <summary>Seeds enterprise RBAC permissions, role mappings, and dynamic navigation menu.</summary>
public static class EnterpriseSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext db,
        RoleManager<IdentityRole> roleManager)
    {
        await SeedPermissionsAsync(db, roleManager);
        await SeedNavigationAsync(db);
        await RepairSuperAdminNavigationAsync(db);
        await SeedMemberNavigationIfMissingAsync(db);
        await SeedPrayerEditorNavigationIfMissingAsync(db);
        await SeedTeacherNavigationIfMissingAsync(db);
        await SeedMuqaddamNavigationIfMissingAsync(db);
        await SeedContentEditorNavigationIfMissingAsync(db);
    }

    private static async Task SeedPermissionsAsync(ApplicationDbContext db, RoleManager<IdentityRole> roleManager)
    {
        var definitions = new[]
        {
            ("platform.full", "Full Platform Access", "Platform"),
            ("platform.mosques.manage", "Manage Mosques", "Mosques"),
            ("platform.users.manage", "Manage Users", "Users"),
            ("platform.roles.manage", "Manage Roles", "Users"),
            ("platform.claims.approve", "Approve Claims", "Claims"),
            ("platform.modules.manage", "Module Flags", "Modules"),
            ("platform.reports.view", "View Reports", "Reports"),
            ("platform.settings.manage", "Platform Settings", "Settings"),
            ("platform.audit.view", "Audit Logs", "Audit"),
            ("content.manage", "Content Library", "Content"),
            ("content.publish", "Publish Content", "Content"),
            ("content.review", "Review Content", "Content"),
            ("mosque.profile.manage", "Mosque Profile", "Mosque"),
            ("mosque.staff.manage", "Staff Management", "Mosque"),
            ("mosque.prayer.manage", "Prayer Times", "Prayer"),
            ("mosque.announcements.manage", "Announcements", "Announcements"),
            ("mosque.events.manage", "Events", "Events"),
            ("mosque.madrassah.manage", "Madrassah", "Madrassah"),
            ("mosque.reports.view", "Mosque Reports", "Reports"),
            ("member.prayer.view", "View Prayer Times", "Member"),
            ("member.announcements.view", "View Announcements", "Member"),
            ("member.events.register", "Register for Events", "Member"),
            ("member.communities.join", "Join Communities", "Member"),
            ("member.wird.track", "Track Wird Progress", "Member"),
            ("member.adhkar.track", "Track Adhkar Progress", "Member"),
            ("member.duas.read", "Read Duas", "Member"),
            ("member.quran.read", "Read Quran", "Member"),
            ("member.participation.join", "Participate in Activities", "Member"),
            ("member.janaza.view", "View Janaza Notices", "Member"),
            ("member.readings.join", "Join Death Reading Campaigns", "Member"),
            ("member.profile.manage", "Manage Personal Profile", "Member"),
            ("prayer.view", "View Prayer Times", "Prayer"),
            ("prayer.edit", "Edit Prayer Times", "Prayer"),
            ("prayer.publish", "Publish Prayer Times", "Prayer"),
            ("mosque.janaza.manage", "Manage Janaza", "Janaza"),
            ("mosque.communities.manage", "Manage Communities", "Communities"),
            ("mosque.participation.manage", "Manage Participation", "Participation"),
            ("mosque.members.manage", "Manage Members", "Users"),
            ("teacher.classes.manage", "Manage Own Classes", "Teacher"),
            ("teacher.students.manage", "Manage Own Students", "Teacher"),
            ("muqaddam.communities.manage", "Manage Assigned Communities", "Muqaddam"),
        };

        foreach (var (code, name, module) in definitions)
        {
            if (!await db.Permissions.AnyAsync(p => p.Code == code))
            {
                db.Permissions.Add(new Permission { Code = code, Name = name, Module = module });
            }
        }
        await db.SaveChangesAsync();

        var superRole = await roleManager.FindByNameAsync(Roles.SuperAdmin);
        if (superRole == null) return;

        var allPermIds = await db.Permissions.Select(p => new { p.Id, p.Code }).ToListAsync();
        foreach (var perm in allPermIds)
        {
            if (!await db.RolePermissions.AnyAsync(rp => rp.RoleId == superRole.Id && rp.PermissionId == perm.Id))
            {
                db.RolePermissions.Add(new RolePermission { RoleId = superRole.Id, PermissionId = perm.Id });
            }
        }

        await AssignRolePermissionsAsync(db, roleManager, Roles.MosqueOwner, new[]
        {
            "mosque.profile.manage", "mosque.staff.manage", "mosque.prayer.manage",
            "mosque.announcements.manage", "mosque.events.manage", "mosque.madrassah.manage", "mosque.reports.view"
        });

        await AssignRolePermissionsAsync(db, roleManager, Roles.MosqueAdmin, new[]
        {
            "mosque.profile.manage", "mosque.prayer.manage", "mosque.announcements.manage",
            "mosque.events.manage", "mosque.madrassah.manage", "mosque.reports.view",
            "mosque.janaza.manage", "mosque.communities.manage", "mosque.participation.manage",
            "mosque.members.manage", "prayer.view", "prayer.edit", "prayer.publish"
        });

        var memberPerms = new[]
        {
            "member.prayer.view", "member.announcements.view", "member.events.register",
            "member.communities.join", "member.wird.track", "member.adhkar.track",
            "member.duas.read", "member.quran.read", "member.participation.join",
            "member.janaza.view", "member.readings.join", "member.profile.manage"
        };
        await AssignRolePermissionsAsync(db, roleManager, Roles.Member, memberPerms);
        await AssignRolePermissionsAsync(db, roleManager, Roles.Parent, memberPerms);

        await AssignRolePermissionsAsync(db, roleManager, Roles.PrayerTimesEditor, new[]
        {
            "prayer.view", "prayer.edit", "prayer.publish"
        });

        await AssignRolePermissionsAsync(db, roleManager, Roles.Teacher, new[]
        {
            "teacher.classes.manage", "teacher.students.manage"
        });

        await AssignRolePermissionsAsync(db, roleManager, Roles.Muqaddam, new[]
        {
            "muqaddam.communities.manage"
        });

        await AssignRolePermissionsAsync(db, roleManager, Roles.ContentEditor, new[]
        {
            "content.manage", "content.publish", "content.review"
        });

        await db.SaveChangesAsync();
    }

    private static async Task AssignRolePermissionsAsync(
        ApplicationDbContext db, RoleManager<IdentityRole> roleManager, string roleName, string[] codes)
    {
        var role = await roleManager.FindByNameAsync(roleName);
        if (role == null) return;

        foreach (var code in codes)
        {
            var perm = await db.Permissions.FirstOrDefaultAsync(p => p.Code == code);
            if (perm == null) continue;
            if (!await db.RolePermissions.AnyAsync(rp => rp.RoleId == role.Id && rp.PermissionId == perm.Id))
            {
                db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
            }
        }
    }

    private static async Task SeedNavigationAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync()) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;

        void Add(string section, string label, string route, string? icon, string? role, string? perm = null)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = role,
                RequiredPermission = perm,
                SortOrder = order++
            });
        }

        // Super Admin — grouped sections
        Add("Overview", "Dashboard", "/dashboard/super", "dashboard", Roles.SuperAdmin);
        Add("Mosques", "Mosque listings", "/dashboard/super/mosques", "mosque", Roles.SuperAdmin);
        Add("Mosques", "Verify claims", "/dashboard/super/claims", "stamp", Roles.SuperAdmin);
        Add("Mosques", "Mosque data", "/dashboard/super/mosque-data", "database", Roles.SuperAdmin);
        Add("Access", "Users & roles", "/dashboard/super/users", "users", Roles.SuperAdmin);
        Add("Content", "Awrad library", "/dashboard/content/awrad", "awrad", Roles.SuperAdmin);
        Add("Content", "Duas library", "/dashboard/content/duas", "duas", Roles.SuperAdmin);
        Add("Content", "Adhkar library", "/dashboard/content/adhkar", "adhkar", Roles.SuperAdmin);
        Add("Content", "Ritual guides", "/dashboard/content/ritual-guides", "route", Roles.SuperAdmin);
        Add("Content", "Content reviews", "/dashboard/content/reviews", "reviews", Roles.SuperAdmin);
        Add("Oversight", "Janaza oversight", "/dashboard/admin/janaza", "flower", Roles.SuperAdmin);
        Add("Oversight", "Death readings", "/dashboard/muqaddam/readings", "readings", Roles.SuperAdmin);
        Add("System", "Module flags", "/dashboard/super/features", "toggle", Roles.SuperAdmin);
        Add("System", "Audit logs", "/dashboard/super/audit", "history", Roles.SuperAdmin);
        Add("System", "Platform settings", "/dashboard/super/settings", "settings", Roles.SuperAdmin);
        Add("System", "Reports", "/dashboard/super/reports", "chart", Roles.SuperAdmin);

        order = 0;
        // Mosque Owner
        Add("Mosque Owner", "Dashboard", "/dashboard/owner", "dashboard", Roles.MosqueOwner);
        Add("Mosque Owner", "Mosque Profile", "/dashboard/owner/profile", "mosque", Roles.MosqueOwner);
        Add("Mosque Owner", "Verification", "/dashboard/owner/verification", "stamp", Roles.MosqueOwner);
        Add("Mosque Owner", "Admin Management", "/dashboard/owner/staff", "users", Roles.MosqueOwner);
        Add("Mosque Owner", "Prayer Times", "/dashboard/admin/prayer-times", "clock", Roles.MosqueOwner);
        Add("Mosque Owner", "Announcements", "/dashboard/admin/announcements", "speaker", Roles.MosqueOwner);
        Add("Mosque Owner", "Events", "/dashboard/admin/events", "calendar", Roles.MosqueOwner);
        Add("Mosque Owner", "Janaza", "/dashboard/admin/janaza", "flower", Roles.MosqueOwner);
        Add("Mosque Owner", "Madrassah", "/dashboard/admin/madrassah", "book", Roles.MosqueOwner);
        Add("Mosque Owner", "Communities", "/dashboard/admin/communities", "community", Roles.MosqueOwner);
        Add("Mosque Owner", "Participation", "/dashboard/admin/participation", "hand", Roles.MosqueOwner);
        Add("Mosque Owner", "Reports", "/dashboard/admin/reports", "chart", Roles.MosqueOwner);
        Add("Mosque Owner", "Settings", "/dashboard/admin/settings/contact", "settings", Roles.MosqueOwner);

        order = 0;
        // Mosque Admin
        Add("Dashboard", "Dashboard", "/dashboard/admin", "dashboard", Roles.MosqueAdmin);
        Add("Mosque Management", "Mosque Profile", "/dashboard/admin/mosque", "mosque", Roles.MosqueAdmin);
        Add("Mosque Management", "Prayer Times", "/dashboard/admin/prayer-times", "clock", Roles.MosqueAdmin);
        Add("Mosque Management", "Announcements", "/dashboard/admin/announcements", "speaker", Roles.MosqueAdmin);
        Add("Mosque Management", "Events", "/dashboard/admin/events", "calendar", Roles.MosqueAdmin);
        Add("Mosque Management", "Janaza", "/dashboard/admin/janaza", "flower", Roles.MosqueAdmin);
        Add("Mosque Management", "Communities", "/dashboard/admin/communities", "community", Roles.MosqueAdmin);
        Add("Mosque Management", "Participation", "/dashboard/admin/participation", "hand", Roles.MosqueAdmin);
        Add("Mosque Management", "Madrassah", "/dashboard/admin/madrassah", "book", Roles.MosqueAdmin);
        Add("Mosque Management", "Module Settings", "/dashboard/admin/settings", "toggle", Roles.MosqueAdmin);
        Add("Users", "Teachers", "/dashboard/admin/users/teachers", "teacher", Roles.MosqueAdmin);
        Add("Users", "Parents", "/dashboard/admin/users/parents", "parent", Roles.MosqueAdmin);
        Add("Users", "Members", "/dashboard/admin/users/members", "users", Roles.MosqueAdmin);
        Add("Reports", "Reports", "/dashboard/admin/reports", "chart", Roles.MosqueAdmin);
        Add("Settings", "Settings", "/dashboard/admin/settings/contact", "settings", Roles.MosqueAdmin);

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    /// <summary>Upgrades legacy flat Super Admin nav to grouped sections.</summary>
    private static async Task RepairSuperAdminNavigationAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n =>
                n.RequiredRole == Roles.SuperAdmin && n.Section == "Overview"))
            return;

        var legacy = await db.NavigationMenuItems
            .Where(n => n.RequiredRole == Roles.SuperAdmin)
            .ToListAsync();
        if (legacy.Count == 0) return;

        db.NavigationMenuItems.RemoveRange(legacy);
        await db.SaveChangesAsync();

        var items = new List<NavigationMenuItem>();
        var order = await db.NavigationMenuItems.MaxAsync(n => (int?)n.SortOrder) ?? 0;

        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.SuperAdmin,
                SortOrder = ++order
            });
        }

        Add("Overview", "Dashboard", "/dashboard/super", "dashboard");
        Add("Mosques", "Mosque listings", "/dashboard/super/mosques", "mosque");
        Add("Mosques", "Verify claims", "/dashboard/super/claims", "stamp");
        Add("Mosques", "Mosque data", "/dashboard/super/mosque-data", "database");
        Add("Access", "Users & roles", "/dashboard/super/users", "users");
        Add("Content", "Awrad library", "/dashboard/content/awrad", "awrad");
        Add("Content", "Duas library", "/dashboard/content/duas", "duas");
        Add("Content", "Adhkar library", "/dashboard/content/adhkar", "adhkar");
        Add("Content", "Ritual guides", "/dashboard/content/ritual-guides", "route");
        Add("Content", "Content reviews", "/dashboard/content/reviews", "reviews");
        Add("Oversight", "Janaza oversight", "/dashboard/admin/janaza", "flower");
        Add("Oversight", "Death readings", "/dashboard/muqaddam/readings", "readings");
        Add("System", "Module flags", "/dashboard/super/features", "toggle");
        Add("System", "Audit logs", "/dashboard/super/audit", "history");
        Add("System", "Platform settings", "/dashboard/super/settings", "settings");
        Add("System", "Reports", "/dashboard/super/reports", "chart");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static async Task SeedMemberNavigationIfMissingAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n => n.RequiredRole == Roles.Member)) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;
        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.Member,
                SortOrder = order++
            });
        }

        Add("Main", "Today Screen", "/dashboard", "today");
        Add("Main", "Prayer Times", "/dashboard/prayer-times", "clock");
        Add("Main", "Announcements", "/dashboard/announcements", "speaker");
        Add("Main", "Events", "/dashboard/events", "calendar");
        order = 0;
        Add("My Worship", "My Wird", "/dashboard/member/wird", "wird");
        Add("My Worship", "My Adhkar", "/dashboard/member/adhkar", "adhkar");
        Add("My Worship", "Duas Library", "/dashboard/member/duas", "prayer");
        Add("My Worship", "Quran Reading", "/dashboard/member/quran", "quran");
        Add("My Worship", "Communities", "/dashboard/member/communities", "community");
        Add("My Worship", "Participation", "/dashboard/participation", "hand");
        Add("My Worship", "Ritual Guides", "/dashboard/member/ritual-guides", "route");
        Add("My Worship", "Umrah & Hajj Guides", "/dashboard/member/journey-guides", "journey");
        Add("My Worship", "Janaza", "/dashboard/member/janaza", "flower");
        Add("My Worship", "Death Readings", "/dashboard/member/readings", "readings");
        Add("My Worship", "My Preferences", "/dashboard/member/preferences", "settings");
        Add("My Worship", "Profile", "/dashboard/member/profile", "profile");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static async Task SeedPrayerEditorNavigationIfMissingAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n => n.RequiredRole == Roles.PrayerTimesEditor)) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;
        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.PrayerTimesEditor,
                SortOrder = order++
            });
        }

        Add("Dashboard", "Dashboard", "/dashboard/prayer-editor", "dashboard");
        order = 0;
        Add("Prayer Times", "Daily Prayers", "/dashboard/prayer-editor/daily", "daily");
        Add("Prayer Times", "Jumuah", "/dashboard/prayer-editor/jumuah", "jumuah");
        Add("Prayer Times", "Ramadan", "/dashboard/prayer-editor/ramadan", "ramadan");
        Add("Prayer Times", "Audit Log", "/dashboard/prayer-editor/audit", "audit");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static async Task SeedTeacherNavigationIfMissingAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n => n.RequiredRole == Roles.Teacher)) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;
        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.Teacher,
                SortOrder = order++
            });
        }

        Add("Dashboard", "Dashboard", "/dashboard/teacher", "dashboard");
        order = 0;
        Add("Teaching", "My Classes", "/dashboard/teacher/classes", "classes");
        Add("Teaching", "Attendance", "/dashboard/teacher/attendance", "attendance");
        Add("Teaching", "Student Progress", "/dashboard/teacher/progress", "progress");
        Add("Teaching", "Assignments", "/dashboard/teacher/assignments", "assignments");
        Add("Teaching", "Reports", "/dashboard/teacher/reports", "reports");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static async Task SeedMuqaddamNavigationIfMissingAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n => n.RequiredRole == Roles.Muqaddam)) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;
        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.Muqaddam,
                SortOrder = order++
            });
        }

        Add("Dashboard", "Dashboard", "/dashboard/muqaddam", "dashboard");
        order = 0;
        Add("Spiritual Circles", "Murid Management", "/dashboard/muqaddam/murids", "murids");
        Add("Spiritual Circles", "Communities", "/dashboard/muqaddam/communities", "communities");
        Add("Spiritual Circles", "Guidance Notes", "/dashboard/muqaddam/guidance", "guidance");
        Add("Spiritual Circles", "Events", "/dashboard/muqaddam/events", "events");
        Add("Spiritual Circles", "Reports", "/dashboard/muqaddam/reports", "reports");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }

    private static async Task SeedContentEditorNavigationIfMissingAsync(ApplicationDbContext db)
    {
        if (await db.NavigationMenuItems.AnyAsync(n => n.RequiredRole == Roles.ContentEditor)) return;

        var items = new List<NavigationMenuItem>();
        int order = 0;
        void Add(string section, string label, string route, string? icon)
        {
            items.Add(new NavigationMenuItem
            {
                Section = section,
                Label = label,
                Route = route,
                Icon = icon,
                RequiredRole = Roles.ContentEditor,
                SortOrder = order++
            });
        }

        Add("Dashboard", "Dashboard", "/dashboard/content", "dashboard");
        order = 0;
        Add("Content", "Awrad", "/dashboard/content/awrad", "awrad");
        Add("Content", "Duas", "/dashboard/content/duas", "duas");
        Add("Content", "Adhkar", "/dashboard/content/adhkar", "adhkar");
        Add("Content", "Library", "/dashboard/content/library", "library");
        Add("Content", "Content Reviews", "/dashboard/content/reviews", "reviews");

        db.NavigationMenuItems.AddRange(items);
        await db.SaveChangesAsync();
    }
}
