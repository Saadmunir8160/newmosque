-- MosqueOS: fill role-wise gaps for document-aligned testing (mosque 115 = Masjid Al-Noor Bradford)
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRAN;

DECLARE @OwnerId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='owner');
DECLARE @MemberId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='member');
DECLARE @ParentId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='parent');
DECLARE @EditorId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='editor');
DECLARE @MuqaddamId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='muqaddam');
DECLARE @TeacherId NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE UserName='teacher');
DECLARE @MosqueId INT = 115;
DECLARE @CollectionId INT = (SELECT TOP 1 Id FROM WirdCollections WHERE Name LIKE '%Khulasa%' ORDER BY Id);
DECLARE @OppId INT = (SELECT TOP 1 Id FROM ParticipationOpportunities WHERE MosqueId=@MosqueId AND IsActive=1 ORDER BY Id);
DECLARE @CommunityId INT = (SELECT TOP 1 Id FROM Communities WHERE MosqueId=@MosqueId ORDER BY Id);

PRINT 'HomeMosqueId fixes...';
UPDATE AspNetUsers SET HomeMosqueId=@MosqueId WHERE UserName IN ('parent','editor') AND (HomeMosqueId IS NULL OR HomeMosqueId<>@MosqueId);

PRINT 'Member wird schedule...';
IF @CollectionId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM UserWirdSchedules WHERE UserId=@MemberId AND CollectionId=@CollectionId AND IsDeleted=0)
BEGIN
  INSERT INTO UserWirdSchedules (UserId, PrayerSlot, CollectionId, Mode, CreatedAt, IsDeleted)
  VALUES (@MemberId, 1 /* AfterFajr */, @CollectionId, 0 /* Full */, SYSUTCDATETIME(), 0);
END

PRINT 'Member participation registration...';
IF @OppId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ParticipationRegistrations WHERE OpportunityId=@OppId AND UserId=@MemberId AND IsDeleted=0)
BEGIN
  INSERT INTO ParticipationRegistrations (OpportunityId, UserId, RegisteredAt, Status, CreatedAt, IsDeleted)
  VALUES (@OppId, @MemberId, SYSUTCDATETIME(), 0 /* Registered */, SYSUTCDATETIME(), 0);
END

PRINT 'Ensure community roles (Muqaddam + Member)...';
IF @CommunityId IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM CommunityMembers WHERE CommunityId=@CommunityId AND UserId=@MuqaddamId AND IsDeleted=0)
    INSERT INTO CommunityMembers (CommunityId, UserId, Role, CreatedAt, IsDeleted)
    VALUES (@CommunityId, @MuqaddamId, 3 /* Muqaddam */, SYSUTCDATETIME(), 0);
  ELSE
    UPDATE CommunityMembers SET Role=3 WHERE CommunityId=@CommunityId AND UserId=@MuqaddamId;

  IF NOT EXISTS (SELECT 1 FROM CommunityMembers WHERE CommunityId=@CommunityId AND UserId=@MemberId AND IsDeleted=0)
    INSERT INTO CommunityMembers (CommunityId, UserId, Role, CreatedAt, IsDeleted)
    VALUES (@CommunityId, @MemberId, 2 /* Member */, SYSUTCDATETIME(), 0);
END

PRINT 'Ensure owner owns mosque 115...';
UPDATE Mosques SET OwnerId=@OwnerId WHERE Id=@MosqueId AND (OwnerId IS NULL OR OwnerId<>@OwnerId);

-- Enable any missing module flags on 115 (document: Owner can toggle; for demo keep ON)
MERGE MosqueSettings AS t
USING (VALUES
  (@MosqueId,'PrayerTimes',1),(@MosqueId,'Announcements',1),(@MosqueId,'Events',1),
  (@MosqueId,'Madrassah',1),(@MosqueId,'Communities',1),(@MosqueId,'Awrad',1),
  (@MosqueId,'Adhkar',1),(@MosqueId,'Duas',1),(@MosqueId,'Quran',1),
  (@MosqueId,'RitualGuides',1),(@MosqueId,'Janaza',1),(@MosqueId,'DeathReadings',1),
  (@MosqueId,'Participation',1),(@MosqueId,'JourneyGuides',1)
) AS s(MosqueId, ModuleKey, IsEnabled)
ON t.MosqueId=s.MosqueId AND t.ModuleKey=s.ModuleKey
WHEN MATCHED THEN UPDATE SET IsEnabled=s.IsEnabled, UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (MosqueId, ModuleKey, IsEnabled, CreatedAt, IsDeleted)
  VALUES (s.MosqueId, s.ModuleKey, s.IsEnabled, SYSUTCDATETIME(), 0);

COMMIT;

PRINT '=== VERIFY AFTER FILL ===';
SELECT UserName, HomeMosqueId FROM AspNetUsers WHERE UserName IN ('parent','editor','owner','member');
SELECT COUNT(*) AS WirdSchedules FROM UserWirdSchedules WHERE IsDeleted=0;
SELECT COUNT(*) AS PartRegs FROM ParticipationRegistrations WHERE IsDeleted=0;
SELECT u.UserName, cm.Role FROM CommunityMembers cm JOIN AspNetUsers u ON u.Id=cm.UserId WHERE cm.CommunityId=@CommunityId AND cm.IsDeleted=0;
SELECT ModuleKey, IsEnabled FROM MosqueSettings WHERE MosqueId=115 ORDER BY ModuleKey;
SELECT Id, Name, OwnerId FROM Mosques WHERE Id=115;
