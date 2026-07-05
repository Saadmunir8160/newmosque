# Content Editor Module

Manage Islamic content across awrad, duas, adhkar, library items, and media with a **Draft → In Review → Approved → Published** workflow.

## Demo login

| User | Password | Role |
|------|----------|------|
| `editor` | `Editor@123` | Content Editor |

## Sidebar

- Dashboard
- Awrad
- Duas
- Adhkar
- Library (PDFs, articles, books)
- Media Uploads (audio, images, videos)
- Content Reviews

## Permissions

| Code | Purpose |
|------|---------|
| `content.manage` | Create and edit content |
| `content.review` | Approve or send back from review |
| `content.publish` | Publish approved content |

Assigned to **Content Editor** role only (manage content — no mosque admin permissions).

## API (`/api/v1/content-editor`)

| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Counts + workflow stats + recent activity |
| `GET /reviews` | Queue by status (default: InReview) |
| `POST /workflow` | Transition entity status |
| `GET/POST/PUT /duas` | Editor duas CRUD (all statuses) |
| `GET/POST/PUT /adhkar` | Editor adhkar CRUD |
| `GET/POST/PUT /awrad/collections` | Editor awrad collections |
| `GET/POST/PUT/DELETE /articles` | Library items |
| `GET /media` | List uploads |
| `POST /media/upload` | Multipart file upload |
| `DELETE /media/{id}` | Remove file + record |

Public member APIs (`/duas`, `/adhkar`, `/awrad`) return **Published** content only.

## Database

Migration: `20260617200000_AddContentEditorModule`

- Workflow columns on `Duas`, `AdhkarItems`, `ContentItems`, `WirdCollections`
- `ContentArticles` — library (Article, Pdf, Book)
- `MediaAssets` — uploaded files metadata
- `ContentWorkflowLogs` — audit trail

SQL script: `backend/scripts/content-editor-module.sql`

## Frontend

- Lazy routes: `frontend/src/app/modules/content/content.routes.ts`
- Nav: `content-editor-nav.config.ts`
- Service: `content-editor.service.ts`
- Shared workflow UI: `content-workflow-bar.component.ts`

## Workflow

```
Draft → In Review → Approved → Published
         ↓ send back
        Draft

Published → Unpublished → Draft (revise)
```
