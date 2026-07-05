# Module 3.1 — Mosque Profile
## Product Requirements Document (PRD)

| Field | Value |
|-------|-------|
| **Module** | 3.1 Mosque Profile |
| **Version** | 2.0 (Enterprise PRD) |
| **Status** | Approved for implementation alignment |
| **Platform** | MosqueOS — Multi-tenant SaaS |
| **Primary tenant unit** | Mosque (logical tenant) |
| **Public URL pattern** | `/mosque/{slug}` |
| **API base** | `/api/v1` |

---

## Executive Summary

Module 3.1 is the **foundational identity and tenancy layer** of MosqueOS. Every downstream module (Prayer Times, Events, Donations, Madrassah, Spiritual content, etc.) is scoped to a **Mosque** record and gated by **per-mosque feature flags**.

This PRD expands the original specification into a **production-ready, multi-tenant design** capable of serving **thousands of mosques** with clear ownership, verification, auditability, and security boundaries.

### Goals
- Provide a **public, SEO-friendly mosque profile** for discovery and community trust.
- Enable **controlled ownership** via claim → manual verification → activation.
- Allow **Super Admin seeding** of listings before an owner exists.
- Give **authorized mosque staff** full profile management within RBAC limits.
- Expose **module feature flags** so each mosque enables only relevant capabilities.

### Non-goals (this module)
- Payment processing / donation checkout (Module Donations).
- Prayer time calculation logic (Module Prayer Times).
- Automatic KYC / document OCR verification (Future).
- Billing / subscription plans (Future Platform module).

### Gap analysis vs original spec

| Original spec | Missing / underspecified | PRD addition |
|---------------|--------------------------|--------------|
| 3 statuses only | Intermediate states, suspension, archival | Extended lifecycle + transition matrix |
| `social_links` (generic) | Structure, validation, extensibility | JSON schema + platform-specific URLs |
| "Mosque admins claim" | Who may claim vs who manages post-approval | Role matrix + claim eligibility rules |
| No audit | Compliance, dispute resolution | Audit log + claim history |
| No notifications | Owner UX after submit/approve/reject | Email + in-app notification events |
| No duplicate handling | Data quality at scale | Duplicate detection + merge (Future) |
| No geo fields | Maps, nearby mosque discovery | lat/lng, timezone, map embed |
| Single-step ACTIVE | Trust boundary for public directory | Approve ownership → Activate listing (recommended) |
| No API contract | Integration risk | Full REST catalog + DTOs |
| No acceptance criteria | QA ambiguity | AC per feature |

---

## Functional Requirements

### FR-1 Public Mosque Profile Page
**Route:** `GET /mosque/{slug}` (SSR or CSR with SEO meta)

**Must display (when status permits public visibility):**
- Name, logo, banner, description
- Address (street, city, postcode, country)
- Contact: phone (click-to-call), email (mailto), website
- Social links (ordered, with platform icons)
- Enabled module sections only (Prayer Times widget, Events list, etc.)
- Map / directions link when coordinates exist
- Status-aware banners:
  - `UNCLAIMED`: “This listing has not been claimed” + Claim CTA (authenticated eligible users)
  - `CLAIM_PENDING` / `CLAIMED`: hidden or limited preview for non-staff (configurable)
  - `ACTIVE`: full public profile

**Must NOT expose:**
- Internal notes, audit logs, owner PII beyond public contact fields
- Disabled module content
- Draft/unverified claim documents

---

### FR-2 Mosque Profile Administration
Authorized users may create/update mosque profile fields (see Validation Rules).

**Capabilities:**
- Edit textual fields (name, description, address, contact)
- Upload/replace logo and banner (image validation, size limits, virus scan)
- Configure timezone (IANA)
- Manage social links
- View read-only status and ownership (non–Super Admin)
- Super Admin: edit status, reassign owner, force activate/deactivate

**Edit surfaces:**
- Mosque Owner: `/dashboard/owner/profile`
- Mosque Admin: `/dashboard/admin/mosque` or `/dashboard/mosque`
- Super Admin: `/dashboard/super/mosques/{id}/edit`

---

### FR-3 Super Admin Seeding
Super Admin may **manually create** mosque listings without an owner.

- Default status: `UNCLAIMED`
- Slug auto-generated from name if omitted (unique, URL-safe)
- Default module flags seeded per platform policy
- Listing immediately visible on public directory (unclaimed state) with Claim CTA

---

### FR-4 Claim Existing Listing
Eligible users submit an **ownership claim** against an `UNCLAIMED` mosque.

**Claim payload:**
- Claimant full name (editable; may differ from account display name)
- Email, phone (optional/required per policy)
- Position (Imam, Trustee, Committee Member, Director, etc.)
- Proof document (PDF/JPG/PNG, max size configurable)
- Optional message to reviewer

**On submit:**
- Create `mosque_ownership_claim` record (status `PENDING`)
- Transition mosque to `CLAIM_PENDING` (recommended) or `CLAIMED` (simplified MVP flag)
- Prevent duplicate pending claims by same user globally and per mosque

