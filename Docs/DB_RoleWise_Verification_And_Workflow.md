# MosqueOS — Database + Role-Wise Verification & How It Works

**Date:** 2026-08-05  
**Database:** `mos_db` on `.\SQLEXPRESS`  
**Demo mosque:** **115 — Masjid Al-Noor Bradford** (`masjid-al-noor-bradford`)  
**Docs followed:** Module Requirements 3.1–3.15 · ModuleMilestones M1–M7 · Module31/32 Test Pack · DatabaseDocumentation

---

## 1. Database verify — result

| Check | Result |
|-------|--------|
| Tables present | **79** tables (all Module 3.1–3.15 + Identity) |
| Demo roles seeded | **PASS** — admin, owner, mosqueadmin, prayereditor, teacher, parent, muqaddam, editor, member |
| Mosque 115 Active + modules ON | **PASS** — 15 flags enabled (was soft-deleted → **restored**) |
| Prayer / Madrassah / Spiritual data | **PASS** — see counts below |
| Gaps filled | Parent/Editor `HomeMosqueId`, Member wird schedule, Participation registration, community roles |

### Role matrix (after fill)

| User | Password | Roles | Home mosque |
|------|----------|-------|-------------|
| `admin` | `Admin@123` | Super Admin | — |
| `owner` | `Owner@123` | Mosque Owner | 115 Al-Noor |
| `mosqueadmin` | `Admin@123` | Mosque Admin (+ Owner on some claims) | 115 |
| `prayereditor` | `Prayer@123` | Prayer Times Editor | 115 |
| `teacher` | `Teacher@123` | Teacher | 115 |
| `parent` | `Parent@123` | Parent, Member | 115 |
| `muqaddam` | `Muqaddam@123` | Muqaddam, Member | 115 |
| `editor` | `Editor@123` | Content Editor | 115 |
| `member` | `Member@123` | Member | 115 |

### Key row counts

| Area | Count |
|------|------:|
| Active mosques | 3 |
| PrayerTimesDaily | 38 |
| JamaahTemplates | 1 |
| Students / Guardians / Fees | 10 / 2 / 11 |
| Communities / Members / Posts | 1 / 3 / 2+ |
| WirdCollections / UserWirdSchedules | 9 / 1 |
| Duas / RitualGuides / JourneyGuides | 14 / 9 / 2 |
| Janaza / ReadingCampaigns | 3 / 1 |
| Participation regs | 1 |

**Scripts:**
- `scripts/db-verify-rolewise.sql` — inventory
- `scripts/db-fill-rolewise-gaps.sql` — gap fill
- `scripts/run-rolewise-db-smoke.ps1` — API smoke per role

---

## 2. Role-wise API smoke (after DB restore)

**Final: 38/38 PASS** (OW2 + GU1 fixed after undeleting mosque 115)

| Role | What was tested | Result |
|------|-----------------|--------|
| Super Admin | Login, dashboard, users, mosque settings | PASS |
| Owner | Toggle module flag, create event, templates list | PASS |
| Mosque Admin | Announcement, students | PASS |
| Prayer Editor | Daily GET, templates **403**, audit-log | PASS |
| Teacher | Classes, fees **403**, participation regs | PASS |
| Parent | My children (Ibrahim Khan) | PASS |
| Muqaddam | Murids, awrad, community post | PASS |
| Content Editor | Duas library | PASS |
| Member | Wird schedule, adhkar, quran, post **403**, participation | PASS |
| Guest | Public profile, prayer, ritual, journey, janaza | PASS |

Details: `Docs/DB_RoleWise_SmokeResults.md`  
Earlier milestone run: `Docs/ModuleMilestones_M1M7_TestResults.md`

---

## 3. Project kaise kaam karta hai (architecture)

```
Browser (Angular 17 :4200)
    │  JWT Bearer token
    ▼
ASP.NET Core API (:5000)  → Controllers + [Authorize(Roles=...)]
    │
    ▼
IUnitOfWork / Repositories
    │
    ▼
SQL Server  mos_db  (EF Core Code First + Identity)
```

