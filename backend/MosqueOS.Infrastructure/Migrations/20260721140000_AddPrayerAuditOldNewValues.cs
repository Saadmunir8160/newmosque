using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260721140000_AddPrayerAuditOldNewValues")]
    public partial class AddPrayerAuditOldNewValues : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PrayerTimeAuditLogs', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('PrayerTimeAuditLogs', 'OldValue') IS NULL
        ALTER TABLE PrayerTimeAuditLogs ADD OldValue nvarchar(max) NULL;
    IF COL_LENGTH('PrayerTimeAuditLogs', 'NewValue') IS NULL
        ALTER TABLE PrayerTimeAuditLogs ADD NewValue nvarchar(max) NULL;
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.PrayerTimeAuditLogs', N'U') IS NOT NULL AND COL_LENGTH('PrayerTimeAuditLogs', 'OldValue') IS NOT NULL
    ALTER TABLE PrayerTimeAuditLogs DROP COLUMN OldValue;
IF OBJECT_ID(N'dbo.PrayerTimeAuditLogs', N'U') IS NOT NULL AND COL_LENGTH('PrayerTimeAuditLogs', 'NewValue') IS NOT NULL
    ALTER TABLE PrayerTimeAuditLogs DROP COLUMN NewValue;
");
        }
    }
}
