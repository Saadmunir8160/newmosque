-- Janaza announcement workflow columns (idempotent)
-- Run: sqlcmd -S .\SQLEXPRESS -d mos_db -E -i janaza-module.sql

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'JanazaAnnouncements') AND name = N'Status'
)
BEGIN
    ALTER TABLE JanazaAnnouncements ADD Status int NOT NULL CONSTRAINT DF_JanazaAnnouncements_Status DEFAULT 1;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'JanazaAnnouncements') AND name = N'CreatedById'
)
BEGIN
    ALTER TABLE JanazaAnnouncements ADD CreatedById nvarchar(450) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'JanazaAnnouncements') AND name = N'PublishedAt'
)
BEGIN
    ALTER TABLE JanazaAnnouncements ADD PublishedAt datetime2 NULL;
END
GO

UPDATE JanazaAnnouncements SET Status = 1, PublishedAt = COALESCE(PublishedAt, CreatedAt) WHERE PublishedAt IS NULL AND Status = 1;
GO

PRINT 'Janaza module columns applied.';
