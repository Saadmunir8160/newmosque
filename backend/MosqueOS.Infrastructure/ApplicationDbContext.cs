using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain.Entities;

namespace MosqueOS.Infrastructure
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // 3.1 Mosque Profile
        public DbSet<Mosque> Mosques => Set<Mosque>();
        public DbSet<MosqueSetting> MosqueSettings => Set<MosqueSetting>();
        public DbSet<MosqueOwnershipClaim> MosqueOwnershipClaims => Set<MosqueOwnershipClaim>();
        public DbSet<MosqueRegistrationRequest> MosqueRegistrationRequests => Set<MosqueRegistrationRequest>();
        public DbSet<MosqueInvitation> MosqueInvitations => Set<MosqueInvitation>();
        public DbSet<DonationFund> DonationFunds => Set<DonationFund>();
        public DbSet<PlatformAuditLog> PlatformAuditLogs => Set<PlatformAuditLog>();
        public DbSet<PlatformConfig> PlatformConfigs => Set<PlatformConfig>();
        public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

        // 3.2 Prayer Times
        public DbSet<PrayerTimesDaily> PrayerTimesDaily => Set<PrayerTimesDaily>();
        public DbSet<JumuahTime> JumuahTimes => Set<JumuahTime>();
        public DbSet<PrayerException> PrayerExceptions => Set<PrayerException>();
        public DbSet<PrayerTimeAuditLog> PrayerTimeAuditLogs => Set<PrayerTimeAuditLog>();
        public DbSet<RamadanTimetable> RamadanTimetables => Set<RamadanTimetable>();
        public DbSet<RamadanDayEntry> RamadanDayEntries => Set<RamadanDayEntry>();
        public DbSet<PrayerSpecialTiming> PrayerSpecialTimings => Set<PrayerSpecialTiming>();
        public DbSet<JamaahTemplate> JamaahTemplates => Set<JamaahTemplate>();

        // 3.3 Announcements
        public DbSet<Announcement> Announcements => Set<Announcement>();

        // 3.4 Events
        public DbSet<Event> Events => Set<Event>();
        public DbSet<EventRegistration> EventRegistrations => Set<EventRegistration>();

        // 3.5 Madrassah
        public DbSet<Student> Students => Set<Student>();
        public DbSet<Guardian> Guardians => Set<Guardian>();
        public DbSet<MadrassahClass> MadrassahClasses => Set<MadrassahClass>();
        public DbSet<Enrolment> Enrolments => Set<Enrolment>();
        public DbSet<AttendanceSession> AttendanceSessions => Set<AttendanceSession>();
        public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
        public DbSet<Fee> Fees => Set<Fee>();
        public DbSet<ProgressNote> ProgressNotes => Set<ProgressNote>();
        public DbSet<StudentProgressRecord> StudentProgressRecords => Set<StudentProgressRecord>();
        public DbSet<ClassAssignment> ClassAssignments => Set<ClassAssignment>();
        public DbSet<AssignmentGrade> AssignmentGrades => Set<AssignmentGrade>();

        // 3.6 Communities
        public DbSet<Community> Communities => Set<Community>();
        public DbSet<CommunityMember> CommunityMembers => Set<CommunityMember>();
        public DbSet<CommunityPost> CommunityPosts => Set<CommunityPost>();
        public DbSet<CommunityResource> CommunityResources => Set<CommunityResource>();
        public DbSet<CommunityEvent> CommunityEvents => Set<CommunityEvent>();
        public DbSet<GuidanceNote> GuidanceNotes => Set<GuidanceNote>();
        public DbSet<CommunityGathering> CommunityGatherings => Set<CommunityGathering>();
        public DbSet<GatheringAttendance> GatheringAttendances => Set<GatheringAttendance>();

        // 3.7 Awrad & Wird
        public DbSet<ContentItem> ContentItems => Set<ContentItem>();
        public DbSet<WirdCollection> WirdCollections => Set<WirdCollection>();
        public DbSet<WirdStep> WirdSteps => Set<WirdStep>();
        public DbSet<UserWirdSchedule> UserWirdSchedules => Set<UserWirdSchedule>();
        public DbSet<UserWirdProgress> UserWirdProgress => Set<UserWirdProgress>();

        // 3.8 Adhkar
        public DbSet<AdhkarItem> AdhkarItems => Set<AdhkarItem>();
        public DbSet<UserAdhkar> UserAdhkar => Set<UserAdhkar>();
        public DbSet<UserAdhkarLog> UserAdhkarLogs => Set<UserAdhkarLog>();

        // 3.9 Duas
        public DbSet<Dua> Duas => Set<Dua>();
        public DbSet<DuaCollection> DuaCollections => Set<DuaCollection>();
        public DbSet<DuaCollectionItem> DuaCollectionItems => Set<DuaCollectionItem>();

        // Content Editor library
        public DbSet<ContentArticle> ContentArticles => Set<ContentArticle>();
        public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
        public DbSet<ContentWorkflowLog> ContentWorkflowLogs => Set<ContentWorkflowLog>();

        // 3.10 Qur'an
        public DbSet<QuranPlan> QuranPlans => Set<QuranPlan>();
        public DbSet<QuranProgress> QuranProgress => Set<QuranProgress>();

        // 3.11 Ritual Guides
        public DbSet<RitualGuide> RitualGuides => Set<RitualGuide>();
        public DbSet<RitualStep> RitualSteps => Set<RitualStep>();

        // 3.12 / 3.13 Janaza & Death Readings
        public DbSet<JanazaAnnouncement> JanazaAnnouncements => Set<JanazaAnnouncement>();
        public DbSet<ReadingCampaign> ReadingCampaigns => Set<ReadingCampaign>();
        public DbSet<ReadingAllocation> ReadingAllocations => Set<ReadingAllocation>();

        // 3.14 Community Participation
        public DbSet<ParticipationOpportunity> ParticipationOpportunities => Set<ParticipationOpportunity>();
        public DbSet<ParticipationRegistration> ParticipationRegistrations => Set<ParticipationRegistration>();

        // 3.15 Umrah & Hajj
        public DbSet<JourneyGuide> JourneyGuides => Set<JourneyGuide>();
        public DbSet<JourneyStage> JourneyStages => Set<JourneyStage>();

        // Enterprise RBAC & navigation
        public DbSet<Permission> Permissions => Set<Permission>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<NavigationMenuItem> NavigationMenuItems => Set<NavigationMenuItem>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Mosque>(entity =>
            {
                entity.Property(m => m.Name).HasMaxLength(200).IsRequired();
                entity.Property(m => m.Slug).HasMaxLength(120).IsRequired();
                entity.Property(m => m.Address).HasMaxLength(300);
                entity.Property(m => m.City).HasMaxLength(100).IsRequired();
                entity.Property(m => m.Postcode).HasMaxLength(20);
                entity.Property(m => m.Country).HasMaxLength(100).IsRequired().HasDefaultValue("United Kingdom");
                entity.Property(m => m.Phone).HasMaxLength(30);
                entity.Property(m => m.Email).HasMaxLength(200);
                entity.Property(m => m.Website).HasMaxLength(300);
                entity.Property(m => m.FacebookUrl).HasMaxLength(300);
                entity.Property(m => m.InstagramUrl).HasMaxLength(300);
                entity.Property(m => m.YoutubeUrl).HasMaxLength(300);
                entity.Property(m => m.TwitterUrl).HasMaxLength(300);
                entity.Property(m => m.SocialLinksJson);
                entity.Property(m => m.ShortDescription).HasMaxLength(300);
                entity.Property(m => m.MetaTitle).HasMaxLength(200);
                entity.Property(m => m.MetaDescription).HasMaxLength(300);
                entity.Property(m => m.LogoUrl).HasMaxLength(500);
                entity.Property(m => m.BannerUrl).HasMaxLength(500);
                entity.Property(m => m.Timezone).HasMaxLength(64).IsRequired().HasDefaultValue("Europe/London");
                entity.Property(m => m.MapLocation).HasMaxLength(500);
                entity.Property(m => m.Latitude).HasColumnType("float");
                entity.Property(m => m.Longitude).HasColumnType("float");
                entity.Property(m => m.OwnerId).HasMaxLength(450);

                entity.HasIndex(m => m.Slug)
                    .IsUnique()
                    .HasFilter("[IsDeleted] = 0");
                entity.HasIndex(m => m.City);
                entity.HasIndex(m => new { m.Status, m.City });
                entity.HasIndex(m => m.OwnerId)
                    .HasFilter("[OwnerId] IS NOT NULL");

                entity.HasOne(m => m.Owner)
                    .WithMany()
                    .HasForeignKey(m => m.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.ToTable(t =>
                {
                    t.HasCheckConstraint("CK_Mosques_Status", "[Status] BETWEEN 0 AND 7");
                    t.HasCheckConstraint("CK_Mosques_Latitude", "[Latitude] IS NULL OR ([Latitude] >= -90 AND [Latitude] <= 90)");
                    t.HasCheckConstraint("CK_Mosques_Longitude", "[Longitude] IS NULL OR ([Longitude] >= -180 AND [Longitude] <= 180)");
                    t.HasCheckConstraint("CK_Mosques_EstablishedYear", "[EstablishedYear] IS NULL OR ([EstablishedYear] >= 600 AND [EstablishedYear] <= 2100)");
                    t.HasCheckConstraint("CK_Mosques_Capacity", "[Capacity] IS NULL OR [Capacity] >= 0");
                    t.HasCheckConstraint("CK_Mosques_Timezone_NotBlank", "LEN(LTRIM(RTRIM([Timezone]))) > 0");
                });
            });

            // Mosque.Owner and ApplicationUser.HomeMosque are separate relationships
            builder.Entity<ApplicationUser>()
                .HasOne(u => u.HomeMosque)
                .WithMany()
                .HasForeignKey(u => u.HomeMosqueId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<MosqueRegistrationRequest>(entity =>
            {
                entity.ToTable("mosque_registration_requests");
                entity.Property(r => r.Name).HasMaxLength(200).IsRequired();
                entity.Property(r => r.Address).HasMaxLength(500).IsRequired();
                entity.Property(r => r.City).HasMaxLength(100).IsRequired();
                entity.Property(r => r.Country).HasMaxLength(100).IsRequired();
                entity.Property(r => r.Phone).HasMaxLength(50);
                entity.Property(r => r.Email).HasMaxLength(200);
                entity.Property(r => r.Website).HasMaxLength(300);
                entity.HasIndex(r => r.Status);
                entity.HasOne(r => r.SubmittedBy)
                    .WithMany()
                    .HasForeignKey(r => r.SubmittedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<UserNotification>(entity =>
            {
                entity.ToTable("UserNotifications");
                entity.Property(n => n.Type).HasMaxLength(80).IsRequired();
                entity.Property(n => n.Title).HasMaxLength(200).IsRequired();
                entity.Property(n => n.Message).HasMaxLength(1000).IsRequired();
                entity.Property(n => n.Route).HasMaxLength(300);
                entity.HasIndex(n => new { n.UserId, n.IsRead });
                entity.HasIndex(n => new { n.UserId, n.CreatedAt });
                entity.HasOne(n => n.User)
                    .WithMany()
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<PrayerTimesDaily>().HasIndex(p => new { p.MosqueId, p.Date }).IsUnique();
            builder.Entity<RamadanTimetable>().HasIndex(r => new { r.MosqueId, r.Year }).IsUnique();
            builder.Entity<RamadanDayEntry>().HasIndex(d => new { d.TimetableId, d.DayNumber }).IsUnique();
            builder.Entity<MosqueSetting>(entity =>
            {
                entity.Property(s => s.ModuleKey).HasMaxLength(50).IsRequired();
                entity.HasIndex(s => new { s.MosqueId, s.ModuleKey }).IsUnique();
                entity.HasOne(s => s.Mosque)
                    .WithMany(m => m.Settings)
                    .HasForeignKey(s => s.MosqueId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            builder.Entity<JamaahTemplate>().HasIndex(t => new { t.MosqueId, t.IsActive });

            builder.Entity<MosqueOwnershipClaim>()
                .HasOne(c => c.Mosque)
                .WithMany()
                .HasForeignKey(c => c.MosqueId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MosqueOwnershipClaim>()
                .HasOne(c => c.Claimant)
                .WithMany()
                .HasForeignKey(c => c.ClaimantId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MosqueOwnershipClaim>()
                .HasIndex(c => new { c.MosqueId, c.Status });
            builder.Entity<MosqueOwnershipClaim>()
                .HasIndex(c => c.ClaimantId);

            builder.Entity<MosqueInvitation>()
                .HasOne(i => i.Mosque)
                .WithMany()
                .HasForeignKey(i => i.MosqueId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MosqueInvitation>()
                .HasOne(i => i.InvitedBy)
                .WithMany()
                .HasForeignKey(i => i.InvitedById)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MosqueInvitation>()
                .HasOne(i => i.AcceptedBy)
                .WithMany()
                .HasForeignKey(i => i.AcceptedById)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MosqueInvitation>()
                .HasIndex(i => i.Token)
                .IsUnique();
            builder.Entity<MosqueInvitation>()
                .HasIndex(i => new { i.MosqueId, i.Status });
            builder.Entity<MosqueInvitation>().Property(i => i.InviteEmail).HasMaxLength(256);
            builder.Entity<MosqueInvitation>().Property(i => i.InviteName).HasMaxLength(200);
            builder.Entity<MosqueInvitation>().Property(i => i.Role).HasMaxLength(64);
            builder.Entity<MosqueInvitation>().Property(i => i.Token).HasMaxLength(128);

            builder.Entity<DonationFund>().HasIndex(d => d.MosqueId);

            builder.Entity<PlatformConfig>().HasIndex(c => c.Key).IsUnique();
            builder.Entity<PlatformConfig>().Property(c => c.Key).HasMaxLength(128);
            builder.Entity<CommunityMember>().HasIndex(m => new { m.CommunityId, m.UserId }).IsUnique();
            builder.Entity<EventRegistration>().HasIndex(r => new { r.EventId, r.UserId }).IsUnique();
            builder.Entity<Fee>().Property(f => f.Amount).HasPrecision(10, 2);

            builder.Entity<Permission>().HasIndex(p => p.Code).IsUnique();
            builder.Entity<RolePermission>().HasIndex(rp => new { rp.RoleId, rp.PermissionId }).IsUnique();
            builder.Entity<NavigationMenuItem>().HasIndex(n => new { n.Section, n.Route, n.RequiredRole });

            builder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // SQL Server disallows multiple cascade paths; use Restrict everywhere
            // and handle child cleanup explicitly in application code.
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                foreach (var fk in entityType.GetForeignKeys())
                {
                    if (fk.DeleteBehavior == DeleteBehavior.Cascade && !fk.IsOwnership)
                    {
                        fk.DeleteBehavior = DeleteBehavior.Restrict;
                    }
                }
            }
        }
    }
}