---

### FR-5 Manual Verification (MVP)
Super Admin reviews claims at **Claim Management** queue.

**Actions:**
- **Approve ownership:** assign `owner_id`, grant `Mosque Owner` + `Mosque Admin` roles, status → `CLAIMED`
- **Reject:** status → `UNCLAIMED`, clear `owner_id`, store rejection reason, notify claimant
- **Activate listing:** status `CLAIMED` → `ACTIVE` (public full access, modules live per flags)
- **Deactivate:** `ACTIVE` → `SUSPENDED` (hidden from public directory)
- **Archive:** soft-delete listing (retain audit trail)

**MVP recommendation:** Two-step trust model (Approve then Activate) — configurable `SingleStepActivation` platform flag for simpler deployments.

---

### FR-6 Module Feature Flags
Each mosque has independent toggles for platform modules.

**Default seed (new mosque):**

| ModuleKey | Default |
|-----------|---------|
| PrayerTimes | ON |
| Janaza | ON |
| NearbyMosqueDiscovery | ON |
| Announcements | OFF |
| Events | OFF |
| Donations | OFF |
| Madrassah | OFF |
| Communities | OFF |
| Awrad | OFF |
| Adhkar | OFF |
| Duas | OFF |
| Quran | OFF |
| RitualGuides | OFF |
| DeathReadings | OFF |
| Participation | OFF |
| JourneyGuides | OFF |

**Rules:**
- Disabled modules: hidden on public profile; admin routes return 403 or redirect
- Super Admin may override flags for any mosque
- Owner/Admin may toggle only flags allowed by platform policy (`OwnerConfigurableModules`)

---

### FR-7 Staff Assignment (MVP partial / PRD complete)
Mosque Owner may assign additional staff:
- Mosque Admin, Prayer Times Editor, Teacher, Content Editor (subset per platform)

---

### FR-8 Audit & Compliance
All material actions emit audit events (see Audit Logging).

---

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Availability | 99.9% monthly (profile read path) |
| NFR-2 | Public profile P95 latency | < 300 ms (cached slug lookup) |
| NFR-3 | Scale | 10,000+ mosques, 100k+ daily public profile views |
| NFR-4 | Multi-tenancy | Strict mosque_id scoping on all writes |
| NFR-5 | SEO | Server-rendered or pre-rendered meta; canonical slug URLs |
| NFR-6 | Accessibility | WCAG 2.1 AA on public profile |
| NFR-7 | Localization | en-GB MVP; i18n-ready field labels |
| NFR-8 | Data residency | UK/EU configurable (Future) |
| NFR-9 | Image CDN | Logo/banner served via CDN with cache headers |
| NFR-10 | Backup | Daily DB backup; claim documents replicated |

---

## Database Design

### Multi-tenant model
- **Logical tenant:** `mosques.id`
- **Row-level security:** all child tables include `mosque_id` FK
- **Platform tenant:** single MosqueOS deployment; Super Admin is global
- **Future:** optional `organization_id` for mosque groups/federations

### Entity Relationship (conceptual)

```
users ─────┬────< mosque_ownership_claims >──── mosques
           │                                      │
           └──── owner_id (nullable FK) ──────────┤
                                                  │
mosques ────< mosque_settings (module flags)      │
         ───< mosque_audit_logs                    │
         ───< mosque_staff_assignments (Future normalize)
```

### Table: `mosques`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT / INT | PK, identity | Surrogate key |
| name | NVARCHAR(200) | NOT NULL | Display name |
| slug | NVARCHAR(120) | NOT NULL, UNIQUE | URL-safe, immutable after ACTIVE (policy) |
| address | NVARCHAR(300) | NULL | Street |
| city | NVARCHAR(100) | NOT NULL | |
| postcode | NVARCHAR(20) | NULL | Country-specific validation |
| country | NVARCHAR(100) | NOT NULL, default 'United Kingdom' | ISO name |
| phone | NVARCHAR(30) | NULL | E.164 or local normalized |
| email | NVARCHAR(200) | NULL | Public contact |
| website | NVARCHAR(300) | NULL | HTTPS preferred |
| social_links | NVARCHAR(MAX) | NULL | JSON array (see schema below) |
| description | NVARCHAR(MAX) | NULL | Markdown subset or plain text |
| logo_url | NVARCHAR(500) | NULL | CDN path |
| banner_url | NVARCHAR(500) | NULL | CDN path |
| timezone | NVARCHAR(50) | NOT NULL, default 'Europe/London' | IANA |
| latitude | DECIMAL(9,6) | NULL | WGS84 |
| longitude | DECIMAL(9,6) | NULL | WGS84 |
| status | NVARCHAR(30) | NOT NULL | Enum (see workflow) |
| owner_id | NVARCHAR(450) | NULL, FK → users | Set on claim approval |
| is_deleted | BIT | NOT NULL, default 0 | Soft delete |
| created_at | DATETIME2 | NOT NULL | UTC |
| updated_at | DATETIME2 | NOT NULL | UTC |
| created_by | NVARCHAR(450) | NULL | User id or 'system' |
| version | ROWVERSION | | Optimistic concurrency |

