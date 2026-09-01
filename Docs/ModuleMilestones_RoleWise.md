# MosqueOS — Module 3.1–3.15 Role-Wise Milestones

**Goal:** Deliver Module Requirements end-to-end from **Super Admin → Guest**.  
**Stack:** ASP.NET Core · Angular 17 · SQL Server · JWT Identity  

**Status legend:** DONE · PARTIAL · TODO  

---

## Current module snapshot

| Module | Status | Notes |
|--------|--------|--------|
| 3.1 Mosque Profile | **DONE** | Seed, claim, activate, flags, public `/mosque/{slug}` |
| 3.2 Prayer Times | **DONE** | Daily/monthly, templates (Admin/Owner), exceptions, Jumuah, audit |
| 3.3 Announcements | **DONE** | Admin CRUD + public list/detail |
| 3.4 Events | **DONE** | Admin/Owner nav + API/UI |
| 3.5 Madrassah | **PARTIAL** | Teacher ops + Parent portal; fees Admin-only |
| 3.6 Communities | **PARTIAL** | Posts locked to Admin/Teacher/Muqaddam |
| 3.7 Awrad & Wird | **PARTIAL** | Content Editor + Muqaddam can build |
| 3.8 Daily Adhkar | **PARTIAL** | Member + library OK |
| 3.9 Duas Library | **PARTIAL** | Library + recommended-now |
| 3.10 Qur'an Reading | **DONE** (MVP) | 30-day plan; custom = v2 |
| 3.11 Ritual Guides | **PARTIAL** | Wudu primary; Ghusl/Salah later |
| 3.12 Janaza | **PARTIAL** | Admin+public; push optional missing |
| 3.13 Death Readings | **PARTIAL** | Campaigns + allocations |
| 3.14 Participation | **PARTIAL** | Admin CRUD; Teacher read registrations |
| 3.15 Umrah & Hajj | **PARTIAL** | Guides + stages |

Default feature flags (seed): PrayerTimes, Janaza, NearbyMosqueDiscovery ON; others OFF until Owner/Super Admin enable.

---

## Milestone order (role-wise)

### M1 — Super Admin (platform)
- [x] Platform shell: mosques, claims, registrations, users, features, audit, reports
- [x] Module oversight: prayer, announcements, janaza
- [x] Module hubs (Events→Umrah) deep-link to Feature Flags + mosque list + KPIs
- [ ] Per-module health KPIs from richer analytics (optional polish)
- [ ] End-to-end demo: seed → claim → activate → toggle module

### M2 — Mosque Owner + Mosque Admin (own mosque ops)
- [x] **Mosque Admin nav** full ops sidebar (3.1–3.14)
- [x] **Owner nav** prayer, announcements, events, janaza, communities, madrassah, participation, death readings, jamaah templates
- [x] Module flags: Owner toggle page exists (`/dashboard/owner/modules`)
- [ ] Verify home-mosque tenancy on all mutations (ongoing)

### M3 — Prayer Times Editor
- [x] Daily / Jumuah / exceptions / audit remain
- [x] **Templates + generate** restricted to Super/Owner/Admin only (API + PE nav removed; Admin route added)

### M4 — Teacher + Parent (Madrassah)
- [x] Teacher: classes, attendance, progress notes (existing)
- [x] Fees: Admin/Owner only (Teacher removed from fee mutations)
- [x] Teacher: read participation registrations (`/dashboard/teacher/participation`)
- [x] Parent: dedicated nav + child portal (`/dashboard/parent`)

### M5 — Muqaddam + Content Editor (spiritual)
- [x] Muqaddam: Awrad build/assign (`AwradManagers` + content route access)
- [x] Content Editor: awrad, duas, adhkar, ritual, journey
- [ ] Announcements/Events create for Content Editor; publish = Admins

### M6 — Member + Guest (public & personal worship)
- [x] Member: wird, adhkar, duas, quran, communities, participation, janaza, death readings (nav)
- [x] Community posts: ADMIN/TEACHER/Muqaddam only (API)
- [x] Guest: public browse nav (existing)

### M7 — Hardening & handover
- [ ] Feature-flag gated menus for disabled modules
- [x] Feature-flag API gate verified (Participation OFF → 404) — see ModuleMilestones_M1M7_TestResults.md
- [ ] Janaza optional push (if in scope)
- [ ] Journey offline-friendly reading
- [ ] ClientDeliveryChecklist final boxes

**Latest automated run (2026-08-05):** **42/48 PASS** in harness; after classifying path/tenancy false-negatives → **M1–M6 effectively PASS**, **M7 menus still open**. Full table: [ModuleMilestones_M1M7_TestResults.md](./ModuleMilestones_M1M7_TestResults.md).

---

## Role access matrix (target)

| Role | Primary modules |
|------|-----------------|
| Super Admin | Platform + all mosques + flags |
| Mosque Owner | Own mosque ops + flags + jamaah templates |
| Mosque Admin | Own mosque ops + jamaah templates (no platform flags write) |
| Prayer Editor | Prayer daily/exceptions/jumuah/audit (no templates) |
| Teacher | Madrassah class ops + participation registrations read |
| Muqaddam | Communities + Awrad build + murid view |
| Content Editor | Spiritual content + announce/event draft |
| Parent | Child madrassah read + worship |
| Member | Personal worship + join/register |
| Guest | Public browse |

---

## Demo credentials (local)

| Role | User | Password |
|------|------|----------|
| Super Admin | `admin` | `Admin@123` |
| Mosque Admin | `mosqueadmin` | `Admin@123` / `Mosque@123` |
| Owner | `owner` | `Owner@123` |
| Prayer Editor | `prayereditor` | `Prayer@123` |

---

## Execution note

**M1–M6 core RBAC + nav alignment is largely complete.** Remaining: feature-flag menus (M7), Content Editor announce/event draft, optional push/offline.
