using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260715150000_AddUserNotifications")]
    public partial class AddUserNotifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'UserNotifications', N'U') IS NULL
BEGIN
    CREATE TABLE UserNotifications (
        Id int NOT NULL IDENTITY(1,1),
        UserId nvarchar(450) NOT NULL,
        Type nvarchar(80) NOT NULL,
        Title nvarchar(200) NOT NULL,
        Message nvarchar(1000) NOT NULL,
        Route nvarchar(300) NULL,
        RelatedMosqueId int NULL,
        RelatedClaimId int NULL,
        IsRead bit NOT NULL CONSTRAINT DF_UserNotifications_IsRead DEFAULT(0),
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_UserNotifications_IsDeleted DEFAULT(0),
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT PK_UserNotifications PRIMARY KEY (Id),
        CONSTRAINT FK_UserNotifications_AspNetUsers_UserId
            FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE
    );
    CREATE INDEX IX_UserNotifications_UserId_IsRead ON UserNotifications(UserId, IsRead);
    CREATE INDEX IX_UserNotifications_UserId_CreatedAt ON UserNotifications(UserId, CreatedAt);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'UserNotifications', N'U') IS NOT NULL
    DROP TABLE UserNotifications;
");
        }
    }
}