**Indexes:**
- `UX_mosques_slug` (unique, filtered `is_deleted = 0`)
- `IX_mosques_status_city` (status, city) — admin filters
- `IX_mosques_owner_id` (owner_id) WHERE owner_id IS NOT NULL
- Full-text index on (name, city, description) — directory search (Future)

### `social_links` JSON schema

```json
{
  "links": [
    { "platform": "facebook", "url": "https://facebook.com/..." },
    { "platform": "instagram", "url": "https://instagram.com/..." },
    { "platform": "youtube", "url": "https://youtube.com/..." },
    { "platform": "whatsapp", "url": "https://wa.me/..." },
    { "platform": "x", "url": "https://x.com/..." },
    { "platform": "custom", "label": "Telegram", "url": "https://t.me/..." }
  ]
}
```

### Table: `mosque_settings`

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK |
| mosque_id | BIGINT | FK → mosques, NOT NULL |
| module_key | NVARCHAR(50) | NOT NULL |
| is_enabled | BIT | NOT NULL |
| updated_at | DATETIME2 | NOT NULL |
| updated_by | NVARCHAR(450) | NULL |

**Unique:** `(mosque_id, module_key)`

### Table: `mosque_ownership_claims`

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK |
| mosque_id | BIGINT | FK, NOT NULL |
| claimant_id | NVARCHAR(450) | FK → users, NOT NULL |
| full_name | NVARCHAR(200) | NOT NULL |
| email | NVARCHAR(200) | NULL |
| phone | NVARCHAR(30) | NULL |
| position | NVARCHAR(100) | NOT NULL |
| document_url | NVARCHAR(500) | NULL |
| status | NVARCHAR(20) | PENDING, APPROVED, REJECTED |
| rejection_reason | NVARCHAR(500) | NULL |
| reviewed_by_id | NVARCHAR(450) | NULL |
| reviewed_at | DATETIME2 | NULL |
| created_at | DATETIME2 | NOT NULL |

**Indexes:** `(mosque_id, status)`, `(claimant_id, status)`

### Table: `mosque_audit_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | PK |
| mosque_id | BIGINT | FK, NOT NULL |
| actor_id | NVARCHAR(450) | NULL |
| action | NVARCHAR(50) | NOT NULL |
| entity_type | NVARCHAR(50) | NOT NULL |
| entity_id | NVARCHAR(50) | NULL |
| summary | NVARCHAR(500) | NOT NULL |
| metadata_json | NVARCHAR(MAX) | NULL |
| ip_address | NVARCHAR(45) | NULL |
| created_at | DATETIME2 | NOT NULL |

**Retention:** 7 years (configurable); archive to cold storage after 24 months.

### Table: `mosque_staff_assignments` (normalized Future; partial MVP via Identity roles + home_mosque_id)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| mosque_id | FK | |
| user_id | FK | |
| role | NVARCHAR(50) | Mosque Admin, Teacher, etc. |
| assigned_by | FK | |
| assigned_at | DATETIME2 | |
| revoked_at | DATETIME2 | NULL |

---

## User Roles & Permissions

### Role matrix (Module 3.1)

| Action | Super Admin | Mosque Owner | Mosque Admin | Member | Guest |
|--------|:-----------:|:------------:|:------------:|:------:|:-----:|
| View public profile (ACTIVE/UNCLAIMED) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View pending profile (staff preview) | ✅ | ✅* | ✅* | ❌ | ❌ |
| Seed/create mosque | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit new listing (owner registration) | ❌ | ✅ | ❌ | ⚠️** | ❌ |
| Claim UNCLAIMED listing | ❌ | ✅ | ❌ | ⚠️** | ❌ |
| Edit mosque profile | ✅ | ✅† | ✅† | ❌ | ❌ |
| Upload logo/banner | ✅ | ✅† | ✅† | ❌ | ❌ |
| Toggle module flags | ✅ | ✅‡ | ✅‡ | ❌ | ❌ |
| Approve/reject claim | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activate/deactivate mosque | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign staff | ✅ | ✅† | ❌ | ❌ | ❌ |
| Delete/archive mosque | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅† (own mosque) | ❌ | ❌ | ❌ |

\* Only when mosque status is Claim Pending / Claimed and user is assigned owner/staff.  
\** Policy-configurable; **recommended PRD:** claim restricted to **Mosque Owner** role only.  
† Scoped to own mosque (`owner_id` match or `home_mosque_id` + role).  
‡ Subset of modules per platform policy.

### Authorization policies (ASP.NET)

| Policy | Roles / rules |
|--------|---------------|
| `MosqueProfile.ViewPublic` | Anonymous allowed |
| `MosqueProfile.Edit` | Super Admin OR (Owner/Admin + ownership handler) |
| `MosqueProfile.Claim` | Mosque Owner (recommended) |
| `MosqueProfile.Approve` | Super Admin |
| `MosqueProfile.Seed` | Super Admin |

