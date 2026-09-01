-- MosqueOS role-wise DB verification (Module docs + Milestones)
SET NOCOUNT ON;

PRINT '=== 1. ROLES & USERS ===';
SELECT r.Name AS RoleName, COUNT(ur.UserId) AS UserCount
FROM AspNetRoles r
LEFT JOIN AspNetUserRoles ur ON ur.RoleId = r.Id
GROUP BY r.Name
ORDER BY r.Name;

SELECT u.UserName, u.Email, u.EmailConfirmed, u.HomeMosqueId, u.FullName,
       STRING_AGG(r.Name, ', ') WITHIN GROUP (ORDER BY r.Name) AS Roles
FROM AspNetUsers u
LEFT JOIN AspNetUserRoles ur ON ur.UserId = u.Id
LEFT JOIN AspNetRoles r ON r.Id = ur.RoleId
WHERE u.UserName IN ('admin','owner','mosqueadmin','prayereditor','teacher','parent','muqaddam','editor','member','guest')
GROUP BY u.UserName, u.Email, u.EmailConfirmed, u.HomeMosqueId, u.FullName
ORDER BY u.UserName;

PRINT '=== 2. MODULE 3.1 MOSQUES ===';
SELECT Id, Name, Slug, Status, City, Timezone, OwnerId, CASE WHEN Email IS NULL OR Email='' THEN 'EMPTY' ELSE 'SET' END AS EmailState
FROM Mosques WHERE IsDeleted=0 ORDER BY Id DESC;

SELECT TOP 10 Id, MosqueId, Status, SubmittedAt FROM MosqueOwnershipClaims ORDER BY Id DESC;

SELECT ModuleKey, SUM(CASE WHEN IsEnabled=1 THEN 1 ELSE 0 END) AS EnabledCount, COUNT(*) AS Total
FROM MosqueSettings GROUP BY ModuleKey ORDER BY ModuleKey;

PRINT '=== 3. MODULE 3.2 PRAYER ===';
SELECT 'PrayerTimesDaily' AS T, COUNT(*) C FROM PrayerTimesDaily
UNION ALL SELECT 'JumuahTimes', COUNT(*) FROM JumuahTimes
UNION ALL SELECT 'PrayerExceptions', COUNT(*) FROM PrayerExceptions
UNION ALL SELECT 'JamaahTemplates', COUNT(*) FROM JamaahTemplates
UNION ALL SELECT 'JamaahTemplatePrayers', COUNT(*) FROM JamaahTemplatePrayers
UNION ALL SELECT 'PrayerTimeAuditLogs', COUNT(*) FROM PrayerTimeAuditLogs;

PRINT '=== 4. MODULE 3.3-3.5 CONTENT / MADRASSAH ===';
SELECT 'Announcements' T, COUNT(*) C FROM Announcements
UNION ALL SELECT 'Events', COUNT(*) FROM Events
UNION ALL SELECT 'Students', COUNT(*) FROM Students
UNION ALL SELECT 'Guardians', COUNT(*) FROM Guardians
UNION ALL SELECT 'MadrassahClasses', COUNT(*) FROM MadrassahClasses
UNION ALL SELECT 'Enrolments', COUNT(*) FROM Enrolments
UNION ALL SELECT 'AttendanceSessions', COUNT(*) FROM AttendanceSessions
UNION ALL SELECT 'AttendanceRecords', COUNT(*) FROM AttendanceRecords
UNION ALL SELECT 'Fees', COUNT(*) FROM Fees
UNION ALL SELECT 'ProgressNotes', COUNT(*) FROM ProgressNotes;

PRINT '=== 5. MODULE 3.6-3.15 ===';
SELECT 'Communities' T, COUNT(*) C FROM Communities
UNION ALL SELECT 'CommunityMembers', COUNT(*) FROM CommunityMembers
UNION ALL SELECT 'CommunityPosts', COUNT(*) FROM CommunityPosts
UNION ALL SELECT 'WirdCollections', COUNT(*) FROM WirdCollections
UNION ALL SELECT 'WirdSteps', COUNT(*) FROM WirdSteps
UNION ALL SELECT 'ContentItems', COUNT(*) FROM ContentItems
UNION ALL SELECT 'UserWirdSchedules', COUNT(*) FROM UserWirdSchedules
UNION ALL SELECT 'AdhkarItems', COUNT(*) FROM AdhkarItems
UNION ALL SELECT 'UserAdhkar', COUNT(*) FROM UserAdhkar
UNION ALL SELECT 'Duas', COUNT(*) FROM Duas
UNION ALL SELECT 'DuaCollections', COUNT(*) FROM DuaCollections
UNION ALL SELECT 'QuranPlans', COUNT(*) FROM QuranPlans
UNION ALL SELECT 'RitualGuides', COUNT(*) FROM RitualGuides
UNION ALL SELECT 'RitualSteps', COUNT(*) FROM RitualSteps
UNION ALL SELECT 'JanazaAnnouncements', COUNT(*) FROM JanazaAnnouncements
UNION ALL SELECT 'ReadingCampaigns', COUNT(*) FROM ReadingCampaigns
UNION ALL SELECT 'ReadingAllocations', COUNT(*) FROM ReadingAllocations
UNION ALL SELECT 'ParticipationOpportunities', COUNT(*) FROM ParticipationOpportunities
UNION ALL SELECT 'ParticipationRegistrations', COUNT(*) FROM ParticipationRegistrations
UNION ALL SELECT 'JourneyGuides', COUNT(*) FROM JourneyGuides
UNION ALL SELECT 'JourneyStages', COUNT(*) FROM JourneyStages;

PRINT '=== 6. ROLE HOME MOSQUE LINK ===';
SELECT u.UserName, u.HomeMosqueId, m.Name AS HomeMosque, m.Status
FROM AspNetUsers u
LEFT JOIN Mosques m ON m.Id = u.HomeMosqueId
WHERE u.UserName IN ('owner','mosqueadmin','prayereditor','teacher','parent','muqaddam','member','editor');
