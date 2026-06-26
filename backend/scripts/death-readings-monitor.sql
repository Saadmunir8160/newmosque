-- Death readings monitor columns (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingCampaigns') AND name = N'Title')
    ALTER TABLE ReadingCampaigns ADD Title nvarchar(256) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingCampaigns') AND name = N'TargetReadings')
    ALTER TABLE ReadingCampaigns ADD TargetReadings int NOT NULL CONSTRAINT DF_ReadingCampaigns_Target DEFAULT 100000;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingCampaigns') AND name = N'IsArchived')
    ALTER TABLE ReadingCampaigns ADD IsArchived bit NOT NULL CONSTRAINT DF_ReadingCampaigns_Archived DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingCampaigns') AND name = N'ArchivedAt')
    ALTER TABLE ReadingCampaigns ADD ArchivedAt datetime2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingAllocations') AND name = N'ReadingCount')
    ALTER TABLE ReadingAllocations ADD ReadingCount int NOT NULL CONSTRAINT DF_ReadingAllocations_Count DEFAULT 1;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'ReadingAllocations') AND name = N'Region')
    ALTER TABLE ReadingAllocations ADD Region nvarchar(64) NULL;
GO
UPDATE ReadingCampaigns SET TargetReadings = 100000 WHERE TargetReadings = 0 OR TargetReadings IS NULL;
GO
PRINT 'Death readings monitor columns applied.';