### Ownership handler rules
- Super Admin: bypass ownership check for Edit
- Mosque Owner: `mosque.owner_id == user.id`
- Mosque Admin: `user.home_mosque_id == mosque.id` AND assigned Mosque Admin role
- Cross-mosque access: **deny by default**

---

## API Design (REST)

**Base:** `/api/v1`  
**Auth:** Bearer JWT (except public GETs)  
**Errors:** `{ "message": "..." }` or `{ "errors": ["..."] }`  
**Pagination:** `?page=&pageSize=` on list endpoints  
**Idempotency:** `Idempotency-Key` header on POST claim (Future)

### Public / directory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mosques` | Optional | Directory search (`city`, `name`, `status`) |
| GET | `/mosques/{slug}` | None | Public profile DTO |
| GET | `/mosques/slug/{slug}` | None | Alias |

**Public DTO fields:** exclude `owner_id`, internal status details; include `status` badge only if UNCLAIMED.

### Authenticated — mosque context

| Method | Path | Policy | Description |
|--------|------|--------|-------------|
| GET | `/mosques/my-mosque` | Authenticated staff | Owner/admin home mosque + completeness |
| GET | `/mosques/{id}` | Edit | Admin profile DTO |
| PUT | `/mosques/{id}` | Edit | Update profile |
| POST | `/mosques/{id}/upload-image?field=logo\|banner` | Edit | Multipart upload |
| GET | `/mosques/{id}/features` | Edit | Module flags |
| PUT | `/mosques/{id}/settings/{moduleKey}?enabled=true` | Edit | Toggle one module |
| POST | `/mosques/{id}/features` | Edit | Bulk update flags |
| GET | `/mosques/{id}/staff` | MosqueManagers | Staff list |
| POST | `/mosques/{id}/assign-staff` | Owner/SA | Assign role |
| DELETE | `/mosques/{id}/staff` | Owner/SA | Remove role |

### Seeding & claims

| Method | Path | Policy | Description |
|--------|------|--------|-------------|
| POST | `/mosques` | Seed | Super Admin create (status param) |
| POST | `/mosques/submit` | Claim | Owner registers new listing + auto-claim |
| POST | `/mosques/{id}/claim` | Claim | Claim unclaimed (JSON or multipart) |
| GET | `/mosques/{id}/claims` | MosqueManagers | Claim history |
| GET | `/platform/claims/pending` | Approve | Global pending queue |
| POST | `/platform/mosques/{id}/approve-claim` | Approve | Approve ownership |
| POST | `/platform/mosques/{id}/reject-claim` | Approve | Reject with reason |
| POST | `/platform/mosques/{id}/activate` | Approve | CLAIMED → ACTIVE |
| POST | `/platform/mosques/{id}/deactivate` | Approve | ACTIVE → SUSPENDED |
| DELETE | `/mosques/{id}` | Seed | Soft delete |

### DTOs (summary)

**MosquePublicDto:** id, name, slug, address, city, postcode, country, phone, email, website, socialLinks, description, logoUrl, bannerUrl, timezone, status (public-safe), enabledModules[]

**MosqueAdminProfileDto:** all fields + ownerId, createdAt, updatedAt, profileCompleteness, missingFields[]

**ClaimMosqueRequest:** fullName, email, phone, position, document (file)

**MosqueCreateDto:** name, slug?, address, city, postcode, country, phone, email, website, socialLinks, description, timezone, status?

---

## Business Rules

### BR-1 Slug uniqueness
- Slugs are globally unique among non-deleted mosques.
- Auto-generate from name; append `-2`, `-3` on collision.
- After status = ACTIVE, slug change requires Super Admin or triggers 301 redirect table (Future).

### BR-2 Public visibility

| Status | Public directory | Full profile page |
|--------|------------------|-------------------|
| UNCLAIMED | ✅ | ✅ + Claim CTA |
| CLAIM_PENDING | ❌ or teaser | Owner/staff preview only (recommended) |
| CLAIMED | ❌ | Owner/staff preview |
| ACTIVE | ✅ | ✅ full |
| SUSPENDED | ❌ | 404 or suspended message |
| ARCHIVED | ❌ | 404 |
| PENDING_REVIEW | ❌ | Submitter preview only |

### BR-3 One pending claim per user
A user may have at most **one** `PENDING` ownership claim across the platform.

### BR-4 One pending claim per mosque
A mosque may have at most **one** `PENDING` claim at a time.

### BR-5 Claim eligibility
- Mosque must be `UNCLAIMED`.
- User must not already own another ACTIVE mosque (configurable `AllowMultiMosqueOwnership` — default false for MVP).

### BR-6 Approval effects
On approve:
- Set `owner_id = claimant_id`
- Add roles: Mosque Owner, Mosque Admin
- Set `user.home_mosque_id = mosque.id`
- Status → CLAIMED (awaiting activation)

