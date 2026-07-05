# Mosque Admin Module

Role: **Mosque Admin** — manage daily mosque operations for a single home mosque.

**Demo login:** `mosqueadmin` / `Mosque@123`

## Sidebar

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/dashboard/admin` | KPI widgets, charts, recent activity |
| Mosque Profile | `/dashboard/admin/mosque` | Edit mosque details |
| Prayer Times | `/dashboard/admin/prayer-times` | Daily / Jumuah times |
| Announcements | `/dashboard/admin/announcements` | CRUD, publish, search, status filter |
| Events | `/dashboard/admin/events` | CRUD, search, type filter |
| Janaza | `/dashboard/admin/janaza` | Post notices, search, delete |
| Communities | `/dashboard/admin/communities` | Create groups, search/filter |
| Participation | `/dashboard/admin/participation` | Opportunities + approve/reject requests |
| Madrassah | `/dashboard/admin/madrassah` | Dashboard stats, classes, create class |
| Users | `/dashboard/admin/users/{members\|teachers\|parents}` | CRUD members, search, activate/deactivate |
| Reports | `/dashboard/admin/reports` | Attendance, events, students, fees, communities + CSV export |
| Settings | `/dashboard/admin/settings/contact` | Contact & module flags |

## Permissions (RBAC)

**Can:**
- `mosque.prayer.manage` — Prayer times
- `mosque.announcements.manage` — Announcements
- `mosque.events.manage` — Events
- `mosque.janaza.manage` — Janaza
- `mosque.communities.manage` — Communities
- `mosque.participation.manage` — Participation requests
- `mosque.madrassah.manage` — Madrassah
- `mosque.members.manage` — Users at home mosque
- `mosque.reports.view` — Reports

**Cannot:**
- Platform settings (Super Admin only)
- Other mosques (scoped via `HomeMosqueId` + `MosqueAccessService`)
- Global roles

## API Endpoints

Base: `api/v1/mosques/{mosqueId}`

| Area | Methods |
|------|---------|
| Admin dashboard | `GET .../admin/dashboard` |
| Users | `GET/POST .../admin/users`, `PUT .../admin/users/{id}`, `PATCH .../admin/users/{id}/active` |
| Participation | `GET .../admin/participation/pending`, `PATCH .../admin/participation/registrations/{id}` |
| Reports | `GET .../admin/reports?type=&from=&to=` |
| Announcements | `GET/POST/PUT/DELETE .../announcements`, `POST .../announcements/{id}/publish` |
| Events | `GET/POST/PUT/DELETE .../events` |
| Janaza | `GET/POST/DELETE .../janaza` |
| Communities | `GET/POST api/v1/communities` |
| Madrassah | `GET api/v1/madrassah/dashboard`, `GET/POST .../classes`, `GET .../students` |

All mutations enforce mosque tenancy through `MosqueAccessHelper` / `MosqueAccessService`.

## Frontend Structure

```
frontend/src/app/
  core/config/mosque-admin-nav.config.ts
  core/services/mosque-admin.service.ts
  core/services/admin.service.ts
  modules/admin/
    dashboard/admin-dashboard.component.ts
    mosque-profile/admin-mosque.component.ts
    prayer-times-edit/admin-prayer-times.component.ts
    announcements-manage/admin-announcements.component.ts
    events-manage/admin-events.component.ts
    janaza/admin-janaza.component.ts
    communities/admin-communities.component.ts
    participation/admin-participation.component.ts
    madrassah/admin-madrassah.component.ts
    users/admin-users.component.ts
    reports/admin-reports.component.ts
    settings/
```

Lazy-loaded via `modules/admin/admin.routes.ts`. Shell detects Mosque Admin role and renders `MOSQUE_ADMIN_NAV_SECTIONS`.

## Database Tables (relevant)

Uses existing MosqueOS schema — no new tables required for this module:

- `Mosques`, `MosqueSettings`, `PrayerTimesDaily`, `JumuahTimes`
- `Announcements`, `MosqueEvents`, `JanazaAnnouncements`
- `Communities`, `CommunityMembers`
- `ParticipationOpportunities`, `ParticipationRegistrations`
- `MadrassahClasses`, `Students`, `ClassEnrolments`, `AttendanceSessions`
- `AspNetUsers`, `AspNetUserRoles`, `UserMosqueRoles`

See `Docs/DatabaseDocumentation.md` for full schema.

## Run

```powershell
# API
cd backend/scripts; .\run-api.ps1

# Frontend
cd frontend; npm start
```

- App: http://localhost:4200
- Swagger: http://localhost:5000/swagger
