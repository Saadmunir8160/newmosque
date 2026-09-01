# MosqueOS Authentication Upgrade Report

**Date:** 2026-08-05  
**Scope:** Upgrade existing Authentication module only (no full rewrite)  
**Stack:** ASP.NET Core Identity + JWT · Angular AuthService

---

## 1. What existed before

| Area | Previous state |
|------|----------------|
| Login | Username/email + password → single JWT (3h), no refresh |
| Register | Self-register could become **Mosque Owner** (`RegisterAsMosqueOwner` default `true`); `EmailConfirmed = true` immediately |
| Email verify / OTP | Endpoints + services existed but register bypassed them; login did not require confirmed email |
| Invites | Mosque Owner / Mosque Admin only; accept assigned Admin for any non-owner invite |
| Password policy | Identity + `AuthPasswordValidation` (8+, complexity) |
| Lockout | DB columns only; used for admin suspend; **no** failed-login lockout |
| Forgot password | Missing (admin reset-password only) |
| Sessions | Missing |
| Login history | Missing |
| Rate limits | Claims / mosque registration only — **not** auth endpoints |
| Security headers | Missing |
| Frontend | JWT in `localStorage`; Remember Me saved email only; Forgot Password was a dead link |

---

## 2. What was improved

### Member registration
- Always assigns **Member** only (`RegisterAsMosqueOwner` ignored)
- `EmailConfirmed = false` until verify link **or** OTP
- Sends verification email + OTP
- Login blocked until email verified
- Frontend register navigates to `/verify-otp`

### Admin / staff roles (invite-only)
- Self-register cannot elevate
- Invite roles expanded: MosqueOwner, MosqueAdmin, PrayerTimesEditor, Teacher, Muqaddam, ContentEditor, Parent
- Accept assigns **exact invited role** (user cannot change it)
- Super Admin remains seed/platform-only (not invitational self-serve)

### Login
- JWT access token (configurable, default **60 min**, UTC)
- Opaque **refresh token** (hashed at rest) + **rotation**
- Reuse of revoked refresh → revoke all user sessions
- **Remember Me** → longer refresh lifetime (default 30 days vs 7)
- Identity **lockout** after 5 failed attempts / 15 minutes
- Role presence validated before issuing tokens
- Login success/fail audited

### Forgot password
- `POST /auth/forgot-password` (link or OTP)
- `POST /auth/reset-password`
- On success: password updated + **all refresh tokens revoked** + security stamp rotated → force re-login

### Sessions / logout
- `POST /auth/logout` (current refresh)
- `POST /auth/logout-all`
- `GET /auth/sessions`, `DELETE /auth/sessions/{id}`
- `GET /auth/login-history`

### Security
- Auth rate limits: login / register / sensitive
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- JWT: `ValidateLifetime`, clock skew 1 min
- Unique email enforced in Identity options

### Angular
- Stores access + refresh tokens
- Interceptor: **401 → refresh → retry** once
- Login passes `rememberMe`
- Forgot / Reset password pages + routes
- Register → Member + OTP flow

---

## 3. Database changes

Migration: `20260805160000_AddAuthSessionsAndLoginHistory.cs`

| Table | Purpose |
|-------|---------|
| `RefreshTokens` | Hashed refresh tokens, device/IP, rotation chain, remember-me flag |
| `UserLoginHistories` | Auth event audit (login, logout, reset, verify, …) |

No changes to `AspNetUsers` schema (lockout columns already present).

**Apply:** restart API (startup seeder/migrate path) or run EF migrations against `mos_db`.

---

## 4. APIs added or modified

### Modified (backward compatible where noted)
| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/v1/auth/register` | Member-only; requires verification |
| POST | `/api/v1/auth/login` | `rememberMe`; returns `refreshToken`; lockout + email gate |
| POST | `/api/v1/auth/resend-otp` | Actually sends OTP |
| POST | `/api/v1/auth/register-from-invite` | Issues refresh session; role from invite |
| GET | `/api/v1/auth/me` | Unchanged contract |

### Added
| Method | Route |
|--------|-------|
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/logout-all` |
| GET | `/api/v1/auth/sessions` |
| DELETE | `/api/v1/auth/sessions/{id}` |
| GET | `/api/v1/auth/login-history` |
| POST | `/api/v1/auth/forgot-password` |
| POST | `/api/v1/auth/reset-password` |

### Login response (additive)
```json
{
  "token": "...",
  "expiration": "...",
  "refreshToken": "...",
  "refreshTokenExpiration": "...",
  "username": "...",
  "fullName": "...",
  "roles": ["Member"]
}
```

Existing clients that ignore new fields continue to work for access-token login, but should adopt refresh for long sessions.

---

## 5. Key files touched

**Backend:** `AuthController`, `AuthModels`, `AuthSessionService`, `PasswordResetService`, `JwtTokenService`, `EmailOtpService`, `MosqueInvitationService`, `MosqueRateLimitPolicies`, `DependencyInjection`, `Program.cs`, `ApplicationDbContext`, entities `RefreshToken` / `UserLoginHistory`, migration.

**Frontend:** `auth.service.ts`, `auth.interceptor.ts`, `register`, `login`, `forgot-password`, `reset-password`, `app.routes.ts`, `LoginResponse` model.

---

## 6. Remaining recommendations

1. **HttpOnly secure cookies** for refresh tokens (reduce XSS risk vs `localStorage`).
2. **Policy-based authorization** beyond role strings (permission policies on more controllers).
3. **Invite UI** for Super Admin / Owner to select all inviteable roles (backend ready).
4. **Email deliverability** — ensure SMTP configured in production (`Email:Smtp`); OTP is logged in console when email is console-mode.
5. **Existing unverified accounts** created under old “auto-confirm” behaviour remain loginable; new signups require verification.
6. **Sessions UI** on profile page (APIs ready; UI optional).
7. **Global exception middleware** with correlation IDs (headers added; structured exception filter still optional).
8. Rotate `JWT:Secret` in production and enforce HTTPS (`RequireHttpsMetadata = true`).

---

## 7. Smoke test checklist

- [ ] Register Member → verify OTP → login works  
- [ ] Login with wrong password 5× → lockout message  
- [ ] Remember Me → refresh token persists longer  
- [ ] Access token expiry → interceptor refresh succeeds  
- [ ] Forgot password link/OTP → reset → old sessions invalid  
- [ ] Invite non-Member role → accept → role matches invite  
- [ ] Self-register cannot become Mosque Owner  
- [ ] Demo users (`admin` / seeded) still login (EmailConfirmed seeded true)