- Har mosque ka **apna data** (`MosqueId` FK) — multi-tenant.
- **Module flags** (`MosqueSettings`) — OFF ho to API filter `RequireMosqueModule` block karta hai.
- Roles Identity tables mein: `AspNetUsers` ↔ `AspNetUserRoles` ↔ `AspNetRoles`.

---

## 4. Business workflow (document order)

### A) Mosque lifecycle (Module 3.1) — Super Admin se start

```
Super Admin seeds listing (email EMPTY)
        ↓  Status = Unclaimed
Public /mosque/{slug}  →  Claim CTA visible
        ↓  User claims (mosqueadmin / member)
Status = ClaimPending  →  public HIDDEN
        ↓  Super Admin Approves
Status = Claimed  →  OwnerId set
        ↓  Super Admin Activates
Status = Active  →  public LIVE
Owner toggles module flags (PrayerTimes, Events, …)
```

### B) Role-wise daily work

| Role | Typical flow |
|------|----------------|
| **Super Admin** | Seed/claim/activate mosques · users/roles · feature oversight · audit |
| **Owner** | Own mosque profile · **module flags** · staff · ops (events, prayer templates) |
| **Mosque Admin** | Announcements, events, janaza, madrassah, participation, templates |
| **Prayer Editor** | Daily / Jumuah / exceptions / audit — **not** templates |
| **Teacher** | Classes, attendance, progress — **not** fees |
| **Parent** | Child attendance / fees / notes portal |
| **Muqaddam** | Circles, murids, awrad build, community posts |
| **Content Editor** | Awrad / duas / adhkar / ritual / journey content |
| **Member** | Wird, adhkar, duas, quran, join/register — **no** feed posts |
| **Guest** | Public browse only (no login) |

### C) Prayer Times (3.2)

```
Editor saves daily → Publish
Admin creates Jamaah Template → Generate date range
Exceptions override one prayer/day
Public profile + countdown (Europe/London)
Audit log records changes
```

---

## 5. Testing process (aap khud kaise dobara chalayein)

### Step 0 — Start stack

```powershell
# API
cd backend\MosqueOS.API
dotnet run --urls http://localhost:5000

# Frontend (dusri window)
cd frontend
npm start
# http://localhost:4200
```

### Step 1 — Database verify

```powershell
sqlcmd -S .\SQLEXPRESS -d mos_db -E -I -i scripts\db-verify-rolewise.sql
```

### Step 2 — Gap fill (agar counts kam hon)

```powershell
sqlcmd -S .\SQLEXPRESS -d mos_db -E -I -i scripts\db-fill-rolewise-gaps.sql
# Ensure demo mosque not soft-deleted:
sqlcmd -S .\SQLEXPRESS -d mos_db -E -Q "UPDATE Mosques SET IsDeleted=0 WHERE Id=115"
```

### Step 3 — Role API smoke

```powershell
powershell -File scripts\run-rolewise-db-smoke.ps1
```

### Step 4 — Manual UI (document Test Pack)

1. Browser A: login `admin` → seed → claims → activate  
2. Browser B (Incognito): public `/mosque/{slug}`  
3. Login `prayereditor` → daily/jumuah/exceptions (templates nahi)  
4. Login `owner` → `/dashboard/admin/prayer-times/templates`  
5. Login `teacher` / `parent` / `member` / Guest paths  

**Note:** Login rate limit = **20 / 15 min / IP**. Zyada automations ke baad API restart karein ya 15 min wait.

---

## 6. Important finding is run se

Mosque **115** pehle `IsDeleted=1` tha — is liye public profile + kuch owner settings **404** aa rahe thay.  
Restore ke baad Guest + Owner flag tests **PASS**. Soft-delete demo mosque ko kabhi “delete” UI se mat hatao bina restore ke.

---

## 7. Sign-off

| Layer | Status |
|-------|--------|
| Database schema vs modules | **PASS** |
| Role users + home mosque linkage | **PASS** |
| Document data (madrassah, prayer, spiritual) | **PASS** |
| Role API smoke | **PASS (38/38)** |
| M1–M7 milestone workflow (earlier) | **PASS / PARTIAL M7 menus** |

**Next optional:** M7 feature-flag gated **sidebar menus** (UI) — sirf yeh major open item.
