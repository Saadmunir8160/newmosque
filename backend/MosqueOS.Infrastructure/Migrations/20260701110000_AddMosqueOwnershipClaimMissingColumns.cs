using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260701110000_AddMosqueOwnershipClaimMissingColumns")]
    public partial class AddMosqueOwnershipClaimMissingColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'FullName') IS NULL
    ALTER TABLE MosqueOwnershipClaims ADD FullName nvarchar(max) NOT NULL DEFAULT '';
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'Phone') IS NULL
    ALTER TABLE MosqueOwnershipClaims ADD Phone nvarchar(max) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'Position') IS NULL
    ALTER TABLE MosqueOwnershipClaims ADD Position nvarchar(max) NULL;
");
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'DocumentUrl') IS NULL
    ALTER TABLE MosqueOwnershipClaims ADD DocumentUrl nvarchar(max) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'FullName') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN FullName;
IF COL_LENGTH('MosqueOwnershipClaims', 'Phone') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN Phone;
IF COL_LENGTH('MosqueOwnershipClaims', 'Position') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN Position;
IF COL_LENGTH('MosqueOwnershipClaims', 'DocumentUrl') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN DocumentUrl;
");
        }
    }
}
