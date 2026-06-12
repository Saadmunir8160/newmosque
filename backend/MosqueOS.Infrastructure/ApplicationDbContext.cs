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
        public DbSet<PlatformAuditLog> PlatformAuditLogs => Set<PlatformAuditLog>();

        // 3.2 Prayer Times
        public DbSet<PrayerTimesDaily> PrayerTimesDaily => Set<PrayerTimesDaily>();
        public DbSet<JumuahTime> JumuahTimes => Set<JumuahTime>();
        public DbSet<PrayerException> PrayerExceptions => Set<PrayerException>();
        public DbSet<PrayerTimeAuditLog> PrayerTimeAuditLogs => Set<PrayerTimeAuditLog>();

        // 3.3 Announcements
        public DbSet<Announcement> Announcements => Set<Announcement>();

        // 3.4 Events
        public DbSet<Event> Events => Set<Event>();

        // 3.5 Madrassah
        public DbSet<Student> Students => Set<Student>();
        public DbSet<Guardian> Guardians => Set<Guardian>();
        public DbSet<MadrassahClass> MadrassahClasses => Set<MadrassahClass>();
        public DbSet<Enrolment> Enrolments => Set<Enrolment>();
        public DbSet<AttendanceSession> AttendanceSessions => Set<AttendanceSession>();
        public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
        public DbSet<Fee> Fees => Set<Fee>();
        public DbSet<ProgressNote> ProgressNotes => Set<ProgressNote>();

        // 3.6 Communities
        public DbSet<Community> Communities => Set<Community>();
        public DbSet<CommunityMember> CommunityMembers => Set<CommunityMember>();
        public DbSet<CommunityPost> CommunityPosts => Set<CommunityPost>();
        public DbSet<CommunityResource> CommunityResources => Set<CommunityResource>();
        public DbSet<CommunityEvent> CommunityEvents => Set<CommunityEvent>();

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

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Mosque.Owner and ApplicationUser.HomeMosque are separate relationships
            builder.Entity<Mosque>()
                .HasOne(m => m.Owner)
                .WithMany()
                .HasForeignKey(m => m.OwnerId);
            builder.Entity<ApplicationUser>()
                .HasOne(u => u.HomeMosque)
                .WithMany()
                .HasForeignKey(u => u.HomeMosqueId);

            builder.Entity<Mosque>().HasIndex(m => m.Slug).IsUnique();
            builder.Entity<PrayerTimesDaily>().HasIndex(p => new { p.MosqueId, p.Date }).IsUnique();
            builder.Entity<MosqueSetting>().HasIndex(s => new { s.MosqueId, s.ModuleKey }).IsUnique();
            builder.Entity<CommunityMember>().HasIndex(m => new { m.CommunityId, m.UserId }).IsUnique();
            builder.Entity<Fee>().Property(f => f.Amount).HasPrecision(10, 2);

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
