# Module 3.7 + 3.8 — Live Setup & Test Results

**Date:** 2026-08-07  
**Mosque:** 115  
**PASS:** 27 · **FAIL:** 0 · **TOTAL:** 27

## Verdict

Modules **3.7 Awrad & Wird** and **3.8 Daily Adhkar** are working; previously missing gaps are closed and verified live.

## Spec coverage

### 3.7 Awrad & Wird

| Requirement | Status |
|-------------|--------|
| Content items (arabic / translit / translation / repeat / audio / source) | Pass |
| Structured collections (Khulasa + demo) with ordered steps | Pass |
| Guided reading + completion state | Pass |
| Wird Builder: assign collection to prayer slot | Pass |
| Mawlid / Event schedule listing | Pass |
| Recommended-now by time + day (Thu/Fri event preference) | Pass |
| Path-specific Ba'alawi / Shadhili listing | Pass |
| UserLevel Beginner/Regular/Advanced trims sequence | Pass (Beginner → 2 of 5) |
| Quick mode shortens further | Pass (→ 1 step) |

### 3.8 Daily Adhkar

| Requirement | Status |
|-------------|--------|
| Library items + personal list | Pass |
| Target count + prayer slot + occasion | Pass |
| +1 / +10 counter + `11/50` progress label | Pass |
| Occasion filter (`relevantOnly`) | Pass |
| My Wird summary card API | Pass |
| Custom adhkar (no library item) | Pass |

## Gaps closed in this pass

- `UserLevel` + `Quick` mode trim guided steps  
- `GET /awrad/mawlid-schedules`  
- `POST /awrad/collections/{id}/publish`  
- Recommended-now prefers Event/Weekly on Thursday/Friday slots; skips empty collections  
- Adhkar occasions: Always / Friday / Ramadan / SpecialEvent  
- `PUT /adhkar/mine/{id}`  
- `GET /adhkar/mine/summary` + My Wird page summary card  
- Increment returns `progressLabel`  
- `POST /adhkar/items/{id}/publish`  

## Demo data (latest run)

| Item | Value |
|------|-------|
| Content item | 16 |
| Wird collection | 11 — M37 Demo Daily Wird |
| Adhkar item | 16 |
| User adhkar | 6 |

## UI

- My Wird: `/dashboard/member/wird` (includes adhkar summary card)  
- Adhkar Dashboard: `/dashboard/member/adhkar`  
- Content Awrad builder: `/dashboard/content/awrad`  

## Re-run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module37-38-setup-test.ps1
```
