/*
  MosqueOS — one-time SSMS setup
  Server: localhost\SQLEXPRESS

  Problem: mos_db_tsql.sql uses janaza_announcements (GUID).
           The app uses JanazaAnnouncements (EF Core / int).

  Steps:
    1) Renames script DB -> mos_db_script (backup)
    2) Creates fresh mos_db for the app (new .mdf files)

  Run this entire script in SSMS (F5), then start MosqueOS.API once.
*/

USE master;
GO

-- Step 1: Rename existing script database (if present)
IF DB_ID(N'mos_db') IS NOT NULL AND DB_ID(N'mos_db_script') IS NULL
BEGIN
    ALTER DATABASE mos_db SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    ALTER DATABASE mos_db MODIFY NAME = mos_db_script;
    PRINT 'Renamed mos_db -> mos_db_script (script schema saved).';
END
GO

-- Step 2: Create app database (uses new file names if old .mdf still on disk)
IF DB_ID(N'mos_db') IS NULL
BEGIN
    CREATE DATABASE mos_db
    ON (NAME = N'mos_db',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\mos_db_app.mdf',
        SIZE = 64MB, FILEGROWTH = 64MB)
    LOG ON (NAME = N'mos_db_log',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\mos_db_app_log.ldf',
        SIZE = 64MB, FILEGROWTH = 64MB);
    PRINT 'Created mos_db for MosqueOS app.';
END
ELSE
    PRINT 'mos_db already exists — skip create.';
GO

PRINT '';
PRINT '=== DONE ===';
PRINT '1. Start API: dotnet run --project MosqueOS.API';
PRINT '2. In SSMS: USE mos_db; SELECT * FROM JanazaAnnouncements;';
PRINT '   (NOT janaza_announcements — that is in mos_db_script only)';
GO