### BR-7 Rejection effects
On reject:
- Claim → REJECTED
- If mosque was CLAIM_PENDING → UNCLAIMED
- Clear `owner_id` if set
- Clear claimant `home_mosque_id` if pointing to this mosque

### BR-8 Activation gate
Activation requires:
- Status = CLAIMED (or SUSPENDED for re-activation)
- `owner_id` NOT NULL
- No PENDING claims
- Profile completeness ≥ configurable threshold (e.g. 60%: name, city, address, phone OR email)

### BR-9 Module gating
If module disabled:
- Public profile section hidden
- API modules return 403 or empty state
- Admin sidebar hides disabled modules (optional UX)

### BR-10 Duplicate detection (recommended)
On seed/claim/submit: warn if similar name + postcode or name + city exists (Levenshtein / trigram).

### BR-11 Image assets
- Max logo: 2 MB; banner: 5 MB
- Formats: JPEG, PNG, WebP
- Strip EXIF; generate thumbnails (Future)

### BR-12 Timezone
Must be valid IANA timezone; used by Prayer Times module.

---

## Validation Rules

| Field | Required | Rules |
|-------|----------|-------|
| name | Yes (create) | Min 3, max 200; no-only-whitespace |
| slug | Yes (create) | `^[a-z0-9]+(-[a-z0-9]+)*$`, max 120, unique |
| city | Yes | Min 2, max 100 |
| address | No | Max 300 |
| postcode | No | UK: valid outward/inward pattern if country=UK |
| country | Yes | From allowed list or ISO-3166 |
| phone | No | If present: E.164 or UK local normalized |
| email | No | RFC 5322 subset; lowercase stored |
| website | No | Valid URL; http/https; max 300 |
| social_links | No | Valid JSON schema; each URL https preferred |
| description | No | Max 5000; strip script tags |
| logo_url / banner_url | No | Internal path or CDN URL only (no arbitrary SSRF) |
| timezone | Yes | IANA tz database validation |
| latitude | No | -90 to 90 |
| longitude | No | -180 to 180 |
| claim.fullName | Yes | Min 2, max 200 |
| claim.position | Yes | Enum list |
| claim.phone | Conditional | UK format if country UK |
| claim.document | No | PDF/JPG/PNG; max 10 MB |
| reject.reason | Yes (reject) | Min 10, max 500 |

---

## Security Requirements

### SEC-1 Authentication
- JWT for API; refresh token rotation (platform standard)
- Public GET `/mosques/{slug}` — no auth; rate limited

### SEC-2 Authorization
- Policy-based + resource ownership handler
- Never trust client-sent `owner_id` on create/claim
- Super Admin actions require MFA (Future platform setting)

### SEC-3 Input sanitization
- HTML escape on description display; CSP on public pages
- File upload: content-type sniffing, size limits, isolated storage path

### SEC-4 IDOR prevention
- All `{id}` routes validate mosque scope via ownership handler
- Claim documents accessible only to claimant + Super Admin

### SEC-5 Rate limiting
- Claim submit: 5/hour/user
- Public search: 60/min/IP
- Upload: 20/hour/mosque

### SEC-6 Audit
- Log all status transitions, profile updates, claim decisions
- Include actor, IP, correlation id

### SEC-7 PII
- Claim documents encrypted at rest (AES-256)
- GDPR: export/delete user data cascades claims (Future DPA module)

### SEC-8 CORS / CSRF
- SPA: Bearer token; no cookie session for API
- Same-site cookies if SSR forms added

---

## Workflows

### Status enum (canonical)

| Code | Label | Description |
|------|-------|-------------|
| UNCLAIMED | Unclaimed | Seeded, no owner |
| CLAIM_PENDING | Claim pending | Claim submitted, awaiting review |
| CLAIMED | Claim approved | Owner assigned, not yet public-active |
| ACTIVE | Active | Live on directory |
| PENDING_REVIEW | Pending review | New listing submitted by owner (not seeded) |
| SUSPENDED | Suspended | Deactivated by Super Admin |
| ARCHIVED | Archived | Soft deleted |

**Simplified client view (3-state):** UNCLAIMED → (pending) → CLAIMED → ACTIVE

### State transition matrix

```
                    ┌─────────────────────────────────────────┐
                    │              UNCLAIMED                   │
                    └───────────────┬─────────────────────────┘
                                    │ claim submitted
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │           CLAIM_PENDING                  │
                    └───────┬─────────────────────┬───────────┘
                            │ approve             │ reject
                            ▼                     ▼
                    ┌───────────────┐      ┌───────────────┐
                    │   CLAIMED     │      │  UNCLAIMED    │
                    └───────┬───────┘      └───────────────┘
                            │ activate
                            ▼
                    ┌───────────────┐
                    │    ACTIVE     │◄──── re-activate
                    └───────┬───────┘
                            │ deactivate
                            ▼
                    ┌───────────────┐
                    │  SUSPENDED    │
                    └───────────────┘

PENDING_REVIEW ──approve──► CLAIMED (new listing path)
Any ──archive──► ARCHIVED (Super Admin)
```

