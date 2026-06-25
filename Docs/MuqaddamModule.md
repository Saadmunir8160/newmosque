# Muqaddam Module

Role: **Muqaddam** — manage spiritual tariqa circles and murids (assigned communities only).

**Demo login:** `muqaddam` / `Muqaddam@123`

## Sidebar

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/dashboard/muqaddam` | KPIs, quick links, recent activity |
| Murid Management | `/dashboard/muqaddam/murids` | View murids, participation, attendance |
| Communities | `/dashboard/muqaddam/communities` | Create/manage tariqa circles and members |
| Guidance Notes | `/dashboard/muqaddam/guidance` | Notes, follow-ups, recommendations |
| Events | `/dashboard/muqaddam/events` | Dhikr gatherings and spiritual programs |
| Reports | `/dashboard/muqaddam/reports` | Participation and attendance reports + CSV |

## Permissions (RBAC)

**Can:**
- `muqaddam.communities.manage` — Assigned tariqa communities only

**Cannot:**
- Manage mosque settings or users globally
- Access communities where not Admin/Muqaddam leader

Access enforced via `MuqaddamAccessHelper` — filters by `CommunityMember` role `Admin` or `Muqaddam`.

## Murid Model

Murids are **not a separate table**. They are `CommunityMember` users with role `Member` in `CommunityType.Tariqa` circles assigned to the muqaddam.

## API Endpoints

Base: `api/v1/muqaddam`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Stats and recent activity |
| GET | `/murids` | Murid summaries with participation (`?search=`) |
| GET/POST | `/communities` | List/create assigned tariqa communities |
| PUT | `/communities/{id}` | Update community |
| GET/POST | `/communities/{id}/members` | Manage murid membership |
| DELETE | `/communities/{id}/members/{userId}` | Remove member |
| GET/POST | `/guidance-notes` | Spiritual guidance CRUD |
| PATCH | `/guidance-notes/{id}/complete` | Complete follow-up |
| GET/POST | `/communities/{id}/gatherings` | Dhikr / spiritual events |
| POST | `/gatherings/{id}/attendance` | Record present/absent/late |
| GET | `/reports?type=participation\|attendance` | Reports |

## Database Tables

| Table | Purpose |
|-------|---------|
| `Communities` | Tariqa circles (`Type = Tariqa`) |
| `CommunityMembers` | Murids and leaders (`Role`: Admin, Muqaddam, Member) |
| `GuidanceNotes` | Notes, follow-ups, recommendations per murid |
| `CommunityGatherings` | Dhikr gatherings and spiritual programs |
| `GatheringAttendances` | Per-murid attendance at gatherings |

Migration: `20260617180000_AddMuqaddamModule.cs`  
Script: `backend/scripts/muqaddam-module.sql`

## Frontend Structure

```
frontend/src/app/
  core/config/muqaddam-nav.config.ts
  core/services/muqaddam.service.ts
  modules/muqaddam/
    muqaddam.routes.ts
    muqaddam-dashboard.component.ts
    muqaddam-murids.component.ts
    muqaddam-communities.component.ts
    muqaddam-guidance.component.ts
    muqaddam-events.component.ts
    muqaddam-reports.component.ts
```

## Run

```powershell
cd backend/scripts; .\run-api.ps1
cd frontend; npm start
```

- App: http://localhost:4200
- Login: `muqaddam` / `Muqaddam@123` → `/dashboard/muqaddam`
