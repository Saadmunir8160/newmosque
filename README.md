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

## Demo credentials

| User | Password | Role |
|------|----------|------|
| admin | Admin@123 | Super Admin |
| mosqueadmin | Mosque@123 | Mosque Admin |
| member | Member@123 | Member |

## Features

- Live prayer times & Jumuah countdown
- Guest browsing (limited menu)
- Announcements, events, janaza
- Madrassah & community modules
- Responsive web app (mobile-friendly)
