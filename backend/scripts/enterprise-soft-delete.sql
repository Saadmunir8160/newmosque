-- Adds soft-delete columns to all MosqueOS operational tables (run once after EnterpriseRbac migration).
-- Enables Repository.Remove() soft delete + optional global query filters.

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
('ParticipationOpportunities'),('ParticipationRegistrations'),('JourneyGuides'),('JourneyStages');

DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'
IF COL_LENGTH(''' + Name + ''', ''IsDeleted'') IS NULL
  ALTER TABLE [' + Name + '] ADD IsDeleted bit NOT NULL CONSTRAINT DF_' + Name + '_IsDeleted DEFAULT 0;
IF COL_LENGTH(''' + Name + ''', ''DeletedAt'') IS NULL
  ALTER TABLE [' + Name + '] ADD DeletedAt datetime2 NULL;
IF COL_LENGTH(''' + Name + ''', ''DeletedById'') IS NULL
  ALTER TABLE [' + Name + '] ADD DeletedById nvarchar(450) NULL;
'
FROM @t;

EXEC sp_executesql @sql;
