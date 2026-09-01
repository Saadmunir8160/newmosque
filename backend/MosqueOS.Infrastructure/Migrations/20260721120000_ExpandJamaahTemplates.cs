using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MosqueOS.Infrastructure;

#nullable disable

namespace MosqueOS.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260721120000_ExpandJamaahTemplates")]
    public partial class ExpandJamaahTemplates : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // JamaahTemplates may be missing if AddJamaahTemplates never applied on this DB.
            // COL_LENGTH returns NULL when the table does not exist, so ALTER alone fails.
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE JamaahTemplates (
        Id int NOT NULL IDENTITY(1,1),
        MosqueId int NOT NULL,
        Name nvarchar(200) NOT NULL,
        RecurringRulesJson nvarchar(max) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_JamaahTemplates_IsActive DEFAULT 1,
        TemplateType int NOT NULL CONSTRAINT DF_JamaahTemplates_TemplateType DEFAULT 0,
        EffectiveFrom date NULL,
        EffectiveTo date NULL,
        Priority int NOT NULL CONSTRAINT DF_JamaahTemplates_Priority DEFAULT 100,
        IsDefault bit NOT NULL CONSTRAINT DF_JamaahTemplates_IsDefault DEFAULT 0,
        DaysOfWeekJson nvarchar(max) NULL,
        SpecificDatesJson nvarchar(max) NULL,
        ExcludedDatesJson nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_JamaahTemplates_IsDeleted DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT PK_JamaahTemplates PRIMARY KEY (Id),
        CONSTRAINT FK_JamaahTemplates_Mosques_MosqueId
            FOREIGN KEY (MosqueId) REFERENCES Mosques(Id)
    );
    CREATE INDEX IX_JamaahTemplates_MosqueId_IsActive ON JamaahTemplates (MosqueId, IsActive);
END
ELSE
BEGIN
    IF COL_LENGTH('JamaahTemplates', 'TemplateType') IS NULL
        ALTER TABLE JamaahTemplates ADD TemplateType int NOT NULL CONSTRAINT DF_JamaahTemplates_TemplateType DEFAULT 0;
    IF COL_LENGTH('JamaahTemplates', 'EffectiveFrom') IS NULL
        ALTER TABLE JamaahTemplates ADD EffectiveFrom date NULL;
    IF COL_LENGTH('JamaahTemplates', 'EffectiveTo') IS NULL
        ALTER TABLE JamaahTemplates ADD EffectiveTo date NULL;
    IF COL_LENGTH('JamaahTemplates', 'Priority') IS NULL
        ALTER TABLE JamaahTemplates ADD Priority int NOT NULL CONSTRAINT DF_JamaahTemplates_Priority DEFAULT 100;
    IF COL_LENGTH('JamaahTemplates', 'IsDefault') IS NULL
        ALTER TABLE JamaahTemplates ADD IsDefault bit NOT NULL CONSTRAINT DF_JamaahTemplates_IsDefault DEFAULT 0;
    IF COL_LENGTH('JamaahTemplates', 'DaysOfWeekJson') IS NULL
        ALTER TABLE JamaahTemplates ADD DaysOfWeekJson nvarchar(max) NULL;
    IF COL_LENGTH('JamaahTemplates', 'SpecificDatesJson') IS NULL
        ALTER TABLE JamaahTemplates ADD SpecificDatesJson nvarchar(max) NULL;
    IF COL_LENGTH('JamaahTemplates', 'ExcludedDatesJson') IS NULL
        ALTER TABLE JamaahTemplates ADD ExcludedDatesJson nvarchar(max) NULL;
END

IF OBJECT_ID(N'dbo.JamaahTemplatePrayers', N'U') IS NULL
BEGIN
    CREATE TABLE JamaahTemplatePrayers (
        Id int NOT NULL IDENTITY(1,1),
        TemplateId int NOT NULL,
        PrayerName nvarchar(40) NOT NULL,
        StartTime time NOT NULL,
        JamaatTime time NOT NULL,
        SortOrder int NOT NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_JamaahTemplatePrayers_IsDeleted DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT PK_JamaahTemplatePrayers PRIMARY KEY (Id),
        CONSTRAINT FK_JamaahTemplatePrayers_JamaahTemplates_TemplateId
            FOREIGN KEY (TemplateId) REFERENCES JamaahTemplates(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_JamaahTemplatePrayers_TemplateId_PrayerName
        ON JamaahTemplatePrayers (TemplateId, PrayerName);
END

IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JamaahTemplates_MosqueId_IsDefault' AND object_id = OBJECT_ID(N'dbo.JamaahTemplates'))
    CREATE INDEX IX_JamaahTemplates_MosqueId_IsDefault ON JamaahTemplates (MosqueId, IsDefault);

IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JamaahTemplates_MosqueId_Priority' AND object_id = OBJECT_ID(N'dbo.JamaahTemplates'))
    CREATE INDEX IX_JamaahTemplates_MosqueId_Priority ON JamaahTemplates (MosqueId, Priority);
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.JamaahTemplatePrayers', N'U') IS NOT NULL
    DROP TABLE JamaahTemplatePrayers;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JamaahTemplates_MosqueId_IsDefault' AND object_id = OBJECT_ID(N'dbo.JamaahTemplates'))
    DROP INDEX IX_JamaahTemplates_MosqueId_IsDefault ON JamaahTemplates;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_JamaahTemplates_MosqueId_Priority' AND object_id = OBJECT_ID(N'dbo.JamaahTemplates'))
    DROP INDEX IX_JamaahTemplates_MosqueId_Priority ON JamaahTemplates;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'TemplateType') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN TemplateType;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'EffectiveFrom') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN EffectiveFrom;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'EffectiveTo') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN EffectiveTo;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'Priority') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN Priority;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'IsDefault') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN IsDefault;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'DaysOfWeekJson') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN DaysOfWeekJson;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'SpecificDatesJson') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN SpecificDatesJson;
IF OBJECT_ID(N'dbo.JamaahTemplates', N'U') IS NOT NULL AND COL_LENGTH('JamaahTemplates', 'ExcludedDatesJson') IS NOT NULL
    ALTER TABLE JamaahTemplates DROP COLUMN ExcludedDatesJson;
");
        }
    }
}
