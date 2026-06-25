-- Content Editor Module — workflow columns + library tables
-- Run against mos_db if not using EF migrations

IF COL_LENGTH('WirdCollections', 'Status') IS NULL
BEGIN
    ALTER TABLE WirdCollections ADD Status int NOT NULL DEFAULT 3;
    ALTER TABLE WirdCollections ADD PublishedAt datetime2 NULL;
    ALTER TABLE WirdCollections ADD PublishedById nvarchar(450) NULL;
END

IF COL_LENGTH('ContentItems', 'Status') IS NULL
BEGIN
    ALTER TABLE ContentItems ADD Status int NOT NULL DEFAULT 3;
    ALTER TABLE ContentItems ADD PublishedAt datetime2 NULL;
    ALTER TABLE ContentItems ADD PublishedById nvarchar(450) NULL;
END

IF COL_LENGTH('Duas', 'Status') IS NULL
BEGIN
    ALTER TABLE Duas ADD Status int NOT NULL DEFAULT 3;
    ALTER TABLE Duas ADD PublishedAt datetime2 NULL;
    ALTER TABLE Duas ADD PublishedById nvarchar(450) NULL;
END

IF COL_LENGTH('AdhkarItems', 'Status') IS NULL
BEGIN
    ALTER TABLE AdhkarItems ADD Status int NOT NULL DEFAULT 3;
    ALTER TABLE AdhkarItems ADD PublishedAt datetime2 NULL;
    ALTER TABLE AdhkarItems ADD PublishedById nvarchar(450) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ContentArticles')
BEGIN
    CREATE TABLE ContentArticles (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Title nvarchar(max) NOT NULL,
        Slug nvarchar(max) NULL,
        Summary nvarchar(max) NULL,
        Body nvarchar(max) NOT NULL,
        ItemType int NOT NULL,
        ResourceUrl nvarchar(max) NULL,
        Status int NOT NULL,
        PublishedAt datetime2 NULL,
        PublishedById nvarchar(450) NULL,
        AuthorId nvarchar(450) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MediaAssets')
BEGIN
    CREATE TABLE MediaAssets (
        Id int IDENTITY(1,1) PRIMARY KEY,
        FileName nvarchar(max) NOT NULL,
        OriginalFileName nvarchar(max) NOT NULL,
        ContentType nvarchar(max) NOT NULL,
        MediaType int NOT NULL,
        Url nvarchar(max) NOT NULL,
        SizeBytes bigint NOT NULL,
        UploadedById nvarchar(450) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ContentWorkflowLogs')
BEGIN
    CREATE TABLE ContentWorkflowLogs (
        Id int IDENTITY(1,1) PRIMARY KEY,
        EntityType nvarchar(max) NOT NULL,
        EntityId int NOT NULL,
        FromStatus int NOT NULL,
        ToStatus int NOT NULL,
        ActorId nvarchar(450) NULL,
        Comment nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        DeletedAt datetime2 NULL,
        DeletedById nvarchar(max) NULL
    );
END

PRINT 'Content Editor module schema ready.';
