using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260721150000_AddRamadanSoftDeleteColumns")]
    public partial class AddRamadanSoftDeleteColumns : Migration
    {
        private static readonly string[] Tables =
        [
            "RamadanTimetables",
            "RamadanDayEntries",
            "PrayerSpecialTimings",
        ];

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('{table}', 'IsDeleted') IS NULL
        ALTER TABLE [{table}] ADD IsDeleted bit NOT NULL CONSTRAINT DF_{table}_IsDeleted DEFAULT 0;
    IF COL_LENGTH('{table}', 'DeletedAt') IS NULL
        ALTER TABLE [{table}] ADD DeletedAt datetime2 NULL;
    IF COL_LENGTH('{table}', 'DeletedById') IS NULL
        ALTER TABLE [{table}] ADD DeletedById nvarchar(max) NULL;
END
");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('{table}', 'DeletedById') IS NOT NULL ALTER TABLE [{table}] DROP COLUMN DeletedById;
    IF COL_LENGTH('{table}', 'DeletedAt') IS NOT NULL ALTER TABLE [{table}] DROP COLUMN DeletedAt;
END
");
            }
        }
    }
}
