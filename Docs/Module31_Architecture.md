# Module 3.1 — Architecture & ERD

## System architecture

```mermaid
flowchart TB
  subgraph Client
    A[Angular SPA<br/>localhost:4200]
  end
  subgraph API["ASP.NET Core API"]
    C[Controllers]
    S[Services<br/>Claims · Registration · Audit · Notifications]
    Cache[IDistributedCache<br/>Memory or Redis]
    Store[IFileStorageService<br/>Local wwwroot]
  end
  subgraph Data
    DB[(SQL Server<br/>mos_db)]
  end
  A -->|JWT / anonymous public| C
  C --> S
  S --> Cache
  S --> Store
  S --> DB
```

## Status lifecycle

```mermaid
stateDiagram-v2
  [*] --> Unclaimed: Seed / discovery
  Unclaimed --> ClaimPending: Claim submitted
  ClaimPending --> Claimed: Super Admin approve
  Claimed --> Active: Super Admin activate
  Active --> Claimed: Deactivate
  Unclaimed --> Claimed: Registration approve
```

## Core ERD (Module 3.1)

```mermaid
erDiagram
  AspNetUsers ||--o{ MosqueOwnershipClaims : submits
  Mosques ||--o{ MosqueOwnershipClaims : claimed
  Mosques ||--o{ MosqueSettings : flags
  AspNetUsers ||--o{ MosqueRegistrationRequests : submits
  AspNetUsers ||--o{ UserNotifications : receives
  Mosques ||--o{ PlatformAuditLogs : "TargetType=Mosque"
  Mosques {
    int Id PK
    string Slug
    string Status
    string OwnerId FK
    string SocialLinksJson
  }
  MosqueOwnershipClaims {
    int Id PK
    int MosqueId FK
    string ClaimantId FK
    string Status
    string ClaimReference
  }
  MosqueRegistrationRequests {
    int Id PK
    string SubmittedById FK
    string Status
  }
  UserNotifications {
    int Id PK
    string UserId FK
    string Type
    bool IsRead
  }
  MosqueSettings {
    int Id PK
    int MosqueId FK
    string ModuleKey
    bool IsEnabled
  }
```

## Production notes (Milestone 9)

| Concern | Implementation |
|---------|----------------|
| Public profile latency | `MosquePublicProfileCache` (60s TTL) + `Cache-Control` |
| Redis | Set `ConnectionStrings:Redis`; otherwise in-memory distributed cache |
| Claim abuse | Rate limit policy `claim-submit` — 5/hour/user |
| Media | `IFileStorageService` → local `wwwroot/uploads`; Azure via future SDK |
| SEO | Client meta/OG/canonical on public profile; full Angular SSR deferred |
