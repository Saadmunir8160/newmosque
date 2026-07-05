-- Teacher Module tables (idempotent manual script)
IF OBJECT_ID(N'dbo.StudentProgressRecords', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentProgressRecords (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StudentId INT NOT NULL,
        ClassId INT NOT NULL,
        ProgressType INT NOT NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Detail NVARCHAR(MAX) NULL,
        SurahOrTopic NVARCHAR(MAX) NULL,
        Score DECIMAL(18,2) NULL,
        RecordDate DATE NULL,
        CreatedById NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_StudentProgressRecords_Students FOREIGN KEY (StudentId) REFERENCES Students(Id),
        CONSTRAINT FK_StudentProgressRecords_Classes FOREIGN KEY (ClassId) REFERENCES MadrassahClasses(Id)
    );
END

IF OBJECT_ID(N'dbo.ClassAssignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClassAssignments (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ClassId INT NOT NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        DueDate DATE NULL,
        ResourceUrl NVARCHAR(MAX) NULL,
        ResourceFileName NVARCHAR(MAX) NULL,
        CreatedById NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_ClassAssignments_Classes FOREIGN KEY (ClassId) REFERENCES MadrassahClasses(Id)
    );
END

IF OBJECT_ID(N'dbo.AssignmentGrades', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AssignmentGrades (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AssignmentId INT NOT NULL,
        StudentId INT NOT NULL,
        Grade NVARCHAR(MAX) NULL,
        Feedback NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        GradedById NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedById NVARCHAR(MAX) NULL,
        CONSTRAINT FK_AssignmentGrades_Assignments FOREIGN KEY (AssignmentId) REFERENCES ClassAssignments(Id) ON DELETE CASCADE,
        CONSTRAINT FK_AssignmentGrades_Students FOREIGN KEY (StudentId) REFERENCES Students(Id),
        CONSTRAINT UQ_AssignmentGrades_Assignment_Student UNIQUE (AssignmentId, StudentId)
    );
END
