# Module 3.2 — Prayer Times Verification

**API:** `http://localhost:5000/api/v1`  
**Frontend:** `http://localhost:4200`

## Spec checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|--------|
| 1 | Public daily timetable | **Pass** | Guest + `/mosque/{slug}` + dashboard prayer times |
| 2 | Monthly timetable view | **Pass** | Guest monthly + dashboard Daily/Monthly tabs |
| 3 | Next prayer countdown (Europe/London) | **Pass** | `prayer.utils.ts` uses mosque TZ (default `Europe/London`) |
| 4 | Admin / editor daily editing | **Pass** | Prayer Editor Daily + Admin Edit Timetable |
| 5 | Recurring templates → generate rows | **Pass** | M5: Templates page + `POST .../jamaah-templates/{id}/generate` |
| 6 | Exceptions (Ramadan / special dates) | **Pass** | M4: Exceptions page; public daily applies overrides |
| 7 | Audit log | **Pass** | Prayer Editor Audit Log (`TEMPLATE_APPLIED`, Exception, etc.) |
| 8 | One or more Jumuah slots | **Pass** | Up to 3 slots |

## Demo credentials

| Role | Username | Password |
|------|----------|----------|
| Prayer Times Editor | `prayereditor` | `Prayer@123` |
| Super Admin | `admin` | `Admin@123` |
| Mosque Admin | `mosqueadmin` | `Admin@123` |

## Milestone status

| ID | Milestone | Status |
|----|-----------|--------|
| M1 | Baseline verify | Existing features |
| M2 | Daily edit + publish | Existing |
| M3 | Jumuah slots | Existing |
| M4 | Exceptions editor + public apply | **Done** |
| M5 | Templates + generate | **Done** |
| M6 | Timezone countdown | **Done** |
| M7 | Public UX polish | **Done** |
| M8 | Docs / verification | **Done** (this file) |

## Manual test script

### A) Exceptions (M4)
1. Login `prayereditor` → `/dashboard/prayer-editor/exceptions`
2. Add: today · Maghrib · override time · reason `Test exception`
3. Open public mosque profile (Active mosque with PrayerTimes module ON)
4. Confirm Maghrib jamaat shows override
5. Remove exception → public reverts

### B) Templates generate (M5)
1. `/dashboard/prayer-editor/templates`
2. Create template name `Winter` with start/jamaat times
3. Generate: From → To (e.g. 7 days), Publish checked
4. Daily page shows generated days
5. Audit Log contains `TEMPLATE_APPLIED`

### C) Countdown timezone (M6)
1. Open Today or public profile prayer block
2. Next prayer countdown ticks in mosque timezone (default Europe/London)
3. After last Isha, next shows Fajr (tomorrow)

### D) Public / module flag (M7)
1. Active mosque, PrayerTimes **enabled** → public shows times + next countdown
2. Disable PrayerTimes module → public section hidden / API gated
3. Dashboard `/dashboard/prayer-times` → Daily + Monthly tabs

## Key routes

| UI | Path |
|----|------|
| Editor daily | `/dashboard/prayer-editor/daily` |
| Exceptions | `/dashboard/prayer-editor/exceptions` |
| Templates | `/dashboard/prayer-editor/templates` |
| Jumuah | `/dashboard/prayer-editor/jumuah` |
| Audit | `/dashboard/prayer-editor/audit` |
| Member/guest view | `/dashboard/prayer-times` |
| Public profile | `/mosque/{slug}` |

## Key APIs

| Method | Path |
|--------|------|
| GET | `/mosques/{id}/prayer-times/daily` (returns times **with exceptions applied**) |
| GET | `/mosques/{id}/prayer-times/monthly` |
| GET/POST/DELETE | `/mosques/{id}/prayer-times/exceptions` |
| GET/POST/PUT/DELETE | `/mosques/{id}/prayer-times/jamaah-templates` |
| POST | `/mosques/{id}/prayer-times/jamaah-templates/{id}/generate` |
| GET | `/mosques/{id}/prayer-times/audit-log` |
