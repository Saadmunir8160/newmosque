# Module 3.2 â€” Live Setup & Test Results

**Date:** 2026-08-07 02:53
**Mosque:** 115 (masjid-al-noor-bradford)
**PASS:** 15 Â· **FAIL:** 0 Â· **TOTAL:** 15

## Test data applied

| Item | Value |
|------|-------|
| Editor | ``prayereditor`` / ``Prayer@123`` |
| Admin (templates) | ``mosqueadmin`` / ``Admin@123`` |
| Today | 2026-08-07 |
| Daily Fajr | 05:30 / 05:45 |
| Daily Dhuhr | 12:30 / 13:00 |
| Daily Asr | 15:30 / 16:00 |
| Daily Maghrib | 18:00 / 18:10 (+ exception 18:25) |
| Daily Isha | 19:30 / 20:00 |
| Jumuah 1 | Khutbah 12:45 / Jamaat 13:15 |
| Jumuah 2 | Khutbah 13:30 / Jamaat 14:00 |
| Exception | Maghrib override 18:25 |
| Template | Winter Timetable id=2 |
| Generate | 2026-08-08 to 2026-08-14 publish |

## UI routes

- Daily: /dashboard/prayer-editor/daily
- Monthly: /dashboard/prayer-editor/monthly
- Jumuah: /dashboard/prayer-editor/jumuah
- Exceptions: /dashboard/prayer-editor/exceptions
- Audit: /dashboard/prayer-editor/audit
- Templates (Admin): /dashboard/admin/prayer-times/templates
- Public: /mosque/masjid-al-noor-bradford

## Results

| Id | Test | Result | Detail |
|----|------|--------|--------|
| AUTH | Logins PE/MA/Admin/Owner | **PASS** | pe=True ma=True admin=True owner=True |
| SETUP1 | PrayerTimes module ON | **PASS** | status=200 |
| SETUP2 | Ensure mosque Active | **PASS** | status=400 |
| PT-A | Editor save+publish daily | **PASS** | status=200 |
| PT-A2 | Public daily timetable readable | **PASS** | status=200 hasTimes=True |
| PT-B | Two Jumuah slots | **PASS** | create1=200 create2=200 count=2 |
| PT-C | Maghrib exception 18:25 | **PASS** | status=200 |
| PT-C2 | Public reflects Maghrib override | **PASS** | status=200 body={"date":"2026-08-07","times":{"mosqueId":115,"mosque":null,"date":"2026-08-07","fajrStart":"05:30:00","fajrJamaat":"05:45:00","dhuhrStart":"12:30:00","dhuhrJamaat":"13:00:00","asrS |
| PT-D1 | Admin create Winter template | **PASS** | tid=2 status=200 |
| PT-D-RBAC | Editor DENIED templates (403) | **PASS** | status=403 |
| PT-D2 | Generate daily rows from template | **PASS** | status=200 {"created":7,"updated":0,"skipped":0,"preview":false,"message":"Template applied. Create 7, update 0, skip 0.","rows":[]} |
| PT-AUDIT | Audit log readable | **PASS** | status=200 entries=30 |
| PT-E1 | Monthly timetable view | **PASS** | status=200 rows=14 |
| PT-E2 | Public/monthly accessible | **PASS** | status=200 |
| PT-E3 | Public mosque profile (countdown host) | **PASS** | status=200 slug=masjid-al-noor-bradford |
