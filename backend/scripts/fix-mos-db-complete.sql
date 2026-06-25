-- Permanent mos_db schema fix: RBAC, soft-delete, module tables, migration history
-- Run: sqlcmd -S .\SQLEXPRESS -d mos_db -E -i fix-mos-db-complete.sql

SET NOCOUNT ON;

-- 1) Enterprise RBAC tables
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Permissions')
BEGIN
    CREATE TABLE Permissions (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Code nvarchar(450) NOT NULL,
        Name nvarchar(max) NOT NULL,
        Module nvarchar(max) NOT NULL,
        Description nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL
    );
    CREATE UNIQUE INDEX IX_Permissions_Code ON Permissions(Code);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'NavigationMenuItems')
BEGIN
    CREATE TABLE NavigationMenuItems (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Label nvarchar(max) NOT NULL,
        Route nvarchar(max) NOT NULL,
        Section nvarchar(max) NOT NULL,
        Icon nvarchar(max) NULL,
        RequiredRole nvarchar(max) NULL,
        RequiredPermission nvarchar(max) NULL,
        SortOrder int NOT NULL DEFAULT 0,
        IsActive bit NOT NULL DEFAULT 1,
        ParentId int NULL,
        CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL,
        CONSTRAINT FK_NavigationMenuItems_Parent FOREIGN KEY (ParentId) REFERENCES NavigationMenuItems(Id)
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE RolePermissions (
        Id int IDENTITY(1,1) PRIMARY KEY,
        RoleId nvarchar(450) NOT NULL,
        PermissionId int NOT NULL,
        CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_RolePermissions_RoleId_PermissionId ON RolePermissions(RoleId, PermissionId);
END

IF COL_LENGTH('PlatformAuditLogs', 'Module') IS NULL
    ALTER TABLE PlatformAuditLogs ADD Module nvarchar(max) NOT NULL CONSTRAINT DF_PlatformAuditLogs_Module DEFAULT 'Platform';
IF COL_LENGTH('PlatformAuditLogs', 'IpAddress') IS NULL
    ALTER TABLE PlatformAuditLogs ADD IpAddress nvarchar(max) NULL;

-- 2) Soft-delete columns on all operational tables
DECLARE @t TABLE (Name sysname);
INSERT INTO @t VALUES
('Mosques'),('MosqueSettings'),('PlatformAuditLogs'),('PrayerTimesDaily'),('JumuahTimes'),
('PrayerExceptions'),('PrayerTimeAuditLogs'),('Announcements'),('Events'),('Students'),
('Guardians'),('MadrassahClasses'),('Enrolments'),('AttendanceSessions'),('AttendanceRecords'),
('Fees'),('ProgressNotes'),('Communities'),('CommunityMembers'),('CommunityPosts'),
('CommunityResources'),('CommunityEvents'),('ContentItems'),('WirdCollections'),('WirdSteps'),
('UserWirdSchedules'),('UserWirdProgresses'),('AdhkarItems'),('UserAdhkar'),('UserAdhkarLogs'),
('Duas'),('DuaCollections'),('DuaCollectionItems'),('QuranPlans'),('QuranProgresses'),
('RitualGuides'),('RitualSteps'),('JanazaAnnouncements'),('ReadingCampaigns'),('ReadingAllocations'),
('ParticipationOpportunities'),('ParticipationRegistrations'),('JourneyGuides'),('JourneyStages'),
('StudentProgressRecords'),('ClassAssignments'),('AssignmentGrades'),
('GuidanceNotes'),('CommunityGatherings'),('GatheringAttendances'),
('ContentArticles'),('MediaAssets'),('ContentWorkflowLogs'),('EventRegistrations');

DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'
IF COL_LENGTH(''' + Name + ''', ''IsDeleted'') IS NULL
  ALTER TABLE [' + Name + '] ADD IsDeleted bit NOT NULL CONSTRAINT DF_' + Name + '_IsDeleted DEFAULT 0;
IF COL_LENGTH(''' + Name + ''', ''DeletedAt'') IS NULL
  ALTER TABLE [' + Name + '] ADD DeletedAt datetime2 NULL;
IF COL_LENGTH(''' + Name + ''', ''DeletedById'') IS NULL
  ALTER TABLE [' + Name + '] ADD DeletedById nvarchar(450) NULL;
'
FROM @t
WHERE OBJECT_ID('[' + Name + ']') IS NOT NULL;

EXEC sp_executesql @sql;

-- 3) Module scripts (idempotent)
:r teacher-module.sql
GO
:r muqaddam-module.sql
GO
:r prayer-editor-module.sql
GO
:r content-editor-module.sql
GO
:r member-event-registrations.sql
GO

-- 4) Sync EF migration history (mark applied migrations)
DECLARE @pv nvarchar(32) = N'10.0.9';
DECLARE @m TABLE (Id nvarchar(150));
INSERT INTO @m VALUES
('20260617000000_EnterpriseRbacNavigationSoftDelete'),
('20260617120000_AddEventRegistrations'),
('20260617140000_AddPrayerEditorModule'),
('20260617160000_AddTeacherModule'),
('20260617180000_AddMuqaddamModule'),
('20260617200000_AddContentEditorModule');

INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
SELECT m.Id, @pv FROM @m m
WHERE NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory h WHERE h.MigrationId = m.Id);

PRINT 'mos_db schema fix complete.';
SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId;
