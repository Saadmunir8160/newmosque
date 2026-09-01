# Module 3.3 + 3.4 — Live Setup & Test Results

**Date:** 2026-08-07 03:17  
**Mosque:** 115 (masjid-al-noor-bradford)  
**PASS:** 19 · **FAIL:** 0 · **TOTAL:** 19

## Verdict

Modules **3.3 Announcements** and **3.4 Events** are wired and working on mosque 115: modules enabled, admin CRUD/publish, public list/detail, homepage featured announcements + upcoming events, Mawlid event linked to Awrad collection id 2, recurring flag stored.

## Test data applied

| Module | Item | Value |
|--------|------|-------|
| 3.3 | Announcement id | 13 |
| 3.3 | Title | M33 Community Iftar Reminder |
| 3.3 | Status flow | Draft → Published → Unpublished → Published |
| 3.3 | Featured | true |
| 3.3 | Image | unsplash mosque image URL |
| 3.4 | Mawlid event id | 13 |
| 3.4 | Date | 2026-08-07 19:15–21:00 |
| 3.4 | Type | Mawlid |
| 3.4 | Recurring | true (stored, not enforced in v1) |
| 3.4 | WirdCollectionId | 2 (Mawlid Night Reading) |
| Auth | mosqueadmin / Admin@123 | create / publish / delete |

## UI routes

- Admin announcements: `/dashboard/admin/announcements`
- Admin events: `/dashboard/admin/events`
- Member/public lists: `/dashboard/announcements` · `/dashboard/events`
- Guest: `/mosque/masjid-al-noor-bradford` (and guest announcements/events)
- Public home API: `/api/v1/public/home?mosqueId=115`

## Spec coverage

| Requirement | Status |
|-------------|--------|
| 3.3 Admin create / edit / publish / unpublish / delete | Pass |
| 3.3 Public list + detail (title, summary, image, date) | Pass |
| 3.3 Featured on homepage | Pass |
| 3.3 Status DRAFT / PUBLISHED / UNPUBLISHED | Pass |
| 3.4 Public event list + detail | Pass |
| 3.4 Admin create / edit / delete | Pass |
| 3.4 event_type + is_recurring stored | Pass |
| 3.4 Link to guided reading (WirdCollectionId) | Pass |

## Results

| Id | Test | Result | Detail |
|----|------|--------|--------|
| AUTH | Logins | **PASS** | ma=True admin=True owner=True |
| SETUP | Announcements + Events modules ON | **PASS** | ann=200 evt=200 |
| A1 | Admin create announcement (DRAFT) | **PASS** | id=13 status=201 |
| A2 | Admin edit announcement + feature flag | **PASS** | status=200 featured=True |
| A3 | Admin publish announcement | **PASS** | status=200 annStatus=Published |
| A4 | Public announcement list includes published | **PASS** | status=200 found=True count=5 |
| A5 | Public announcement detail (card fields) | **PASS** | status=200 |
| A6 | Featured/published on public home | **PASS** | status=200 featuredFound=True |
| A7 | Admin unpublish (public detail hidden) | **PASS** | unpub=200 publicGet=404 |
| A8 | Admin delete announcement | **PASS** | id=14 status=204 |
| A9 | Admin list all statuses | **PASS** | status=200 |
| E1 | Admin create event (Mawlid + recurring + wird) | **PASS** | id=13 wird=2 recurring=True |
| E2 | Owner create GENERAL event | **PASS** | id=14 |
| E3 | Admin edit event | **PASS** | start=19:15:00 |
| E4 | Public event list | **PASS** | found=True |
| E5 | Public event detail + awrad link | **PASS** | wirdId=2 |
| E6 | Home upcoming events section | **PASS** | count=5 |
| E7 | Admin delete event | **PASS** | id=14 status=204 |
| E8 | Recurring flag stored (v1 not enforced) | **PASS** | isRecurring=True |

## Re-run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module33-34-setup-test.ps1
```
