# Module 3.1 — Client Demo Guide

## Functional Requirements — **DONE**

| # | Requirement | Status | Demo proof |
|---|-------------|--------|------------|
| 1 | Public mosque profile `/mosque/[slug]` | **DONE** | Open public URL — mosque name, description, jamaat times |
| 2 | Admin can edit all mosque details | **DONE** | Super Admin detail + Owner profile tabs |
| 3 | Mosque manually seeded by Super Admin | **DONE** | Add listing form on Super Mosques page |
| 4 | Users can claim an existing listing | **DONE** | Gold claim form on public Unclaimed profile |
| 5 | Verification after claim (manual MVP) | **DONE** | Super Admin Claims → Approve / Reject |
| 6 | Module feature flags per mosque | **DONE** | Features tab (Super) + Settings tab (Owner) |

**Module 3.1 Mosque Profile: DONE (MVP)**

---

## Before the demo (5 min setup)

### 1. Start backend
```powershell
cd "c:\Users\hp\Downloads\Webapp-Step-Guide (1)\MosqueOS\backend\MosqueOS.API"
dotnet run
```
Wait until: `Now listening on: http://localhost:5000`

### 2. Start frontend
```powershell
cd "c:\Users\hp\Downloads\Webapp-Step-Guide (1)\MosqueOS\frontend"
ng serve
```
Open: **http://127.0.0.1:4200**

### 3. Use a fresh browser tab (or Incognito) for public/claim steps

---

## Demo test data

### Demo mosque (create live during presentation)

| Field | Value |
|-------|--------|
| **Name** | Jamia Masjid Rawalpindi |
| **Slug** | `jamia-masjid-rawalpindi` |
| **City** | Birmingham |
| **Address** | 88 Stratford Road, Sparkhill |
| **Postcode** | B11 1AR |
| **Phone** | `+441214567890` |
| **Email** | `info@jamia-rawalpindi.org` |
| **Website** | `https://jamia-rawalpindi.example.org` |
| **Facebook** | `https://facebook.com/jamiamasjidrawalpindi` |
| **Instagram** | `https://instagram.com/jamiamasjidrawalpindi` |
| **Description** | Serving the Pakistani community in Birmingham with daily prayers, madrassah, and community events. Established 1985. |
| **Timezone** | `Europe/London` |

**Public URL after create:**  
http://127.0.0.1:4200/mosque/jamia-masjid-rawalpindi

---

### Login accounts

| Role | Username | Password | Use in demo |
|------|----------|----------|-------------|
| **Super Admin** | `admin` | `Admin@123` | Create mosque, approve claim, activate |
| **Claim user (existing)** | `omar` | `Member@123` | Submit claim (already verified email) |
| **Claim user (new signup)** | Register fresh | — | Show OTP flow (optional) |

**Claim form data (for `omar`):**

| Field | Value |
|-------|--------|
| Full name | Omar Farooq |
| Phone | `+447700900111` |
| Position | Trustee |
| Email | omar@mosqueos.uk |

---

## Client presentation — step by step (15–20 min)

### Slide 1 — Intro (30 sec)
> "Module 3.1 is the Mosque Profile — the core identity of every mosque on MosqueOS. It has a public page anyone can visit, and an admin workflow to create, claim, verify, and activate listings."

---

### Step 1 — Super Admin creates mosque (2 min)

**Say:** "Super Admin seeds a new unclaimed listing."

1. Login: `admin` / `Admin@123`
2. Go to: **http://127.0.0.1:4200/dashboard/super/mosques**
3. Click **Add listing** (or + button)
4. Paste demo data from table above
5. Click **Create**
6. **Show:** Status = **Unclaimed**, slug auto-generated

**Proof URL:** Note the mosque ID on detail page (e.g. `/dashboard/super/mosques/15`)

---

### Step 2 — Public profile (2 min)

**Say:** "Anyone can view the public profile — no login required."

1. Open new tab (or logout)
2. Go to: **http://127.0.0.1:4200/mosque/jamia-masjid-rawalpindi**
3. **Show client:**
   - Mosque name & description
   - Jamaat times section
   - **"This mosque listing is unclaimed"** + gold **Claim this mosque** button
   - Footer: address, phone, email, social links

