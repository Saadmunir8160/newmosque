using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260701120000_AddGuidanceNoteMuridIdColumn")]
    public partial class AddGuidanceNoteMuridIdColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('GuidanceNotes', 'MuridId') IS NULL
    ALTER TABLE GuidanceNotes ADD MuridId nvarchar(450) NULL;
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_GuidanceNotes_AspNetUsers_MuridId')
    ALTER TABLE GuidanceNotes ADD CONSTRAINT FK_GuidanceNotes_AspNetUsers_MuridId FOREIGN KEY (MuridId) REFERENCES AspNetUsers (Id);
");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GuidanceNotes_MuridId' AND object_id = OBJECT_ID('GuidanceNotes'))
    CREATE INDEX IX_GuidanceNotes_MuridId ON GuidanceNotes (MuridId);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_GuidanceNotes_AspNetUsers_MuridId')
    ALTER TABLE GuidanceNotes DROP CONSTRAINT FK_GuidanceNotes_AspNetUsers_MuridId;
IF COL_LENGTH('GuidanceNotes', 'MuridId') IS NOT NULL
    ALTER TABLE GuidanceNotes DROP COLUMN MuridId;
");
        }
    }
}
