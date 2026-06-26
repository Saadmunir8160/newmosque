-- Muqaddam Module tables (idempotent)
IF OBJECT_ID(N'dbo.GuidanceNotes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GuidanceNotes (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CommunityId INT NOT NULL,
        MuridUserId NVARCHAR(450) NOT NULL,
        Type INT NOT NULL,
        Content NVARCHAR(MAX) NOT NULL,
        FollowUpDate DATE NULL,
        IsCompleted BIT NOT NULL DEFAULT 0,
        CreatedById NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_GuidanceNotes_Communities FOREIGN KEY (CommunityId) REFERENCES Communities(Id),
        CONSTRAINT FK_GuidanceNotes_Users FOREIGN KEY (MuridUserId) REFERENCES AspNetUsers(Id)
    );
END

IF OBJECT_ID(N'dbo.CommunityGatherings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommunityGatherings (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CommunityId INT NOT NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        GatheringType INT NOT NULL,
        Date DATE NOT NULL,
        StartTime TIME NULL,
        Location NVARCHAR(MAX) NULL,
        CreatedById NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_CommunityGatherings_Communities FOREIGN KEY (CommunityId) REFERENCES Communities(Id)
    );
END

IF OBJECT_ID(N'dbo.GatheringAttendances', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GatheringAttendances (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        GatheringId INT NOT NULL,
        UserId NVARCHAR(450) NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_GatheringAttendances_Gatherings FOREIGN KEY (GatheringId) REFERENCES CommunityGatherings(Id) ON DELETE CASCADE,
        CONSTRAINT FK_GatheringAttendances_Users FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id),
        CONSTRAINT UQ_GatheringAttendances UNIQUE (GatheringId, UserId)
    );
END