---

### Step 3 — User claims mosque (3 min)

**Say:** "A community member logs in and submits an ownership claim."

1. On public page → click **Log in to claim this mosque**  
   OR login: `omar` / `Member@123` then return to mosque URL
2. Fill claim form:
   - Name: Omar Farooq
   - Phone: `+447700900111`
   - Position: Trustee
3. Click **Claim this mosque**
4. **Show:** Green success message — "Claim submitted. Awaiting super admin verification."
5. **Explain:** Public page now hidden (ClaimPending) — mosque not in directory until verified

---

### Step 4 — Super Admin verifies claim (3 min)

**Say:** "Super Admin manually approves the claim — MVP verification."

1. Login as `admin`
2. Go to: **http://127.0.0.1:4200/dashboard/super/claims**
3. **Show:** Pending claim card for Jamia Masjid Rawalpindi
4. Click **Approve**
5. **Show:** Success toast — "mosque is now Claimed. Activate it from mosque details."
6. Click **View listing** → mosque detail page
7. **Show:** Status = **Claimed**, Owner = Omar Farooq

---

### Step 5 — Owner edits profile & modules (3 min)

**Say:** "The new owner can edit mosque details and toggle modules."

1. Logout → Login as `omar` / `Member@123`
2. Go to: **http://127.0.0.1:4200/dashboard/owner**
3. Tab **Profile** → edit description or upload logo
4. Tab **Settings** → toggle modules (Announcements, Events, etc.)
5. **Show:** Owner can manage their mosque before going fully live

---

### Step 6 — Super Admin activates mosque (2 min)

**Say:** "Final step — Super Admin activates the mosque for full public access."

1. Login as `admin`
2. Go to mosque detail: **http://127.0.0.1:4200/dashboard/super/mosques/{id}**
3. Click **Activate**
4. **Show:** Status = **Active**

---

### Step 7 — Live public profile (2 min)

**Say:** "The mosque is now fully live on the public directory."

1. Open: **http://127.0.0.1:4200/mosque/jamia-masjid-rawalpindi**
2. **Show:** Full profile with enabled modules (Prayer Times, Announcements if toggled on)
3. Feature flags control which sections appear

---

### Optional — OTP signup flow (2 min)

**Say:** "New users verify email with a 6-digit OTP before claiming."

1. `/register` → create account
2. Redirect to `/verify-otp` — enter code from API terminal log
3. Login → claim mosque

---

## One-page cheat sheet (print for demo)

```
SETUP
  API:  http://localhost:5000
  App:  http://127.0.0.1:4200

SUPER ADMIN
  admin / Admin@123
  Mosques:  /dashboard/super/mosques
  Claims:   /dashboard/super/claims

CLAIM USER
  omar / Member@123

DEMO MOSQUE
  /mosque/jamia-masjid-rawalpindi

FLOW
  Create → Unclaimed → Public view → Claim → Approve → Claimed
  → Owner edit → Activate → Active → Public live
```

---

## Quick API verification (optional)

```powershell
cd "c:\Users\hp\Downloads\Webapp-Step-Guide (1)\MosqueOS\backend\scripts"
.\demo-module31-client.ps1
```

---

## Talking points for client Q&A

| Question | Answer |
|----------|--------|
| Why is profile hidden after claim? | Security — unverified claims must not appear as official listings |
| Why separate Activate step? | Two-stage trust: approve ownership, then go live on directory |
| Can multiple people claim? | One pending claim per user; Super Admin approves one winner |
| Module flags? | Each mosque toggles Prayer Times, Events, Announcements, etc. independently |
| Donations? | Placeholder in MVP — payment integration is a future module |

---

## Troubleshooting during demo

| Issue | Fix |
|-------|-----|
| Yellow "Demo preview data" banner | Refresh with Ctrl+F5; ensure API is running |
| Claim fails | Check phone is UK format: `+447...` |
| Login fails after register | Complete OTP on `/verify-otp` first |
| Claim still shows after approve | Go to mosque detail → Activate (known sync fix applied) |
| API build fails | Stop old `dotnet run` process, rebuild |
