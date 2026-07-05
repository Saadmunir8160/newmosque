using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260620120000_AddMosqueEnterpriseProfileFields")]
    public partial class AddMosqueEnterpriseProfileFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'YoutubeUrl') IS NULL ALTER TABLE Mosques ADD YoutubeUrl nvarchar(500) NULL;
IF COL_LENGTH('Mosques', 'TwitterUrl') IS NULL ALTER TABLE Mosques ADD TwitterUrl nvarchar(500) NULL;
IF COL_LENGTH('Mosques', 'ShortDescription') IS NULL ALTER TABLE Mosques ADD ShortDescription nvarchar(500) NULL;
IF COL_LENGTH('Mosques', 'MetaTitle') IS NULL ALTER TABLE Mosques ADD MetaTitle nvarchar(200) NULL;
IF COL_LENGTH('Mosques', 'MetaDescription') IS NULL ALTER TABLE Mosques ADD MetaDescription nvarchar(500) NULL;
IF COL_LENGTH('Mosques', 'AllowClaimRequests') IS NULL ALTER TABLE Mosques ADD AllowClaimRequests bit NOT NULL CONSTRAINT DF_Mosques_AllowClaimRequests DEFAULT 1;
IF COL_LENGTH('Mosques', 'RequireManualApproval') IS NULL ALTER TABLE Mosques ADD RequireManualApproval bit NOT NULL CONSTRAINT DF_Mosques_RequireManualApproval DEFAULT 1;
IF COL_LENGTH('Mosques', 'PublicProfileEnabled') IS NULL ALTER TABLE Mosques ADD PublicProfileEnabled bit NOT NULL CONSTRAINT DF_Mosques_PublicProfileEnabled DEFAULT 1;
IF COL_LENGTH('Mosques', 'IsDraft') IS NULL ALTER TABLE Mosques ADD IsDraft bit NOT NULL CONSTRAINT DF_Mosques_IsDraft DEFAULT 0;
IF COL_LENGTH('Mosques', 'FacilitiesJson') IS NULL ALTER TABLE Mosques ADD FacilitiesJson nvarchar(max) NULL;
IF COL_LENGTH('Mosques', 'PrayerSettingsJson') IS NULL ALTER TABLE Mosques ADD PrayerSettingsJson nvarchar(max) NULL;
IF COL_LENGTH('Mosques', 'GalleryJson') IS NULL ALTER TABLE Mosques ADD GalleryJson nvarchar(max) NULL;
IF COL_LENGTH('MosqueOwnershipClaims', 'Reason') IS NULL ALTER TABLE MosqueOwnershipClaims ADD Reason nvarchar(2000) NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('MosqueOwnershipClaims', 'Reason') IS NOT NULL ALTER TABLE MosqueOwnershipClaims DROP COLUMN Reason;
IF COL_LENGTH('Mosques', 'GalleryJson') IS NOT NULL ALTER TABLE Mosques DROP COLUMN GalleryJson;
IF COL_LENGTH('Mosques', 'PrayerSettingsJson') IS NOT NULL ALTER TABLE Mosques DROP COLUMN PrayerSettingsJson;
IF COL_LENGTH('Mosques', 'FacilitiesJson') IS NOT NULL ALTER TABLE Mosques DROP COLUMN FacilitiesJson;
IF COL_LENGTH('Mosques', 'IsDraft') IS NOT NULL BEGIN ALTER TABLE Mosques DROP CONSTRAINT DF_Mosques_IsDraft; ALTER TABLE Mosques DROP COLUMN IsDraft; END
IF COL_LENGTH('Mosques', 'PublicProfileEnabled') IS NOT NULL BEGIN ALTER TABLE Mosques DROP CONSTRAINT DF_Mosques_PublicProfileEnabled; ALTER TABLE Mosques DROP COLUMN PublicProfileEnabled; END
IF COL_LENGTH('Mosques', 'RequireManualApproval') IS NOT NULL BEGIN ALTER TABLE Mosques DROP CONSTRAINT DF_Mosques_RequireManualApproval; ALTER TABLE Mosques DROP COLUMN RequireManualApproval; END
IF COL_LENGTH('Mosques', 'AllowClaimRequests') IS NOT NULL BEGIN ALTER TABLE Mosques DROP CONSTRAINT DF_Mosques_AllowClaimRequests; ALTER TABLE Mosques DROP COLUMN AllowClaimRequests; END
IF COL_LENGTH('Mosques', 'MetaDescription') IS NOT NULL ALTER TABLE Mosques DROP COLUMN MetaDescription;
IF COL_LENGTH('Mosques', 'MetaTitle') IS NOT NULL ALTER TABLE Mosques DROP COLUMN MetaTitle;
IF COL_LENGTH('Mosques', 'ShortDescription') IS NOT NULL ALTER TABLE Mosques DROP COLUMN ShortDescription;
IF COL_LENGTH('Mosques', 'TwitterUrl') IS NOT NULL ALTER TABLE Mosques DROP COLUMN TwitterUrl;
IF COL_LENGTH('Mosques', 'YoutubeUrl') IS NOT NULL ALTER TABLE Mosques DROP COLUMN YoutubeUrl;
");
        }
    }
}
