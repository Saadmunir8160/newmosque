# MosqueOS

Community mosque platform — prayer times, announcements, events, madrassah, and spiritual content.

## Stack

- **Frontend:** Angular (`frontend/`) — http://localhost:4200
- **Backend:** ASP.NET Core API (`backend/MosqueOS.API/`) — http://localhost:5000
- **Architecture:** Clean Architecture + Repository Pattern + Unit of Work
- **ORM:** EF Core **Code First** (migrations auto-apply on startup)
- **Database:** SQL Server Express (`.\SQLEXPRESS`, database `mos_db`) — manage with **SSMS**

> TRD originally listed PostgreSQL; this project uses **SQL Server Express** instead (same EF Core entities, different provider).

## Quick start

### Backend

```bash
cd backend/MosqueOS.API
dotnet run
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Optional Redis (public profile cache)

Set in `appsettings.Local.json` or environment:

```json
"ConnectionStrings": { "Redis": "localhost:6379" }
```

If empty, the API uses an in-memory distributed cache.

## Demo credentials

| User | Password | Role |
|------|----------|------|
| admin | Admin@123 | Super Admin |
| owner | Owner@123 | Mosque Owner |
| mosqueadmin | Admin@123 | Mosque Admin |
| prayereditor | Editor@123 | Prayer Times Editor |
| member | Member@123 | Member |

> Change these before any production deploy. Prefer communicating credentials out-of-band.

## Module 3.1 — Mosque Profile (test flow)

1. **Super Admin** — `admin` / `Admin@123` → `/dashboard/super/mosques` → seed Unclaimed mosque.
2. **Public** — open `/mosque/{slug}` (profile visible).
3. **Claim** — email-verified user submits claim from public profile.
4. **Hidden** — status ClaimPending → public 404.
5. **Approve** — `/dashboard/super/claims` → Approve → **Claimed** (still hidden).
6. **Owner edit** — `/dashboard/owner/my-mosque` while Claimed.
7. **Activate** — Super Admin Activate (requires name/city/address + phone or email) → **Active**.
8. **Live** — public profile returns with enabled modules.

**New mosque (not claim):** Owner `/dashboard/owner/mosque-listings` → Register → Super `/dashboard/super/registrations` → Approve → Activate.

Docs: [Docs/MosqueProfileModule.md](Docs/MosqueProfileModule.md) · [Docs/Module31_Verification.md](Docs/Module31_Verification.md) · [Docs/ClientDeliveryChecklist.md](Docs/ClientDeliveryChecklist.md)

## Features

- Live prayer times & Jumuah countdown
- Guest browsing (limited menu)
- Announcements, events, janaza
- Mosque claim / registration / activation
- In-app notifications + audit trail
- Madrassah & community modules
- Responsive web app (mobile-friendly)
