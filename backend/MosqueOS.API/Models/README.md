# API Models

Typed request/response contracts for MosqueOS API controllers.

## Structure

- `Common/` — shared responses (`ApiMessageResponse`, `ApiCountResponse`, `ApiErrorResponse`)
- `Auth/` — login, register, preferences, current user
- `Mosques/` — owner mosque profile, staff assignment, claims
- `Platform/` — super-admin mosque listings, audit logs, bulk actions
- `Awrad/` — recommended wird responses
- `Adhkar/` — personal dhikr list and increment responses
- `Quran/` — para reader and 30-day plan responses
- `Madrassah/` — attendance recording

Domain entities remain in `MosqueOS.Domain/Entities`. Use this folder for API contracts only.
