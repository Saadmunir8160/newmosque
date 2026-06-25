# MosqueOS — Prayer Times Editor Module

## Role: Prayer Times Editor

Manages mosque prayer schedules only. Cannot manage events, users, reports, or settings.

## Sidebar

| Section | Items |
|---------|--------|
| Dashboard | Dashboard |
| Prayer Times | Daily Prayers, Jumuah, Ramadan, Audit Log |

## Permissions

| Code | Capability |
|------|------------|
| `prayer.view` | View prayer times |
| `prayer.edit` | Edit prayer times |
| `prayer.publish` | Publish prayer times |

Assigned to **Prayer Times Editor** via `EnterpriseSeeder`. Mutations also require `Roles.PrayerTimesManagers`.

## SQL Tables

- `PrayerTimesDaily` — daily start/jamaat + `Status`, `PublishedAt`, `PublishedById`
- `JumuahTimes` — slots 1–3 with khutbah/jamaat
- `PrayerExceptions` — per-date overrides
- `PrayerTimeAuditLogs` — change history (`ActionType`, optional `Date`)
- `RamadanTimetables` — yearly Ramadan schedule (draft/publish)
- `RamadanDayEntries` — suhoor, iftar, taraweeh per day
- `PrayerSpecialTimings` — labelled special times (Ramadan flag)

Migration: `20260617140000_AddPrayerEditorModule.cs`  
Script: `backend/scripts/prayer-editor-module.sql`

## APIs (`/api/v1/mosques/{id}/prayer-times`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET editor/dashboard` | Editor | Summary stats |
| `GET daily?includeDraft=` | Public/Editor | Daily times |
| `PUT daily?publish=` | Editor | Save draft or publish |
| `POST daily/publish` | Editor | Publish saved day |
| `POST daily/publish-month` | Editor | Publish whole month |
| `GET/POST/PUT/DELETE jumuah` | Mixed | Jumuah slots (max 3) |
| `GET/POST ramadan` | Mixed | Ramadan timetable |
| `PUT ramadan/{id}/days` | Editor | Upsert Ramadan day |
| `POST ramadan/{id}/publish` | Editor | Publish Ramadan |
| `GET/POST/DELETE special-timings` | Mixed | Special timings |
| `GET audit-log` | Editor | Prayer change audit |

## Frontend

- `core/config/prayer-editor-nav.config.ts` — sidebar
- `core/services/prayer-editor.service.ts` — API client
- `modules/prayer-editor/prayer-editor.routes.ts` — lazy routes
- Material forms on daily, jumuah, ramadan, audit pages

## Demo login

`prayereditor` / `Prayer@123` → home mosque: Masjid Al-Noor Bradford
