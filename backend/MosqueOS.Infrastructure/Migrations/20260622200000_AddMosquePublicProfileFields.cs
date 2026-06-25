using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260622200000_AddMosquePublicProfileFields")]
public partial class AddMosquePublicProfileFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
IF COL_LENGTH('Mosques', 'EstablishedYear') IS NULL ALTER TABLE Mosques ADD EstablishedYear int NULL;
IF COL_LENGTH('Mosques', 'Capacity') IS NULL ALTER TABLE Mosques ADD Capacity int NULL;
IF COL_LENGTH('Mosques', 'Vision') IS NULL ALTER TABLE Mosques ADD Vision nvarchar(2000) NULL;
IF COL_LENGTH('Mosques', 'History') IS NULL ALTER TABLE Mosques ADD History nvarchar(max) NULL;
IF COL_LENGTH('Mosques', 'ParkingInfo') IS NULL ALTER TABLE Mosques ADD ParkingInfo nvarchar(1000) NULL;
IF COL_LENGTH('Mosques', 'ServicesJson') IS NULL ALTER TABLE Mosques ADD ServicesJson nvarchar(max) NULL;
IF COL_LENGTH('Mosques', 'ProfileJson') IS NULL ALTER TABLE Mosques ADD ProfileJson nvarchar(max) NULL;

IF OBJECT_ID(N'DonationFunds', N'U') IS NULL
BEGIN
    CREATE TABLE DonationFunds (
        Id int NOT NULL IDENTITY,
        MosqueId int NOT NULL,
        Name nvarchar(200) NOT NULL,
        FundType nvarchar(50) NOT NULL,
        Description nvarchar(1000) NULL,
        ExternalUrl nvarchar(500) NULL,
        IsActive bit NOT NULL DEFAULT 1,
        SortOrder int NOT NULL DEFAULT 0,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(450) NULL,
        CONSTRAINT PK_DonationFunds PRIMARY KEY (Id),
        CONSTRAINT FK_DonationFunds_Mosques_MosqueId FOREIGN KEY (MosqueId) REFERENCES Mosques(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_DonationFunds_MosqueId ON DonationFunds(MosqueId);
END
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
IF OBJECT_ID(N'DonationFunds', N'U') IS NOT NULL DROP TABLE DonationFunds;
IF COL_LENGTH('Mosques', 'ProfileJson') IS NOT NULL ALTER TABLE Mosques DROP COLUMN ProfileJson;
IF COL_LENGTH('Mosques', 'ServicesJson') IS NOT NULL ALTER TABLE Mosques DROP COLUMN ServicesJson;
IF COL_LENGTH('Mosques', 'ParkingInfo') IS NOT NULL ALTER TABLE Mosques DROP COLUMN ParkingInfo;
IF COL_LENGTH('Mosques', 'History') IS NOT NULL ALTER TABLE Mosques DROP COLUMN History;
IF COL_LENGTH('Mosques', 'Vision') IS NOT NULL ALTER TABLE Mosques DROP COLUMN Vision;
IF COL_LENGTH('Mosques', 'Capacity') IS NOT NULL ALTER TABLE Mosques DROP COLUMN Capacity;
IF COL_LENGTH('Mosques', 'EstablishedYear') IS NOT NULL ALTER TABLE Mosques DROP COLUMN EstablishedYear;
");
    }
}
