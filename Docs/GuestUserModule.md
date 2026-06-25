# Guest User Module

Public read-only access to mosque information **without registration**.

## How to browse

1. Open the landing page → **Browse as Guest**, or
2. `/welcome` → **Continue as a guest**, or
3. Navigate directly to `/dashboard/guest` (requires guest session via dashboard guard)

Guest mode stores a session flag in `sessionStorage` — no account is created.

## Sidebar

| Section | Pages |
|---------|--------|
| Browse | Home, Prayer Times, Announcements, Events, Janaza, Communities |
| Content | Duas, Adhkar, Ritual Guides, Umrah & Hajj |
| Account | Login, Register |

## Features (read-only)

- **Home** — mosque profile, today's prayer times, latest announcements, upcoming events
- **Prayer times** — daily jamaat table + monthly timetable
- **Events** — list and detail (no registration)
- **Janaza** — active notices (`JanazaDate >= today`)
- **Communities** — public listing only (login required to join)
- **Duas / Adhkar** — published content only
- **Ritual & journey guides** — step-by-step public guides

## Cannot (members only)

- Register for events
- Join communities
- Track wird / adhkar progress
- Edit profile

## Public API (`/api/v1/public`)

All endpoints are `[AllowAnonymous]`:

| Endpoint | Description |
|----------|-------------|
| `GET /home?mosqueId=` | Aggregated guest home |
| `GET /mosques/{id}` | Mosque summary |
| `GET /mosques/by-slug/{slug}` | Mosque by slug |
| `GET /mosques/{id}/prayer-times/daily` | Published daily times |
| `GET /mosques/{id}/prayer-times/monthly` | Monthly published timetable |
| `GET /mosques/{id}/announcements` | Published announcements |
| `GET /mosques/{id}/events` | Scheduled events |
| `GET /mosques/{id}/events/{id}` | Event detail |
| `GET /mosques/{id}/janaza?activeOnly=true` | Active janaza |
| `GET /communities?mosqueId=` | Public communities |
| `GET /duas`, `/adhkar` | Published spiritual content |
| `GET /ritual-guides`, `/journey-guides` | Public guides |

## Frontend

- Lazy routes: `modules/guest/guest.routes.ts`
- Service: `guest.service.ts`
- SEO: `seo.service.ts` (per-page title, description, Open Graph)
- Nav: `guest-nav.config.ts`
- Login CTA: `guest-login-cta.component.ts` on restricted actions

## SEO

- Default meta tags in `index.html`
- Each guest page sets `<title>`, `description`, `og:title`, `og:description` via `SeoService`
- Semantic headings (`h1`/`h2`) on all public pages
