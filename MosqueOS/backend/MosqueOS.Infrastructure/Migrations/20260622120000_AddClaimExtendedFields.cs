using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260622120000_AddClaimExtendedFields")]
    public partial class AddClaimExtendedFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'ClaimReference') IS NULL ALTER TABLE MosqueOwnershipClaims ADD ClaimReference nvarchar(32) NULL;
IF COL_LENGTH('MosqueOwnershipClaims', 'Organization') IS NULL ALTER TABLE MosqueOwnershipClaims ADD Organization nvarchar(256) NULL;
IF COL_LENGTH('MosqueOwnershipClaims', 'RelationshipToMosque') IS NULL ALTER TABLE MosqueOwnershipClaims ADD RelationshipToMosque nvarchar(64) NULL;
IF COL_LENGTH('MosqueOwnershipClaims', 'YearsAssociated') IS NULL ALTER TABLE MosqueOwnershipClaims ADD YearsAssociated int NULL;
IF COL_LENGTH('MosqueOwnershipClaims', 'AccurateInfoDeclaration') IS NULL ALTER TABLE MosqueOwnershipClaims ADD AccurateInfoDeclaration bit NOT NULL CONSTRAINT DF_MosqueOwnershipClaims_AccurateInfo DEFAULT 0;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'AccurateInfoDeclaration') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP CONSTRAINT DF_MosqueOwnershipClaims_AccurateInfo;
IF COL_LENGTH('MosqueOwnershipClaims', 'AccurateInfoDeclaration') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN AccurateInfoDeclaration;
IF COL_LENGTH('MosqueOwnershipClaims', 'YearsAssociated') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN YearsAssociated;
IF COL_LENGTH('MosqueOwnershipClaims', 'RelationshipToMosque') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN RelationshipToMosque;
IF COL_LENGTH('MosqueOwnershipClaims', 'Organization') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN Organization;
IF COL_LENGTH('MosqueOwnershipClaims', 'ClaimReference') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN ClaimReference;
");
        }
    }
}
