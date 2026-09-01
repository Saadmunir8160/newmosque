# Module 3.5 + 3.6 — Live Setup & Test Results

**Date:** 2026-08-07  
**Mosque:** 115 (masjid-al-noor-bradford)  
**PASS:** 27 · **FAIL:** 0 · **TOTAL:** 27

## Verdict

Modules **3.5 Madrassah** and **3.6 Communities** are set up and verified on mosque 115.

## Spec coverage

### 3.5 Madrassah

| Requirement | Status |
|-------------|--------|
| Students / guardians / classes / enrolments | Pass |
| Attendance sessions + PRESENT/ABSENT/LATE | Pass (PRESENT recorded) |
| Fees unpaid → paid | Pass |
| Progress notes per student/class | Pass |
| Parent portal (`my-children`) | Pass |
| Dashboard attendance rate + unpaid fees | Pass |
| Admin manage + teacher ops | Pass |

### 3.6 Communities

| Requirement | Status |
|-------------|--------|
| Create/list (mosque-linked, public) | Pass |
| Types including StudyCircle + Tariqa | Pass |
| Roles Admin / Teacher / Member | Pass (invite + join) |
| Feed posts (text + hadith ref) | Pass |
| Resources section | Pass |
| Link community → event | Pass (new API) |
| Optional mosque link | Pass |

## Test data applied

| Module | Item | Value |
|--------|------|-------|
| 3.5 | Student | id **15** — M35 Ahmad Ali |
| 3.5 | Guardian | parent (Father) |
| 3.5 | Class | id **7** — M35 Quran Level 1 (teacher assigned) |
| 3.5 | Session | id **13** — Present |
| 3.5 | Fees | paid + unpaid remaining for dashboard |
| 3.5 | Progress note | Surah Al-Fatiha |
| 3.6 | Study circle | id **9** |
| 3.6 | Tariqa | id **10** |
| 3.6 | Linked event | id **4** |
| 3.6 | Hadith ref | Ibn Majah 224 |

## Code additions (3.6 gaps closed)

- `POST /api/v1/communities/{id}/members` — invite with role  
- `POST /api/v1/communities/{id}/events` — link event  
- `GET /api/v1/communities/{id}/events` — list linked events  

## UI routes

- Admin madrassah: `/dashboard/admin/madrassah`
- Admin communities: `/dashboard/admin/communities`
- Parent: `/dashboard/parent` (API `GET /madrassah/my-children`)
- Teacher: `/dashboard/teacher`
- Member communities: `/dashboard/member/communities`

## Results

| Id | Test | Result |
|----|------|--------|
| AUTH | Logins + user ids | **PASS** |
| SETUP | Modules ON | **PASS** |
| M1–M13 | Madrassah lifecycle | **PASS** (all) |
| C1–C12 | Communities lifecycle | **PASS** (all) |

## Re-run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module35-36-setup-test.ps1
```

If logins return **429**, restart the API (rate limit: 20 / 15 min / IP) then retry.