### Sequence: Super Admin seeds mosque

```
SuperAdmin -> UI: Fill "Add mosque" form
UI -> API: POST /mosques { name, city, slug, status: UNCLAIMED }
API -> DB: INSERT mosques, seed mosque_settings
API -> Audit: MOSQUE_CREATED
API --> UI: 201 { id, slug }
UI --> SuperAdmin: Show public URL /mosque/{slug}
```

### Sequence: User claims unclaimed mosque

```
Owner -> PublicProfile: Click "Claim this mosque"
PublicProfile -> UI: Show claim form (name, email, position, document)
Owner -> UI: Submit
UI -> API: POST /mosques/{id}/claim (SKIP global 403 redirect)
API -> Auth: Policy MosqueProfile.Claim
API -> DB: INSERT claim PENDING; UPDATE mosque CLAIM_PENDING
API -> Notify: Email SuperAdmin + in-app queue
API -> Audit: CLAIM_SUBMITTED
API --> UI: 200 { message, mosque }
UI --> Owner: "Awaiting verification"
```

### Sequence: Super Admin approves and activates

```
SuperAdmin -> ClaimsQueue: Review claim + document
SuperAdmin -> UI: Approve
UI -> API: POST /platform/mosques/{id}/approve-claim
API -> DB: claim APPROVED; mosque CLAIMED; owner_id set; roles assigned
API -> Notify: Email Owner (approved)
API -> Audit: CLAIM_APPROVED

SuperAdmin -> UI: Activate mosque
UI -> API: POST /platform/mosques/{id}/activate
API -> DB: mosque ACTIVE
API -> Notify: Email Owner (live)
API -> Audit: MOSQUE_ACTIVATED
```

### Sequence: Public profile read

```
Visitor -> CDN/Web: GET /mosque/{slug}
Web -> API: GET /mosques/{slug}
API -> Cache: Redis slug:{slug} (TTL 5m)
API -> DB: mosque + settings (if miss)
API --> Web: MosquePublicDto
Web --> Visitor: Render enabled sections only
```

---

## Notifications & Approval Workflows

| Event | Email | In-app | Recipient |
|-------|-------|--------|-----------|
| Claim submitted | ✅ | ✅ | Super Admin |
| Claim approved | ✅ | ✅ | Owner |
| Claim rejected | ✅ | ✅ | Claimant (with reason) |
| Mosque activated | ✅ | ✅ | Owner |
| Mosque deactivated | ✅ | ✅ | Owner + Admins |
| Profile completeness < threshold | ❌ | ✅ | Owner (nudge) |
| Module flag changed | ❌ | ✅ | Owner (optional) |

**Approval SLA (operational):** target 48h MVP; dashboard shows aging claims.

---

## Audit Logging Requirements

| Action code | Trigger |
|-------------|---------|
| MOSQUE_CREATED | Seed/submit |
| MOSQUE_UPDATED | Profile PUT |
| MOSQUE_STATUS_CHANGED | Any status transition |
| CLAIM_SUBMITTED | POST claim |
| CLAIM_APPROVED | approve-claim |
| CLAIM_REJECTED | reject-claim |
| MOSQUE_ACTIVATED | activate |
| MOSQUE_DEACTIVATED | deactivate |
| MOSQUE_ARCHIVED | delete |
| MODULE_FLAG_CHANGED | settings PUT |
| IMAGE_UPLOADED | upload-image |
| STAFF_ASSIGNED | assign-staff |
| STAFF_REMOVED | delete staff |

**Log fields:** timestamp (UTC), actor_id, mosque_id, action, summary, metadata_json (diff), ip, user_agent, correlation_id

**UI:** Super Admin mosque detail → Audit tab; export CSV (Future).

---

## Acceptance Criteria

### AC-1 Public profile
- [ ] Given ACTIVE mosque, when visitor opens `/mosque/{slug}`, then name, logo, description, contact, enabled modules render within 2s P95.
- [ ] Given UNCLAIMED mosque, Claim CTA visible to eligible authenticated users only.
- [ ] Given SUSPENDED mosque, public returns 404 or suspended page (configurable).
- [ ] SEO meta title = mosque name; description = truncated profile text.

### AC-2 Admin edit
- [ ] Owner can update all editable fields and save; changes reflect on public profile after ACTIVE.
- [ ] Non-owner receives 403 on PUT `/mosques/{id}`.
- [ ] Logo upload updates `logo_url` and displays on public profile.

### AC-3 Super Admin seed
- [ ] POST `/mosques` creates UNCLAIMED listing with unique slug and default module flags.
- [ ] Public profile accessible immediately for UNCLAIMED.

### AC-4 Claim
- [ ] Claim form name/email editable; submitted values stored on claim record.
- [ ] Duplicate pending claim returns 409.
- [ ] Document upload optional; invalid type returns 400.
- [ ] Super Admin cannot submit claim (UI hidden + API 403).

