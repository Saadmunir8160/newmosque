# MosqueOS — Client Delivery Checklist

## Database
- [x] EF Core **Code First** migrations (`MosqueOS.Infrastructure/Migrations/`)
- [x] **SQL Server Express** (`mos_db` on `.\SQLEXPRESS`) — SSMS verified
- [x] Repository Pattern + Unit of Work (`IRepository<T>`, `IUnitOfWork`)
- [x] Clean Architecture (API / Application / Domain / Infrastructure)
- [ ] `Database/MosqueOS.sql` — optional manual script (migrations are primary)

## Diagrams
- [ ] `Diagrams/ERD.png` — Entity Relationship Diagram
- [ ] `Diagrams/DatabaseFlow.png` — Database Flow Diagram
- [ ] `Diagrams/Architecture.png` — System Architecture Diagram

## Documentation
- [ ] `Docs/DatabaseDocumentation.pdf` — Full database documentation
- [ ] Tables documented with columns, types, and constraints
- [ ] Relationships and business rules documented

## Repository
- [ ] `README.md` — Setup and project overview included
- [ ] GitHub repository created and set to correct visibility
- [ ] All folders committed and pushed (Database, Diagrams, Docs)
- [ ] Repository link tested and accessible

## Code
- [ ] Backend (ASP.NET Core API) pushed to repository
- [ ] Frontend (Angular) pushed to repository
- [ ] `appsettings.json` does NOT contain production secrets
- [ ] `.gitignore` covers `bin/`, `obj/`, `node_modules/`

## Final Handover
- [ ] Client has received the GitHub repository link
- [ ] Client has received database restore instructions
- [ ] Default credentials communicated securely to client
- [ ] Client confirmed access to repository
