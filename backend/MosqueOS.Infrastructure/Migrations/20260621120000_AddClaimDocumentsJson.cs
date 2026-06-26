using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260621120000_AddClaimDocumentsJson")]
    public partial class AddClaimDocumentsJson : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'DocumentsJson') IS NULL ALTER TABLE MosqueOwnershipClaims ADD DocumentsJson nvarchar(max) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'DocumentsJson') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN DocumentsJson;
");
        }
    }
}
