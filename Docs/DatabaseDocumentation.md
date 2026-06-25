# MosqueOS — Database Documentation

## 1. Overview

| Item | Value |
|------|--------|
| **Database** | `mos_db` |
| **Server** | SQL Server Express (`.\SQLEXPRESS` or `localhost\SQLEXPRESS`) |
| **Approach** | **EF Core Code First** (migrations in `MosqueOS.Infrastructure/Migrations/`) |
| **ORM** | Entity Framework Core 10 |
| **Identity** | ASP.NET Core Identity tables (`AspNetUsers`, `AspNetRoles`, …) |

> **Note:** The original MOS TRD mentioned PostgreSQL. This deployment uses **SQL Server Express + SSMS** instead. Business logic and EF entities are the same; only the database provider differs (`UseSqlServer`).

### Connection string (`appsettings.json`)

```
Server=.\SQLEXPRESS;Database=mos_db;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

### First-time setup

1. Open SSMS → connect to `localhost\SQLEXPRESS`
2. Run API once — `DataSeeder` applies migrations and seeds demo data:

```bash
cd backend/MosqueOS.API
dotnet run --urls http://localhost:5000
```

3. Verify: `USE mos_db; SELECT name FROM sys.tables ORDER BY name;`

---

## 2. Architecture (data access)

```
API Controllers
    → IUnitOfWork (Application layer interface)
        → Repository<T> (Infrastructure)
            → ApplicationDbContext (EF Core)
                → SQL Server mos_db
```

- **No** direct `ApplicationDbContext` in controllers (except startup seeding in `Program.cs`)
- **Repository Pattern:** `IRepository<T>` + `UnitOfWork`
- **Code First:** entities in `MosqueOS.Domain/Entities/` → migrations → database

---

## 3. Module tables (TRD v1.0)

### 3.1 Mosque Profile
- `Mosques`, `MosqueSettings`, `PlatformAuditLogs`

### 3.2 Prayer Times
- `PrayerTimesDaily`, `JumuahTimes`, `PrayerExceptions`, `PrayerTimeAuditLogs`
- `RamadanTimetables`, `RamadanDayEntries`, `PrayerSpecialTimings` (editor module)

### 3.3–3.4 Content
- `Announcements`, `Events`, `EventRegistrations` (member event sign-up)

### 3.5 Madrassah
- `Students`, `Guardians`, `MadrassahClasses`, `Enrolments`
- `AttendanceSessions`, `AttendanceRecords`, `Fees`, `ProgressNotes`
- `StudentProgressRecords`, `ClassAssignments`, `AssignmentGrades` (teacher module)

### 3.6 Communities
- `Communities`, `CommunityMembers`, `CommunityPosts`, `CommunityResources`, `CommunityEvents`
- `GuidanceNotes`, `CommunityGatherings`, `GatheringAttendances` (muqaddam module)

### 3.7 Awrad & Wird
- `ContentItems`, `WirdCollections`, `WirdSteps`
- `UserWirdSchedules`, `UserWirdProgress`

### 3.8 Adhkar
- `AdhkarItems`, `UserAdhkar`, `UserAdhkarLogs`

### 3.9 Duas
- `Duas`, `DuaCollections`, `DuaCollectionItems`

### 3.10 Qur'an
- `QuranPlans`, `QuranProgress`

### 3.11 Ritual Guides
- `RitualGuides`, `RitualSteps`

### 3.12–3.13 Janaza & Death Readings
- `JanazaAnnouncements`, `ReadingCampaigns`, `ReadingAllocations`

### 3.14 Participation
- `ParticipationOpportunities`, `ParticipationRegistrations`

### 3.15 Journey Guides
- `JourneyGuides`, `JourneyStages`

### Identity
- `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, …

---

## 3.7–3.9 Content Editor (workflow)

| Table | Purpose |
|-------|---------|
| `ContentArticles` | Library: articles, PDFs, books |
| `MediaAssets` | Audio, image, video uploads |
| `ContentWorkflowLogs` | Status transition audit |

Workflow columns (`Status`, `PublishedAt`, `PublishedById`) on:

- `WirdCollections`, `ContentItems` (awrad)
- `Duas`, `AdhkarItems`

`ContentPublishStatus`: Draft, InReview, Approved, Published, Unpublished

---

## 4. Key relationships

| Parent | Child | Notes |
|--------|-------|-------|
| `Mosques` | Most mosque-scoped tables | `MosqueId` FK |
| `AspNetUsers` | `UserAdhkar`, `QuranPlans`, `CommunityMembers`, … | `UserId` FK |
| `WirdCollections` | `WirdSteps` | Ordered steps |
| `ReadingCampaigns` | `ReadingAllocations` | Death readings |

---

## 5. Demo data (seed)

Seeded on first API run (`DataSeeder.cs`):

- Masjid Al-Noor Bradford (active) + Leeds unclaimed listing
- 30 days prayer times, announcements, events, madrassah class
- Ba'alawi community, Khulasa Wird, Ghazali duas, Umrah guide
- Users: `admin`, `member`, `mosqueadmin`, `teacher`, `parent`, etc.

---

## 6. Useful SSMS queries

```sql
-- Table count
SELECT COUNT(*) AS TableCount FROM sys.tables;

-- Demo users
SELECT UserName, Email FROM AspNetUsers;

-- Member adhkar today
SELECT * FROM UserAdhkarLogs WHERE Date = CAST(GETUTCDATE() AS date);

-- Quran plan progress
SELECT * FROM QuranPlans;
SELECT * FROM QuranProgress WHERE Completed = 1;

-- Communities membership
SELECT * FROM CommunityMembers;
```
