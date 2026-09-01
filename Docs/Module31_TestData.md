# Module 3.1 — Test Data (step by step)

**Latest live seed:** 2026-08-07 08:42  
**Mosque id:** 130  
**Slug:** `client-demo-mosque-20260807084256`  
**Claim:** MC-2026-000006 (id 58)  
**Public URL:** http://localhost:4200/mosque/client-demo-mosque-20260807084256  
**Results:** `Docs/Module31_LiveTestResults.md` · **Core T1–T8: ALL PASS**

---

## Logins

| Role | Username | Password | Use |
|------|----------|----------|-----|
| Super Admin | `admin` | `Admin@123` | Seed, approve claim, activate, flags |
| Claimant / Owner | `mosqueadmin` | `Admin@123` | Submit claim, owner settings after approve |

---

## Seed payload (Unclaimed)

| Field | Value | Notes |
|-------|--------|--------|
| Name | Client Demo Mosque | |
| Slug | `client-demo-mosque-YYYYMMDDHHmmss` | Unique each run |
| City | Bradford | Directory search |
| Address | 12 High Street | |
| Postcode | BD1 1AA | |
| Phone | 01274123456 | Edit target later: 01274999999 |
| Email | *(leave empty)* | Required for Unclaimed seed |
| Website | https://example.org | |
| Timezone | Europe/London | |
| Description | Client demo listing for Module 3.1 | |

**API:** `POST /api/v1/platform/mosques/seed` (admin)

---

## Claim payload

| Field | Value |
|-------|--------|
| mosqueId | *(seeded id)* |
| fullName | Mosque Admin |
| role / position | Imam |
| phone | 07123456789 |
| notes | Module 3.1 claim test |

**API:** `POST /api/v1/mosque-claims` (mosqueadmin)

---

## Lifecycle steps (expected)

| Step | Action | Who | Expected |
|------|--------|-----|----------|
| 1 | Seed mosque (no email) | admin | Status **Unclaimed**, public **200** |
| 2 | Open public `/mosque/{slug}` | guest | Visible + Claim CTA |
| 3 | Submit claim | mosqueadmin | Claim **PENDING**; mosque stays **Unclaimed**; CTA off |
| 4 | Public profile | guest | Still **Unclaimed** / 200 (no Claim CTA) |
| 5 | Approve claim | admin | Status **Claimed**, public **404** |
| 6 | Activate | admin | Status **Active** |
| 7 | Public profile | guest | **200 Active** |
| 8 | Toggle Announcements off/on | admin/owner | 200 both |

**Mosque statuses (spec only):** `UNCLAIMED \| CLAIMED \| ACTIVE`  
**Claim statuses:** `PENDING \| APPROVED \| REJECTED`

**Approve:** `POST /api/v1/admin/claims/{claimId}/approve`  
**Activate:** `POST /api/v1/platform/mosques/{id}/activate`

---

## Extra checks

| Item | Data | API |
|------|------|-----|
| Directory | city=Bradford | `GET /api/v1/mosques?city=Bradford` |
| Discovery | Client Request Mosque, Manchester, M1 1AE | `POST /api/v1/discovery/request` |
| Phone edit | 01274999999 | `PUT /platform/mosques/{id}` or owner `PUT /mosques/{id}` |
| Registration path | Client Reg Mosque, Leeds | separate endpoint (may 409 if pending) |

---

## UI routes

| Screen | URL |
|--------|-----|
| Public profile | `/mosque/{slug}` |
| Super Admin mosques | `/dashboard/admin/mosques` (seed listing) |
| Claims queue | `/dashboard/admin/claims` |
| Owner settings / features | mosque settings after claim+activate |

---

## Re-seed + verify

```powershell
# API on :5000
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module31-tests.ps1
```

Creates a **new** slug each run; updates `Docs/Module31_LiveTestResults.md`.
