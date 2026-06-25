# MosqueOS — Member Module

## Role: Member

Members can view mosque content, track personal worship, join communities, register for events, and manage their profile. They **cannot** manage users, mosques, reports, roles, prayer times, or create events.

## Sidebar (dedicated `member-nav.config.ts`)

| Section | Items |
|---------|--------|
| Main | Today Screen, Prayer Times, Announcements, Events |
| My Worship | My Wird, My Adhkar, Duas Library, Quran Reading, Communities, Participation, Ritual Guides, Umrah & Hajj Guides, Janaza, Death Readings, My Preferences, Profile |

## Permissions (RBAC)

| Code | Capability |
|------|------------|
| `member.prayer.view` | View prayer times |
| `member.announcements.view` | View announcements |
| `member.events.register` | Register for events |
| `member.communities.join` | Join communities |
| `member.wird.track` | Track wird progress |
| `member.adhkar.track` | Track adhkar progress |
| `member.duas.read` | Read duas |
| `member.quran.read` | Read Quran |
| `member.participation.join` | Participate in activities |
| `member.janaza.view` | View janaza notices |
| `member.readings.join` | Join death reading campaigns |
| `member.profile.manage` | Manage personal profile |

Assigned to **Member** and **Parent** roles via `EnterpriseSeeder`.

## SQL

### EventRegistrations

```sql
CREATE TABLE EventRegistrations (
    Id INT IDENTITY PRIMARY KEY,
    EventId INT NOT NULL REFERENCES Events(Id),
    UserId NVARCHAR(450) NOT NULL REFERENCES AspNetUsers(Id),
    RegisteredAt DATETIME2 NOT NULL,
    Status INT NOT NULL,  -- Registered, Confirmed, Cancelled
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    UNIQUE (EventId, UserId)
);
```

Script: `backend/scripts/member-event-registrations.sql`  
Migration: `20260617120000_AddEventRegistrations.cs`

## APIs

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/v1/member/dashboard?mosqueId=` | JWT | Progress summary + notifications |
| `GET /api/v1/member/reading-allocations?mosqueId=` | JWT | User's death reading allocations |
| `GET /api/v1/mosques/{id}/events?search=&type=&upcomingOnly=` | Public | List/filter events |
| `GET /api/v1/mosques/{id}/events/mine/registrations` | JWT | Member's event registrations |
| `POST /api/v1/mosques/{id}/events/{eventId}/register` | JWT | Register for event |
| `DELETE /api/v1/mosques/{id}/events/{eventId}/register` | JWT | Cancel registration |

Event create/update/delete remain `[Authorize(Roles = Admins)]` only.

## Frontend

- `core/config/member-nav.config.ts` — sidebar
- `core/services/member.service.ts` — dashboard API
- `modules/member/member.routes.ts` — lazy-loaded worship pages
- `modules/events/events.component.ts` — search, filters, registration (Material UI)
- Shell uses `navIsMember()` for dedicated sidebar (like Mosque Admin)

## Demo login

`member` / `Member@123` → home mosque: Masjid Al-Noor Bradford
