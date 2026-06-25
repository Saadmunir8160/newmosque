# Module 3.1 — Mosque Profile

## Status: **DONE** (MVP)

Core identity of each mosque — public-facing profile with super admin and owner management.

---

## Data model (implemented)

| Field | Entity |
|-------|--------|
| id, name, slug, address, city, postcode, country | `Mosque` |
| phone, email, website, facebook, instagram | `Mosque` |
| description, logo_url, banner_url | `Mosque` |
| timezone (default `Europe/London`) | `Mosque` |
| map_location, latitude, longitude | `Mosque` |
| status, owner_id | `Mosque` |
| module flags | `MosqueSettings` |
| claim requests | `MosqueOwnershipClaims` |

### Status lifecycle

```
UNCLAIMED → (claim) → ClaimPending → (approve) → CLAIMED → (activate) → ACTIVE
```

| Spec status | MosqueOS enum | Notes |
|-------------|---------------|-------|
| UNCLAIMED | `Unclaimed` | Public profile live |
| — | `ClaimPending` | Internal — claim awaiting review; profile hidden |
| CLAIMED | `Claimed` | Owner assigned; owner dashboard unlocked |
| ACTIVE | `Active` | Full public access + staff management |

Extra states (enterprise): `PendingReview`, `Suspended`, `Archived`.

---

## Functional requirements — **ALL DONE**

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Public mosque profile page at `/mosque/[slug]` | **DONE** |
| 2 | Admin can edit all mosque details | **DONE** |
| 3 | Mosque can be manually seeded by super admin | **DONE** |
| 4 | Users can claim an existing listing | **DONE** |
| 5 | Verification flow after claim (manual approval MVP) | **DONE** |
| 6 | Module feature flags per mosque (enable/disable) | **DONE** |

**Client demo guide:** see [Module31_ClientDemo.md](./Module31_ClientDemo.md)

### Additional MVP features (beyond spec)

| Feature | Status |
|---------|--------|
| Email OTP on signup | ✅ |
| Owner timezone + map fields | ✅ |
| Empty prayer times (no 404) | ✅ |

### Out of scope (MVP)

- **Donations** — placeholder UI only; payment integration deferred
- **Email OTP** — code logged to API terminal when SMTP not configured

---

## API routes

| Action | Method | Route |
|--------|--------|-------|
| Register + send OTP | POST | `/api/v1/auth/register` |
| Verify OTP | POST | `/api/v1/auth/verify-otp` |
| Resend OTP | POST | `/api/v1/auth/resend-otp` |
| Seed / create listing | POST | `/api/v1/mosques` or `/api/v1/platform/mosques/seed` |
| Public profile | GET | `/api/v1/mosques/{slug}` |
| Claim (JSON or multipart) | POST | `/api/v1/mosques/{id}/claim` |
| Pending claims | GET | `/api/v1/platform/claims/pending` |
| Approve → Claimed | POST | `/api/v1/platform/mosques/{id}/approve-claim` |
| Activate → Active | POST | `/api/v1/platform/mosques/{id}/activate` |
| Reject claim | POST | `/api/v1/platform/mosques/{id}/reject-claim` |
| Module flags | GET/POST | `/api/v1/mosques/{id}/features` |
| Daily prayer times | GET | `/api/v1/mosques/{id}/prayer-times/daily` |

---

## Dashboard routes

| Role | Task | URL |
|------|------|-----|
| Super Admin | Add mosque | `/dashboard/super/mosques` |
| Super Admin | Claims | `/dashboard/super/claims` |
| Super Admin | Detail + Activate + Flags | `/dashboard/super/mosques/{id}` |
| Public | Profile + claim form | `/mosque/{slug}` |
| Public | Signup + OTP | `/register` → `/verify-otp` |
| Owner | Dashboard | `/dashboard/owner` |
| Owner | Edit profile | `/dashboard/owner/profile` |
| Owner | Module settings | `/dashboard/owner/settings` |

---

## Test flow (end-to-end)

1. `admin` / `Admin@123` → create mosque → status **Unclaimed**
2. Open `/mosque/{slug}` → claim form visible
3. New user: `/register` → OTP on `/verify-otp` → `/login`
4. Submit claim → status **ClaimPending**
5. Super Admin → `/dashboard/super/claims` → **Approve** → **Claimed**
6. Owner → `/dashboard/owner/profile` → edit details + modules
7. Super Admin → mosque detail → **Activate** → **Active**
8. Public profile live again with feature-flagged sections

---

## Migration

```bash
dotnet ef database update --project MosqueOS.Infrastructure --startup-project MosqueOS.API
```

---

## Email notifications

Approve, reject, and activate send email via `IEmailSender`. OTP sent on register. Console log when SMTP not configured in `appsettings.Local.json`.
