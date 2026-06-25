-- Ritual guide publish workflow columns (idempotent)
-- Run: sqlcmd -S .\SQLEXPRESS -d mos_db -E -i ritual-guide-workflow.sql

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'RitualGuides') AND name = N'Status'
)
BEGIN
    ALTER TABLE RitualGuides ADD Status int NOT NULL CONSTRAINT DF_RitualGuides_Status DEFAULT 3;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'RitualGuides') AND name = N'PublishedAt'
)
BEGIN
    ALTER TABLE RitualGuides ADD PublishedAt datetime2 NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'RitualGuides') AND name = N'PublishedById'
)
BEGIN
    ALTER TABLE RitualGuides ADD PublishedById nvarchar(450) NULL;
END
GO

-- Seed sample review-queue guides when table is sparse (ContentPublishStatus: Draft=0, InReview=1, Approved=2, Published=3, Unpublished=4)
IF NOT EXISTS (SELECT 1 FROM RitualGuides WHERE Title = N'Performing Wudu')
BEGIN
    INSERT INTO RitualGuides (Title, Type, Status, CreatedAt, UpdatedAt, IsDeleted)
    VALUES (N'Performing Wudu', 0, 1, GETUTCDATE(), DATEADD(day, -2, GETUTCDATE()), 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM RitualGuides WHERE Title = N'How to Perform Ghusl')
BEGIN
    INSERT INTO RitualGuides (Title, Type, Status, CreatedAt, UpdatedAt, IsDeleted)
    VALUES (N'How to Perform Ghusl', 1, 1, GETUTCDATE(), DATEADD(day, -1, GETUTCDATE()), 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM RitualGuides WHERE Title = N'Fajr Prayer Guide')
BEGIN
    INSERT INTO RitualGuides (Title, Type, Status, CreatedAt, UpdatedAt, IsDeleted)
    VALUES (N'Fajr Prayer Guide', 2, 1, GETUTCDATE(), GETUTCDATE(), 0);
END
GO

PRINT 'Ritual guide workflow columns applied.';
