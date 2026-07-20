# MosqueOS — Client Delivery Checklist

## Database
- [x] EF Core **Code First** migrations (`MosqueOS.Infrastructure/Migrations/`)
- [x] **SQL Server Express** (`mos_db` on `.\SQLEXPRESS`) — SSMS verified
- [x] Repository Pattern + Unit of Work (`IRepository<T>`, `IUnitOfWork`)
- [x] Clean Architecture (API / Application / Domain / Infrastructure)
- [x] Optional T-SQL script link: `backend/scripts/mos_db_tsql.sql` (migrations are primary)
- [x] Schema notes: [DatabaseSchema.md](./DatabaseSchema.md)

## Diagrams
- [x] Architecture (mermaid): [Module31_Architecture.md](./Module31_Architecture.md)
- [x] ERD (mermaid): same doc — Mosque Profile / Claims / Registrations / Notifications
- [ ] Export PNG copies to `Diagrams/` when packaging for client (optional handout)

## Documentation
- [x] [MosqueProfileModule.md](./MosqueProfileModule.md) — Module 3.1 status vs implementation
- [x] [Module31_Verification.md](./Module31_Verification.md) — demo script + credentials
- [x] [Module31_Architecture.md](./Module31_Architecture.md) — architecture + ERD
- [x] [DatabaseSchema.md](./DatabaseSchema.md) — key tables / columns / rules
- [ ] `Docs/DatabaseDocumentation.pdf` — generate from schema doc if client requires PDF

## Repository
- [x] `README.md` — setup, Module 3.1 test flow, demo credentials
- [ ] GitHub repository created and set to correct visibility (client ops)
- [ ] All folders committed and pushed (exclude secrets, `wwwroot/uploads` binaries if large)
- [ ] Repository link tested and accessible

## Code
- [x] Backend (ASP.NET Core API)
- [x] Frontend (Angular)
- [x] `appsettings.json` does NOT contain production secrets (JWT/SMTP blanks or local-only defaults)
- [x] Use `appsettings.Local.json` (gitignored if present) for machine secrets
- [x] `.gitignore` covers `bin/`, `obj/`, `node_modules/`

## Module 3.1 hardening (Milestones 9–10)
- [x] Public slug profile cache (`IDistributedCache` — memory default, Redis when `ConnectionStrings:Redis` set)
- [x] Claim / registration rate limit (5 / hour / user)
- [x] `IFileStorageService` local storage abstraction (Azure SDK wiring documented)
- [x] Public SEO meta + canonical on `/mosque/{slug}` (full SSR deferred)
- [x] Upload static assets `Cache-Control` headers

## Final Handover
- [ ] Client has received the GitHub repository link
- [ ] Client has received database restore instructions (`dotnet ef database update` or SSMS)
- [ ] Default credentials communicated securely to client
- [ ] Client confirmed access to repository
