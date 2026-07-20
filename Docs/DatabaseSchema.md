# MosqueOS — Database schema notes (Module 3.1 focus)

Primary source of truth: **EF Core migrations** under `backend/MosqueOS.Infrastructure/Migrations/`.

Apply with:

```bash
cd backend
dotnet ef database update --project MosqueOS.Infrastructure --startup-project MosqueOS.API
```

## Key tables

### `Mosques`
| Column | Notes |
|--------|--------|
| Id, Name, Slug | Slug unique for public URL `/mosque/{slug}` |
| Address, City, Postcode, Country | Location |
| Phone, Email, Website | Contact |
| FacebookUrl, InstagramUrl, YoutubeUrl, TwitterUrl | Legacy social columns |
| SocialLinksJson | Preferred `{ links: [{ platform, url, label? }] }` |
| LogoUrl, BannerUrl | Relative `/uploads/...` paths |
| Status | Unclaimed / ClaimPending / Claimed / Active / … |
| OwnerId | AspNetUsers FK when claimed |
| PublicProfileEnabled | Soft hide |
| IsDeleted | Soft delete |

### `MosqueSettings`
Per-mosque module flags (`ModuleKey`, `IsEnabled`). Unique `(MosqueId, ModuleKey)`.

### `MosqueOwnershipClaims`
Claim lifecycle: Pending → Approved / Rejected. Stores documents JSON + proof URL.

### `mosque_registration_requests`
New-mosque registration queue (not an ownership claim). Pending → Approved / Rejected.

### `UserNotifications`
In-app notifications (`UserId`, `Type`, `Title`, `Message`, `Route`, `IsRead`).

### `PlatformAuditLogs`
Platform + mosque/claim audit (`Action`, `Module`, `ActorId`, `TargetType`, `TargetId`, `Description`).

## Business rules
1. Public directory / profile: **Unclaimed** or **Active** only (and `PublicProfileEnabled`).
2. Activate requires name, city, address, and phone **or** email; no pending claims.
3. Claim submit: authenticated, email-verified, not Super Admin; rate-limited.
4. Registration approve creates mosque as **Claimed** with owner assigned; Super Admin activates separately.
