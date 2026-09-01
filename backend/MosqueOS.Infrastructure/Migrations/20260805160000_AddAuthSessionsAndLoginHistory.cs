using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations;

/// <inheritdoc />
[DbContext(typeof(ApplicationDbContext))]
[Migration("20260805160000_AddAuthSessionsAndLoginHistory")]
public partial class AddAuthSessionsAndLoginHistory : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[RefreshTokens]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RefreshTokens] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] NVARCHAR(450) NOT NULL,
        [TokenHash] NVARCHAR(128) NOT NULL,
        [JwtId] NVARCHAR(64) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL,
        [ExpiresAt] DATETIME2 NOT NULL,
        [RevokedAt] DATETIME2 NULL,
        [ReplacedByTokenHash] NVARCHAR(128) NULL,
        [RememberMe] BIT NOT NULL CONSTRAINT [DF_RefreshTokens_RememberMe] DEFAULT(0),
        [DeviceName] NVARCHAR(200) NULL,
        [IpAddress] NVARCHAR(64) NULL,
        [UserAgent] NVARCHAR(512) NULL,
        CONSTRAINT [FK_RefreshTokens_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [IX_RefreshTokens_TokenHash] ON [dbo].[RefreshTokens]([TokenHash]);
    CREATE INDEX [IX_RefreshTokens_UserId_RevokedAt] ON [dbo].[RefreshTokens]([UserId], [RevokedAt]);
END

IF OBJECT_ID(N'[dbo].[UserLoginHistories]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserLoginHistories] (
        [Id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] NVARCHAR(450) NOT NULL,
        [OccurredAt] DATETIME2 NOT NULL,
        [EventType] NVARCHAR(64) NOT NULL,
        [Succeeded] BIT NOT NULL,
        [FailureReason] NVARCHAR(500) NULL,
        [IpAddress] NVARCHAR(64) NULL,
        [UserAgent] NVARCHAR(512) NULL,
        CONSTRAINT [FK_UserLoginHistories_AspNetUsers] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers]([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_UserLoginHistories_UserId_OccurredAt] ON [dbo].[UserLoginHistories]([UserId], [OccurredAt]);
END
");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
IF OBJECT_ID(N'[dbo].[RefreshTokens]', N'U') IS NOT NULL DROP TABLE [dbo].[RefreshTokens];
IF OBJECT_ID(N'[dbo].[UserLoginHistories]', N'U') IS NOT NULL DROP TABLE [dbo].[UserLoginHistories];
");
    }
}
