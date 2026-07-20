# Module 3.1 — Mosque Profile Verification

**Date:** 2026-06-24  
**Database:** `Server=.\SQLEXPRESS;Database=mos_db`  
**API:** `http://localhost:5000/api/v1`  
**Frontend:** `http://localhost:4200`

## Client spec checklist (6 / 6 Pass)

| # | Client requirement | Status | Implementation |
|---|-------------------|--------|----------------|
| 1 | Public mosque profile at `/mosque/[slug]` | **Pass** | Canonical route `mosque/:slug` → `MosqueProfilePageComponent`; `/mosques/:slug` redirects |
| 2 | Admin can edit all mosque details | **Pass** | Super Admin, Mosque Owner, Mosque Admin via `/dashboard/admin/mosque` and `/dashboard/owner/profile`; **Claimed + Active** both editable (Milestone 2) |
| 3 | Mosque manually seeded by super admin | **Pass** | `/dashboard/super/mosques` → `POST /api/v1/platform/mosques/seed` → `Unclaimed` |
| 4 | Mosque admins can claim an existing listing | **Pass** | Any authenticated email-verified user may claim (ModuleRequirements); Super Admin blocked; CTA on `/mosque/:slug` |
| 5 | Verification flow after claim (manual approval MVP) | **Pass** | Claim → `ClaimPending` (public 404) → Super approve → `Claimed` → activate → `Active` |
| 6 | Module feature flags per mosque | **Pass** | `MosqueSettings`; Owner toggles at `/dashboard/owner/settings`; public tabs + Events API gated |

**Claim policy (canonical):** Any authenticated, email-verified user may submit an ownership claim for an `Unclaimed` mosque. Super Admins cannot claim. Mosque Admins/Owners are included under this rule.  
**Canonical public URL:** `/mosque/{slug}` (e.g. `http://localhost:4200/mosque/masjid-al-noor-bradford`)

## Lifecycle (end-to-end)

```
Super Admin seed → UNCLAIMED (public 200)
→ User claims → ClaimPending (public 404)
→ Super Admin approve → CLAIMED + owner_id = claimant (public 404)
→ Super Admin activate → ACTIVE (public 200)
→ Owner/Admin dashboard + profile edit; Owner module flags
```

| Status | Public `GET /api/v1/mosques/{slug}` | Owner assigned | Notes |
|--------|-------------------------------------|----------------|-------|
| Unclaimed | 200 | No | Listing visible, no `ownerId` in response |
| ClaimPending | 404 | No | Hidden during verification |
| Claimed | 404 | Yes (`owner_id`) | Hidden until activation |
| Active | 200 | Yes | Full public profile + module-gated tabs |
| Reject | → Unclaimed | Cleared | Mosque returns to open listing |

**Two-step verification (required):**
1. `POST /api/v1/platform/claims/{claimId}/approve` → mosque `CLAIMED`
2. `POST /api/v1/platform/claims/{claimId}/activate` → mosque `ACTIVE`

One-step approve+activate was removed. Approve never sets ACTIVE.

## Phase 0 — Automated API flow (`test-module31-flow.ps1`)

**Latest run: 22 / 22 Pass** (2026-06-24)

| Step | Result |
|------|--------|
| Admin login | Pass |
| Seed unclaimed mosque | Pass |
| Public profile (Unclaimed), no root `ownerId` | Pass |
| Public profile fields (capacity, gallery) | Pass |
| Public leadership + stats | Pass |
| Settings GET | Pass |
| Mosque Admin login | Pass |
| Mosque Admin claim → ClaimPending | Pass |
| Public hidden while ClaimPending (404) | Pass |
| Legacy `by-slug` returns 410 | Pass |
| Pending claims list | Pass |
| `POST /claims/{id}/approve` → Claimed | Pass |
| Public hidden while Claimed (404) | Pass |
| `POST /claims/{id}/activate` → Active | Pass |
| Public profile live again | Pass |
| Owner assigned on snapshot | Pass |
| Module flag toggle + Events 403 when disabled | Pass |
| Bulk settings PUT | Pass |
| Member submit listing | Pass |
| Reject claim flow | Pass |

Run: `powershell -ExecutionPolicy Bypass -File MosqueOS/backend/test-module31-flow.ps1`

## Unit tests

`dotnet test MosqueOS.Tests` — **21 / 21 Pass**

## Frontend build

`ng build --configuration=development` — **Pass**

## Workflow fixes applied (client spec alignment)

