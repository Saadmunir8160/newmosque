-- Prayer Times Editor module (run if EF migration not applied)

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PrayerTimesDaily') AND name = 'Status')
BEGIN
    ALTER TABLE PrayerTimesDaily ADD Status INT NOT NULL DEFAULT 1;
    ALTER TABLE PrayerTimesDaily ADD PublishedAt DATETIME2 NULL;
    ALTER TABLE PrayerTimesDaily ADD PublishedById NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PrayerTimeAuditLogs') AND name = 'ActionType')
    ALTER TABLE PrayerTimeAuditLogs ADD ActionType NVARCHAR(MAX) NULL;

IF OBJECT_ID('RamadanTimetables') IS NULL
BEGIN
    CREATE TABLE RamadanTimetables (
        Id INT IDENTITY PRIMARY KEY,
        MosqueId INT NOT NULL REFERENCES Mosques(Id),
        Year INT NOT NULL,
        HijriYear NVARCHAR(MAX) NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        PublishedAt DATETIME2 NULL,
        PublishedById NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        UNIQUE (MosqueId, Year)
    );
END

IF OBJECT_ID('RamadanDayEntries') IS NULL
BEGIN
    CREATE TABLE RamadanDayEntries (
        Id INT IDENTITY PRIMARY KEY,
        TimetableId INT NOT NULL REFERENCES RamadanTimetables(Id),
        DayNumber INT NOT NULL,
        Date DATE NOT NULL,
        SuhoorEnd TIME NOT NULL,
        IftarJamaat TIME NOT NULL,
        TaraweehJamaat TIME NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        UNIQUE (TimetableId, DayNumber)
    );
END

IF OBJECT_ID('PrayerSpecialTimings') IS NULL
BEGIN
    CREATE TABLE PrayerSpecialTimings (
        Id INT IDENTITY PRIMARY KEY,
        MosqueId INT NOT NULL REFERENCES Mosques(Id),
        Date DATE NOT NULL,
        Label NVARCHAR(MAX) NOT NULL,
        Time TIME NOT NULL,
        Notes NVARCHAR(MAX) NULL,
        IsRamadan BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
END