### AC-5 Verification
- [ ] Approve assigns owner_id and roles.
- [ ] Reject returns mosque to UNCLAIMED and notifies claimant with reason.
- [ ] Activate requires CLAIMED + owner_id; sets ACTIVE.
- [ ] Claims queue lists all PENDING with filters.

### AC-6 Feature flags
- [ ] Disabling Events hides Events on public profile and admin nav.
- [ ] Toggle persists per mosque; other mosques unaffected.
- [ ] New mosque receives default seed flags.

### AC-7 Security
- [ ] IDOR attempt on foreign mosque id returns 403.
- [ ] Claim 403 does not redirect to generic unauthorized page (inline error).
- [ ] Audit log entry for every status change.

### AC-8 Scale
- [ ] Directory search paginated; 10k mosques list loads < 1s with indexes.
- [ ] Slug lookup cached; cache invalidated on profile update.

---

## User Stories

| ID | As a… | I want to… | So that… |
|----|-------|------------|----------|
| US-1 | Visitor | view a mosque public profile | I can find prayer times and contact info |
| US-2 | Mosque Owner | claim an unclaimed listing | my mosque is represented accurately |
| US-3 | Mosque Owner | edit profile and upload branding | our community recognizes us |
| US-4 | Super Admin | seed mosques manually | the directory has coverage before owners join |
| US-5 | Super Admin | approve/reject claims | only verified representatives manage listings |
| US-6 | Super Admin | activate a mosque | it goes live on the public directory |
| US-7 | Mosque Owner | enable/disable modules | we only use relevant features |
| US-8 | Mosque Owner | assign a Mosque Admin | others can help manage operations |
| US-9 | Member | discover mosques by city | I can find my local masjid |
| US-10 | Super Admin | view audit history | disputes and compliance are traceable |

---

## Use Cases

### UC-1 Browse public mosque
**Actor:** Guest  
**Pre:** Mosque ACTIVE  
**Flow:** Open slug URL → view profile → optional navigate to prayer times  
**Post:** Analytics event `profile_view`

### UC-2 Claim mosque
**Actor:** Mosque Owner  
**Pre:** Mosque UNCLAIMED, user authenticated, no pending claim  
**Flow:** Login → public profile → fill claim → upload proof → submit  
**Alt:** Validation fail → inline errors  
**Post:** Status CLAIM_PENDING, notification sent

### UC-3 Approve claim
**Actor:** Super Admin  
**Pre:** Pending claim exists  
**Flow:** Open queue → review document → approve → activate  
**Alt:** Reject with reason  
**Post:** Owner has dashboard access; mosque ACTIVE

### UC-4 Configure modules
**Actor:** Mosque Owner  
**Pre:** Mosque ACTIVE  
**Flow:** Settings → toggle modules → save  
**Post:** Public profile sections update

---

## UI/UX Screens

| Screen | Route | Primary actors |
|--------|-------|----------------|
| Public mosque profile | `/mosque/{slug}` | All |
| Login / Register (owner) | `/auth/login`, `/auth/register` | Owner |
| Owner verification wizard | `/dashboard/owner/verification` | Owner |
| Owner profile editor | `/dashboard/owner/profile` | Owner |
| Owner module settings | `/dashboard/owner/settings` | Owner |
| Owner staff management | `/dashboard/owner/staff` | Owner |
| Mosque Admin profile | `/dashboard/admin/mosque` | Mosque Admin |
| Super Admin listings | `/dashboard/super/mosques` | Super Admin |
| Super Admin mosque detail | `/dashboard/super/mosques/{id}` | Super Admin |
| Super Admin mosque edit | `/dashboard/super/mosques/{id}/edit` | Super Admin |
| Claim management queue | `/dashboard/super/claims` | Super Admin |
| Platform features (global) | `/dashboard/super/features` | Super Admin |
| Unauthorized | `/unauthorized` | All |
| Mosque not found | `/mosque-not-found` | All |

**UX components:**
- Traffic-light status indicator (Unclaimed / Pending / Active)
- Profile completeness meter
- Claim form with editable identity fields
- Super Admin “Approve & Activate” combined action (recommended)
- Owner onboarding stepper (claim → approved → profile → modules → live)

---

## MVP Scope

### In MVP ✅
- Public profile `/mosque/{slug}`
- Full profile CRUD for authorized roles
- Super Admin seed (UNCLAIMED default)
- Claim with proof document
- Manual approve / reject / activate
- Two-step approve → activate (trust model)
- Per-mosque module feature flags
- Basic audit logging
- Email notifications (claim lifecycle)
- RBAC policies + ownership handler
- Slug uniqueness + validation
- Logo/banner upload
- Staff assign (Owner → Mosque Admin)
- Status indicator in admin UI
- Demo seed data

