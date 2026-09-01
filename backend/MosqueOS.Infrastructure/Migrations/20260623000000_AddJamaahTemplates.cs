using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260623000000_AddJamaahTemplates")]
    public partial class AddJamaahTemplates : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE JamaahTemplates (
        Id int NOT NULL IDENTITY(1,1),
        MosqueId int NOT NULL,
        Name nvarchar(max) NOT NULL,
        RecurringRulesJson nvarchar(max) NULL,
        IsActive bit NOT NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT PK_JamaahTemplates PRIMARY KEY (Id),
        CONSTRAINT FK_JamaahTemplates_Mosques_MosqueId
            FOREIGN KEY (MosqueId) REFERENCES Mosques(Id)
    );
END

IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JamaahTemplates_MosqueId_IsActive' AND object_id = OBJECT_ID(N'dbo.JamaahTemplates'))
    CREATE INDEX IX_JamaahTemplates_MosqueId_IsActive ON JamaahTemplates (MosqueId, IsActive);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL
    DROP TABLE JamaahTemplates;
");
        }
    }
}
