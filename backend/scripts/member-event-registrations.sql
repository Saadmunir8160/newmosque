-- Member module: EventRegistrations table (run if EF migration not applied)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventRegistrations')
BEGIN
    CREATE TABLE EventRegistrations (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EventId INT NOT NULL,
        UserId NVARCHAR(450) NOT NULL,
        RegisteredAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_EventRegistrations_Events FOREIGN KEY (EventId) REFERENCES Events(Id),
        CONSTRAINT FK_EventRegistrations_Users FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id)
    );
    CREATE UNIQUE INDEX IX_EventRegistrations_EventId_UserId ON EventRegistrations(EventId, UserId);
    CREATE INDEX IX_EventRegistrations_UserId ON EventRegistrations(UserId);
END