### Deferred (Future) 🔮
- Automatic verification (OCR, Companies House, charity registry)
- Ownership transfer workflow
- Multi-mosque ownership per user
- Slug change with 301 redirects
- Duplicate merge tool
- Federation / organization layer above mosque
- Public profile SSR/ISR at edge
- Advanced analytics (profile views, claim funnel)
- Paid plans / feature gating by subscription tier
- WhatsApp/SMS notifications
- GDPR self-service data export
- Multi-language profile fields
- Custom domains per mosque (`masjid.example.com`)
- Webhook events for third-party integrations
- Geo-spatial search (PostGIS)

---

## Performance & Scalability

| Layer | Recommendation |
|-------|----------------|
| Read path | Redis cache keyed by `slug`; CDN for static assets |
| Search | Elasticsearch/OpenSearch for name+city fuzzy search at 10k+ scale |
| Writes | Optimistic concurrency (`version` column) on mosque UPDATE |
| Files | Object storage (S3/Azure Blob) + CDN; not local wwwroot in prod |
| DB | Read replica for directory queries; mosque_id partitioning at 100k+ |
| API | Horizontal pod autoscaling; stateless API tier |
| Events | Domain events (`MosqueActivated`) via message bus for downstream modules |

---

## Risks & Implementation Challenges

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fraudulent claims | High | Manual review + proof doc; Future automated checks |
| Duplicate listings | Medium | Duplicate detection on seed/claim; merge tool Future |
| Slug squatting | Low | Super Admin reclaim; slug hold period |
| Status confusion (7 states) | Medium | UI labels + simplified 3-state client view |
| IDOR on mosque id routes | High | Ownership handler + automated security tests |
| Large image uploads | Medium | Size limits, CDN, async processing |
| Cross-mosque data leak | Critical | mosque_id on all queries; integration tests per module |
| Claim document storage | Medium | Encrypted blob storage; access ACL |
| Email deliverability | Medium | SPF/DKIM; dev OTP fallback |
| Two-step activate confusion | Medium | Combined “Approve & Activate” button; owner wizard |

---

## Final Architecture Recommendation

### Recommended stack alignment (MosqueOS current + target)

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular SPA (tenant-aware UI)          │
│  PublicModule │ OwnerModule │ AdminModule │ SuperModule      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS /api/v1
┌───────────────────────────▼─────────────────────────────────┐
│              ASP.NET Core API (stateless, policy RBAC)       │
│  MosquesController │ PlatformController │ OwnershipHandler     │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
     ┌──────▼──────┐               ┌──────▼──────┐
     │  SQL Server │               │ Redis Cache │
     │  (tenants)  │               │ slug index  │
     └─────────────┘               └─────────────┘
            │
     ┌──────▼──────┐
     │ Blob Storage│  logos, banners, claim docs
     └─────────────┘
```

### Domain services (keep logic out of controllers)
- `MosqueProfileService` — CRUD, completeness scoring
- `OwnershipClaimService` — approve/reject/activate (exists)
- `MosqueModuleSeedService` — default flags (exists)
- `MosqueSlugService` — normalize, uniquify (exists)
- `MosqueAuditService` — centralized audit writes
- `MosqueNotificationService` — email/in-app dispatch

### Multi-tenant discipline (mandatory for all modules)
1. Every query filtering content modules MUST include `mosque_id`.
2. JWT may carry `home_mosque_id` but **never** trust it without role + ownership validation.
3. Feature flags checked at API boundary AND UI (defense in depth).
4. Public DTOs are a strict subset — separate from Admin DTOs.

### Implementation priority (engineering backlog)

| Priority | Item |
|----------|------|
| P0 | Align claim role policy (Owner-only vs Member) with product decision |
| P0 | Combined Approve & Activate UX |
| P0 | Dedicated public profile component (decouple from demo) |
| P1 | `social_links` JSON migration from facebook/instagram columns |
| P1 | Profile completeness gate before activation |
| P1 | Redis slug cache + cache bust on update |
| P2 | Duplicate detection warnings |
| P2 | Normalized staff assignments table |
| P2 | Audit export + owner-visible audit subset |
| P3 | SSR/SEO enhancement; OpenSearch directory |

---

## Appendix A — Mapping to current MosqueOS implementation

| PRD item | Current codebase | Gap |
|----------|------------------|-----|
| Public `/mosque/{slug}` | `DemoMosqueComponent` | Rename/split dedicated public component |
| Status workflow | 7 statuses implemented | Document UI labels |
| Claim | `POST /mosques/{id}/claim` | Phone field on public form optional |
| Approve/Activate | Separate endpoints | Add combined UX |
| Feature flags | `MosqueSetting` + seed service | Grouped admin UI |
| RBAC | `MosqueProfilePolicies` + guards | Member claim policy decision |
| Audit | Partial (`LogMosqueAuditAsync`) | Unified audit service |
| social_links JSON | Facebook/Instagram columns only | Migration needed |

---

## Appendix B — Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | — | Product | Original module spec |
| 2.0 | 2026-06-17 | PRD | Enterprise expansion, workflows, AC, architecture |

---

*End of Module 3.1 Mosque Profile PRD*
