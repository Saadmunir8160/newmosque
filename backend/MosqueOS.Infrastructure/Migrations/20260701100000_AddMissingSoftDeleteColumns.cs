using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260701100000_AddMissingSoftDeleteColumns")]
    public partial class AddMissingSoftDeleteColumns : Migration
    {
        private static readonly string[] Tables = new[]
        {
            "AdhkarItems", "Announcements", "AttendanceRecords", "AttendanceSessions", "Communities",
            "CommunityEvents", "CommunityMembers", "CommunityPosts", "CommunityResources", "ContentItems",
            "DuaCollectionItems", "DuaCollections", "Duas", "Enrolments", "Events", "Fees", "Guardians",
            "JanazaAnnouncements", "JourneyGuides", "JourneyStages", "JumuahTimes", "MadrassahClasses",
            "MosqueSettings", "ParticipationOpportunities", "ParticipationRegistrations", "PlatformAuditLogs",
            "PrayerExceptions", "PrayerTimeAuditLogs", "PrayerTimesDaily", "ProgressNotes", "QuranPlans",
            "QuranProgress", "ReadingAllocations", "ReadingCampaigns", "RitualGuides", "RitualSteps",
            "RolePermissions", "Students", "UserAdhkar", "UserAdhkarLogs", "UserWirdProgress",
            "UserWirdSchedules", "WirdCollections", "WirdSteps"
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
IF COL_LENGTH('{table}', 'IsDeleted') IS NULL
    ALTER TABLE [{table}] ADD IsDeleted bit NOT NULL DEFAULT 0;
");
                migrationBuilder.Sql($@"
IF COL_LENGTH('{table}', 'DeletedAt') IS NULL
    ALTER TABLE [{table}] ADD DeletedAt datetime2 NULL;
");
                migrationBuilder.Sql($@"
IF COL_LENGTH('{table}', 'DeletedById') IS NULL
    ALTER TABLE [{table}] ADD DeletedById nvarchar(max) NULL;
");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
IF COL_LENGTH('{table}', 'IsDeleted') IS NOT NULL ALTER TABLE [{table}] DROP COLUMN IsDeleted;
IF COL_LENGTH('{table}', 'DeletedAt') IS NOT NULL ALTER TABLE [{table}] DROP COLUMN DeletedAt;
IF COL_LENGTH('{table}', 'DeletedById') IS NOT NULL ALTER TABLE [{table}] DROP COLUMN DeletedById;
");
            }
        }
    }
}