| Area | Fix |
|------|-----|
| Claim role | `MosqueAdmin` + `MosqueOwner` can claim; approve assigns `owner_id` to claimant |
| Canonical URL | `/mosque/:slug` primary; `/mosques/:slug` → redirect |
| ClaimPending visibility | Public `GET /mosques/{slug}` returns 404 while claim pending |
| Claimed visibility | Public 404 until Super Admin activates to Active |
| Partial profile PUT | `MosqueProfileFieldMapper` preserves omitted fields (logo, description, etc.) |
| Module settings | Owner-only toggle; Mosque Admin can view, not toggle |
| Demo credentials | `mosqueadmin` / `Admin@123` aligned with seeder |

## Demo credentials (seed)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `Admin@123` |
| Mosque Owner | `owner` | `Owner@123` |
| Mosque Admin | `mosqueadmin` | `Admin@123` |
| Prayer Editor | `prayereditor` | `Editor@123` |
| Teacher | `teacher` | `Teacher@123` |
| Content Editor | `editor` | `Editor@123` |
| Muqaddam | `muqaddam` | `Muqaddam@123` |
| Member | `member` | `Member@123` |
| Parent | `parent` | `Parent@123` |

## Client demo script (8 steps)

1. **Super Admin** — Login `admin` / `Admin@123` → `/dashboard/super/mosques` → seed new mosque (status Unclaimed).
2. **Public** — Open `/mosque/{slug}` → profile visible (no owner shown).
3. **Mosque Admin** — Login `mosqueadmin` / `Admin@123` → `/mosque/{slug}/claim` → submit claim form.
4. **Public hidden** — Refresh `/mosque/{slug}` → not found (ClaimPending).
5. **Super Admin** — `/dashboard/super/claims` → **Approve** → mosque becomes **Claimed** (still public 404); claimant is `owner_id`.
6. **Still hidden** — `/mosque/{slug}` still 404 until activation.
7. **Activate** — Super Admin clicks **Activate Mosque** (separate step). Requires name, city, address, and phone or email; blocked if a pending claim exists. Status → **Active** → `/mosque/{slug}` live again.
8. **Dashboards** — claimant can open owner/admin dashboard; owner toggles modules at `/dashboard/owner/settings`.

### Activation quality gate (Milestone 6)

| Rule | Behaviour |
|------|-----------|
| Required fields | name, city, address, phone **OR** email |
| Pending claims | Block activate while any pending ownership claim exists on the mosque |
| Soft completeness | UI warns when overall completeness &lt; 60% (does not hard-block if required fields present) |

### Social links (Milestone 5)

- Source of truth: `Mosque.SocialLinksJson` (`{ "links": [{ "platform", "url", "label?" }] }`)
- Legacy `FacebookUrl` / `InstagramUrl` / `YoutubeUrl` / `TwitterUrl` remain and stay in sync on write
- Public profile prefers `socialLinks` from the API and falls back to legacy columns

## UI checklist (manual spot-check)

| # | Flow | URL | Status |
|---|------|-----|--------|
| 1 | Public profile | `/mosque/{slug}` | Pass |
| 2 | Mosque not found | `/mosque-not-found` | Pass |
| 3 | Mosque Admin claim | `/mosque/{slug}/claim` | Pass |
| 4 | Super review | `/dashboard/super/claims` | Pass |
| 5 | Admin profile edit | `/dashboard/admin/mosque` | Pass |
| 6 | Owner module settings | `/dashboard/owner/settings` | Pass |
| 7 | Legacy redirect | `/mosques/{slug}` → `/mosque/{slug}` | Pass |
| 8 | Guest public link | `/dashboard/guest` | Pass |

## Roman Urdu — kya fix hua

- **Claim ab Mosque Admin kar sakta hai** — pehle sirf Owner tha; ab `mosqueadmin` bhi claim submit kar sakta hai, approve ke baad wohi `owner_id` ban jata hai.
- **Public URL ab `/mosque/slug` hai** — client spec ke mutabiq; purana `/mosques/slug` redirect ho jata hai.
- **Lifecycle poora** — Unclaimed public dikhta hai, claim ke baad ClaimPending/Claimed par chup, Active par dubara live.
- **Admin edit** — Super Admin, Mosque Admin aur Owner profile edit kar sakte hain; partial save se logo/description wipe nahi hota.
- **Module flags** — sirf Owner on/off karta hai; Mosque Admin sirf dekh sakta hai.
- **Tests** — API script 22/22, dotnet 21/21, Angular build pass.

## Success criteria

1. Full lifecycle Unclaimed → claim → approve → activate → Active — **Pass**
2. Public hidden during ClaimPending and Claimed — **Pass**
3. Module flags persist and gate APIs + public tabs — **Pass**
4. Owner-only module settings — **Pass**
5. Mosque Admin can claim per client spec — **Pass**
6. Canonical URL `/mosque/{slug}` — **Pass**
