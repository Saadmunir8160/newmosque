# MosqueOS — Architecture

## Stack (as implemented)

| Layer | Technology |
|-------|------------|
| Frontend | Angular 17 (standalone components, RxJS) |
| API | ASP.NET Core Web API (`/api/v1/`) |
| Auth | ASP.NET Core Identity + JWT Bearer |
| ORM | Entity Framework Core — **Code First** |
| Database | **SQL Server Express** (`mos_db`) — not PostgreSQL |
| Pattern | **Clean Architecture** + **Repository Pattern** + **Unit of Work** |

## Solution structure

```
backend/
  MosqueOS.API/           → Controllers, Models (DTOs), Program.cs
  MosqueOS.Application/     → Interfaces (IRepository, IUnitOfWork, IJwtTokenService)
  MosqueOS.Domain/          → Entities, Enums, Constants (Roles)
  MosqueOS.Infrastructure/  → DbContext, Migrations, Repositories, DataSeeder, Services
frontend/                   → Angular app (modules per feature)
```

## Dependency flow

```
API → Application (interfaces) ← Infrastructure (implementations)
API → Domain (entities referenced in DTOs/responses)
Infrastructure → Domain
```

API must **not** reference Infrastructure types in controllers except via DI interfaces.

## Repository pattern

```csharp
// Controller
public class AdhkarController(IUnitOfWork unitOfWork) : ControllerBase
{
    var items = await unitOfWork.Repository<AdhkarItem>().QueryNoTracking()...
    await unitOfWork.SaveChangesAsync();
}
```

## Code First workflow

1. Edit entity in `MosqueOS.Domain/Entities/`
2. Add migration: `dotnet ef migrations add <Name> --project MosqueOS.Infrastructure --startup-project MosqueOS.API`
3. Apply: `dotnet ef database update` (or auto on startup via `DataSeeder.MigrateAsync()`)

## Requirements alignment

See TRD modules 3.1–3.15. All modules have backend controllers and EF entities.  
Database engine differs from TRD (PostgreSQL → SQL Express); all other patterns match.
