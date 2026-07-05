-- MosqueOS Super Admin hardening — SSMS verification script
-- Server: .\SQLEXPRESS   Database: mos_db
-- Run after starting the API once (migrations apply on startup).

USE mos_db;
GO

PRINT '=== Migration history (latest 5) ===';
SELECT TOP 5 MigrationId, ProductVersion
FROM __EFMigrationsHistory
ORDER BY MigrationId DESC;

PRINT '=== RequiresActiveMosque column exists? ===';
SELECT CASE WHEN COL_LENGTH('NavigationMenuItems', 'RequiresActiveMosque') IS NOT NULL
    THEN 'PASS: RequiresActiveMosque column exists'
    ELSE 'FAIL: RequiresActiveMosque column missing — restart API to apply migrations'
END AS Result;

PRINT '=== Owner nav RequiresActiveMosque flags ===';
SELECT Label, Route, RequiresActiveMosque
FROM NavigationMenuItems
WHERE RequiredRole = 'MosqueOwner'
ORDER BY SortOrder;

PRINT '=== MosqueInvitations table exists? ===';
SELECT CASE WHEN OBJECT_ID('MosqueInvitations', 'U') IS NOT NULL
    THEN 'PASS: MosqueInvitations table exists'
    ELSE 'FAIL: MosqueInvitations table missing — restart API to apply migrations'
END AS Result;

IF OBJECT_ID('MosqueInvitations', 'U') IS NOT NULL
BEGIN
    PRINT '=== MosqueInvitations sample ===';
    SELECT TOP 10 Id, MosqueId, InviteEmail, Role, Status, SentAt, ExpiresAt
    FROM MosqueInvitations
    WHERE IsDeleted = 0
    ORDER BY SentAt DESC;
END

PRINT '=== Super Admin oversight nav routes ===';
SELECT Label, Route, Section
FROM NavigationMenuItems
WHERE RequiredRole = 'SuperAdmin' AND Section = 'Oversight'
ORDER BY SortOrder;

GO
