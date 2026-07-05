-- Platform settings table (idempotent)
IF OBJECT_ID(N'dbo.PlatformConfigs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PlatformConfigs (
        Id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Key]         NVARCHAR(128)     NOT NULL,
        Value         NVARCHAR(MAX)     NOT NULL DEFAULT N'',
        CreatedAt     DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt     DATETIME2         NULL,
        IsDeleted     BIT               NOT NULL DEFAULT 0,
        DeletedAt     DATETIME2         NULL,
        DeletedById   NVARCHAR(MAX)     NULL
    );
    CREATE UNIQUE INDEX IX_PlatformConfigs_Key ON dbo.PlatformConfigs([Key]);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PlatformConfigs WHERE [Key] = N'TariqaDefault.BaAlawi')
    INSERT INTO dbo.PlatformConfigs ([Key], Value) VALUES (N'TariqaDefault.BaAlawi', N'Khulasa Wird (Morning)');
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformConfigs WHERE [Key] = N'TariqaDefault.Shadhili')
    INSERT INTO dbo.PlatformConfigs ([Key], Value) VALUES (N'TariqaDefault.Shadhili', N'Hizb al-Bahr');
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformConfigs WHERE [Key] = N'GlobalBanner')
    INSERT INTO dbo.PlatformConfigs ([Key], Value) VALUES (N'GlobalBanner', N'');
GO

PRINT 'Platform settings schema applied.';
