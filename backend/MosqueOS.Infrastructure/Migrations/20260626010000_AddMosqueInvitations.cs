using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260626010000_AddMosqueInvitations")]
    public partial class AddMosqueInvitations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'MosqueInvitations', N'U') IS NULL
BEGIN
    CREATE TABLE MosqueInvitations (
        Id int NOT NULL IDENTITY,
        MosqueId int NOT NULL,
        InviteEmail nvarchar(256) NOT NULL,
        InviteName nvarchar(200) NULL,
        Role nvarchar(64) NOT NULL,
        Token nvarchar(128) NOT NULL,
        Status int NOT NULL,
        SentAt datetime2 NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        InvitedById nvarchar(450) NOT NULL,
        AcceptedById nvarchar(450) NULL,
        AcceptedAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_MosqueInvitations_IsDeleted DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(450) NULL,
        CONSTRAINT PK_MosqueInvitations PRIMARY KEY (Id),
        CONSTRAINT FK_MosqueInvitations_AspNetUsers_AcceptedById FOREIGN KEY (AcceptedById) REFERENCES AspNetUsers (Id),
        CONSTRAINT FK_MosqueInvitations_AspNetUsers_InvitedById FOREIGN KEY (InvitedById) REFERENCES AspNetUsers (Id),
        CONSTRAINT FK_MosqueInvitations_Mosques_MosqueId FOREIGN KEY (MosqueId) REFERENCES Mosques (Id)
    );
END
ELSE
BEGIN
    IF COL_LENGTH('MosqueInvitations', 'MosqueId') IS NULL ALTER TABLE MosqueInvitations ADD MosqueId int NOT NULL DEFAULT 0;
    IF COL_LENGTH('MosqueInvitations', 'InviteEmail') IS NULL ALTER TABLE MosqueInvitations ADD InviteEmail nvarchar(256) NOT NULL DEFAULT '';
    IF COL_LENGTH('MosqueInvitations', 'InviteName') IS NULL ALTER TABLE MosqueInvitations ADD InviteName nvarchar(200) NULL;
    IF COL_LENGTH('MosqueInvitations', 'Role') IS NULL ALTER TABLE MosqueInvitations ADD Role nvarchar(64) NOT NULL DEFAULT '';
    IF COL_LENGTH('MosqueInvitations', 'Token') IS NULL ALTER TABLE MosqueInvitations ADD Token nvarchar(128) NOT NULL DEFAULT '';
    IF COL_LENGTH('MosqueInvitations', 'Status') IS NULL ALTER TABLE MosqueInvitations ADD Status int NOT NULL DEFAULT 0;
    IF COL_LENGTH('MosqueInvitations', 'SentAt') IS NULL ALTER TABLE MosqueInvitations ADD SentAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME();
    IF COL_LENGTH('MosqueInvitations', 'ExpiresAt') IS NULL ALTER TABLE MosqueInvitations ADD ExpiresAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME();
    IF COL_LENGTH('MosqueInvitations', 'InvitedById') IS NULL ALTER TABLE MosqueInvitations ADD InvitedById nvarchar(450) NOT NULL DEFAULT '';
    IF COL_LENGTH('MosqueInvitations', 'AcceptedById') IS NULL ALTER TABLE MosqueInvitations ADD AcceptedById nvarchar(450) NULL;
    IF COL_LENGTH('MosqueInvitations', 'AcceptedAt') IS NULL ALTER TABLE MosqueInvitations ADD AcceptedAt datetime2 NULL;
    IF COL_LENGTH('MosqueInvitations', 'CreatedAt') IS NULL ALTER TABLE MosqueInvitations ADD CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME();
    IF COL_LENGTH('MosqueInvitations', 'UpdatedAt') IS NULL ALTER TABLE MosqueInvitations ADD UpdatedAt datetime2 NULL;
    IF COL_LENGTH('MosqueInvitations', 'IsDeleted') IS NULL ALTER TABLE MosqueInvitations ADD IsDeleted bit NOT NULL CONSTRAINT DF_MosqueInvitations_IsDeleted DEFAULT 0;
    IF COL_LENGTH('MosqueInvitations', 'DeletedAt') IS NULL ALTER TABLE MosqueInvitations ADD DeletedAt datetime2 NULL;
    IF COL_LENGTH('MosqueInvitations', 'DeletedById') IS NULL ALTER TABLE MosqueInvitations ADD DeletedById nvarchar(450) NULL;
END

IF OBJECT_ID(N'MosqueInvitations', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_AcceptedById' AND object_id = OBJECT_ID('MosqueInvitations'))
        CREATE INDEX IX_MosqueInvitations_AcceptedById ON MosqueInvitations (AcceptedById);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_InvitedById' AND object_id = OBJECT_ID('MosqueInvitations'))
        CREATE INDEX IX_MosqueInvitations_InvitedById ON MosqueInvitations (InvitedById);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_MosqueId_Status' AND object_id = OBJECT_ID('MosqueInvitations'))
        CREATE INDEX IX_MosqueInvitations_MosqueId_Status ON MosqueInvitations (MosqueId, Status);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MosqueInvitations_Token' AND object_id = OBJECT_ID('MosqueInvitations'))
        CREATE UNIQUE INDEX IX_MosqueInvitations_Token ON MosqueInvitations (Token);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'MosqueInvitations', N'U') IS NOT NULL DROP TABLE MosqueInvitations;
");
        }
    }
}
