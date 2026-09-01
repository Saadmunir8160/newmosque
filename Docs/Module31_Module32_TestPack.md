# MosqueOS — Module 3.1 & 3.2 Test Pack

**Document type:** Manual test data & verification checklist (PDF-ready)  
**Application:** MosqueOS  
**Frontend:** `http://localhost:4200`  
**API:** `http://localhost:5000`  
**Timezone:** `Europe/London`

---

## Document control

| Field | Value |
|-------|--------|
| Modules covered | 3.1 Mosque Profile · 3.2 Prayer Times |
| Purpose | Client / QA manual testing with fixed test data |
| How to PDF | Open in Word / Google Docs / VS Code Markdown PDF → Export PDF |

---

# Part 0 — Shared setup

## Browsers

| Window | Use |
|--------|-----|
| A | Super Admin and logged-in roles |
| B | Incognito = public / guest |

## Testing rules

1. Do not type `{slug}` in the URL — copy the real slug from the mosque detail page.
2. Public checks must use Incognito or a logged-out session.
3. Do not treat admin preview (`?preview=admin`) as a public test.
4. For Module 3.1 seed: keep **Email empty** or status becomes Invited (not Unclaimed).
5. Do not mix old Invited test mosques into a fresh claim flow.

## Logins

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `Admin@123` |
| Mosque Admin / claim user | `mosqueadmin` | `Admin@123` |
| Prayer Times Editor | `prayereditor` | `Prayer@123` |

---

# Part 1 — Module 3.1 Mosque Profile

## Spec coverage

| # | Requirement | Covered by |
|---|-------------|------------|
| 1 | Public profile `/mosque/[slug]` | TEST 1–2, 7 |
| 2 | Admin can edit mosque details | TEST 9 |
| 3 | Super Admin can seed a listing | TEST 1 |
| 4 | Claim an unclaimed listing | TEST 3 |
| 5 | Manual verification (approve + activate) | TEST 5–6 |
| 6 | Per-mosque module feature flags | TEST 8 |
| — | New mosque registration path | TEST 10 |
| — | Public directory + discovery request | TEST 11–12 |

## Status lifecycle (claim path)

```
Unclaimed → claim PENDING (mosque stays Unclaimed) → Approve → Claimed → Activate → Active
```

| Status | Public profile |
|--------|----------------|
| Unclaimed | Visible + Claim CTA (until a PENDING claim) |
| Claimed | Hidden |
| Active | Visible (no Claim CTA) |

Mosque statuses in Module 3.1 requirements: **UNCLAIMED | CLAIMED | ACTIVE** only.  
Pending verification uses ownership **claim** status `PENDING`, not a 4th mosque status.
| Invited | Hidden (avoid in claim test — clear email on seed) |

---

## TEST 1 — Seed Unclaimed mosque

**Login:** `admin` / `Admin@123`  
**Path:** `/dashboard/super/mosques` → **Add Mosque**

| Field | Value |
|-------|--------|
| Name | `Client Demo Mosque` |
| Slug | `client-demo-mosque` |
| City | `Bradford` |
| Address | `12 High Street` |
| Postcode | `BD1 1AA` |
| Phone | `01274123456` |
| Email | *(leave empty)* |
| Website | `https://example.org` |
| Description | `Client demo listing for Module 3.1` |
| Timezone | `Europe/London` |

If using **Fill test data**: delete Email before Save.

**Pass criteria:** Status = **Unclaimed** (not Invited).  
**Public URL:** `http://localhost:4200/mosque/client-demo-mosque`

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 2 — Public Unclaimed + Claim CTA

**Browser B (logged out)**  
Open: `http://localhost:4200/mosque/client-demo-mosque`

**Pass criteria:**
- Profile visible
- Status Unclaimed
- **Claim This Mosque** button visible

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 3 — Submit ownership claim

**Browser B** → click Claim → login `mosqueadmin` / `Admin@123`

| Field | Value |
|-------|--------|
| Phone | `07123456789` |
| Role | `Imam` |
| Notes | `Module 3.1 claim test` |

**Pass criteria:** Success — Claim Submitted.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 4 — Public hidden (ClaimPending)

**Browser B logged out** → same URL again.

**Pass criteria:** Mosque not found / profile hidden.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 5 — Approve (do not Activate yet)

**Login:** `admin` / `Admin@123`  
**Path:** `/dashboard/super/claims`  
**Action:** **Approve** only.

**Pass criteria:**
- Mosque status = **Claimed**
- Public URL still hidden

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 6 — Activate

**Path:** `/dashboard/super/mosques` → **Client Demo Mosque** → **Activate**

**Pass criteria:** Status = **Active**.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 7 — Public Active

**Browser B logged out** → `/mosque/client-demo-mosque`

**Pass criteria:**
- Profile live
- Status Active / Active profile
- No Claim button

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 8 — Owner module flags

**Login:** `mosqueadmin` / `Admin@123`  
**Path:** `/dashboard/owner/modules`

1. Turn **one** module OFF → save  
2. Public profile: that section hidden  
3. Turn module ON → save  
4. Public: section visible again  

**Pass criteria:** Toggle reflects on public profile.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 9 — Owner edit

**Path:** `/dashboard/owner/my-mosque`

| Field | Change to |
|-------|-----------|
| Phone | `01274999999` |

**Pass criteria:** Public profile shows `01274999999`.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 10 — Registration path (separate from claim)

Use **only** this data (do not reuse Client Demo Mosque).

**Login:** `mosqueadmin`  
**Path:** `/dashboard/owner/mosque-listings` → **Register a new mosque**

| Field | Value |
|-------|--------|
| Name | `Client Reg Mosque` |
| City | `Leeds` |
| Address | `1 Test Road, LS1 1AA` |
| Phone | `01131234567` |
| Description | `Client demo registration` |

Then **Login:** `admin` → `/dashboard/super/registrations` → **Approve & create mosque**

**Pass criteria:** Mosque list shows **CLAIMED**, Owner = Mosque Admin.  
**Optional:** Activate → public `http://localhost:4200/mosque/client-reg-mosque`

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 11 — Public directory search

**Path:** `/mosques` (logged out)

| Field | Example value |
|-------|----------------|
| City | `Bradford` or `Leeds` |
| Status filter | All / Active / Unclaimed |

**Pass criteria:** Results list + **View Profile** opens public page.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## TEST 12 — Request a mosque (discovery)

**Path:** `/mosques/request`

| Field | Value |
|-------|--------|
| Mosque name | `Client Request Mosque` |
| City | `Manchester` |
| Postcode | `M1 1AE` |
| Address | `10 Demo Street` |
| Your name | `Test Visitor` |
| Email | `visitor@example.com` |
| Notes | `Please add this mosque to the directory` |

**Pass criteria:** Success confirmation shown.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## Module 3.1 summary checklist

| # | Test | Pass |
|---|------|------|
| 1 | Seed Unclaimed (email empty) | ☐ |
| 2 | Public + Claim CTA | ☐ |
| 3 | Claim submit | ☐ |
| 4 | Public hidden (ClaimPending) | ☐ |
| 5 | Approve → Claimed | ☐ |
| 6 | Activate → Active | ☐ |
| 7 | Public Active | ☐ |
| 8 | Modules toggle | ☐ |
| 9 | Owner edit | ☐ |
| 10 | Registration → Approve | ☐ |
| 11 | Directory search | ☐ |
| 12 | Request mosque | ☐ |

---

# Part 2 — Module 3.2 Prayer Times

## Spec coverage

| # | Requirement | Covered by |
|---|-------------|------------|
| 1 | Public daily timetable | PT-A, PT-E |
| 2 | Monthly timetable view | PT-E |
| 3 | Next prayer countdown (Europe/London) | PT-E |
| 4 | Admin / editor daily editing | PT-A |
| 5 | Recurring templates → generate daily rows | PT-D |
| 6 | Exceptions | PT-C |
| 7 | Audit log | PT-D |
| 8 | One or more Jumuah slots | PT-B |

## Primary account & mosque

| Item | Value |
|------|--------|
| Login | `prayereditor` / `Prayer@123` |
| Mosque | Masjid Al-Noor Bradford (editor home mosque) |
| Requirement | Mosque is **Active** and **PrayerTimes** module is ON |

### Key editor routes

| Page | Path |
|------|------|
| Daily | `/dashboard/prayer-editor/daily` |
| Jumuah | `/dashboard/prayer-editor/jumuah` |
| Exceptions | `/dashboard/prayer-editor/exceptions` |
| Templates | `/dashboard/prayer-editor/templates` |
| Audit | `/dashboard/prayer-editor/audit` |
| Member/dashboard view | `/dashboard/prayer-times` |

---

## PT-A — Daily publish

**Path:** `/dashboard/prayer-editor/daily`  
**Date:** today

| Prayer | Start | Jamaat |
|--------|-------|--------|
| Fajr | `05:30` | `05:45` |
| Dhuhr | `12:30` | `13:00` |
| Asr | `15:30` | `16:00` |
| Maghrib | `18:00` | `18:10` |
| Isha | `19:30` | `20:00` |

**Action:** Save & publish  

**Pass criteria:** Public mosque profile Prayer Times section shows these jamaat times.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## PT-B — Jumuah slots

**Path:** `/dashboard/prayer-editor/jumuah`

| Slot | Khutbah | Jamaat |
|------|---------|--------|
| 1 First | `12:45` | `13:15` |
| 2 Second | `13:30` | `14:00` |

**Pass criteria:** Both slots saved and listed.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## PT-C — Exception override

**Path:** `/dashboard/prayer-editor/exceptions`

| Field | Value |
|-------|--------|
| Date | today |
| Prayer | `Maghrib` |
| Override jamaat | `18:25` |
| Reason | `Module 3.2 exception test` |

**Pass criteria:**
- Public Maghrib shows **6:25 PM** (not 6:10 PM)
- After remove exception → Maghrib returns to **6:10 PM**

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## PT-D — Jamaah template + generate

**Path (updated RBAC):** `/dashboard/admin/prayer-times/templates`  
**Roles:** Super Admin / Mosque Owner / Mosque Admin only  
**Prayer Editor:** templates nav removed; `/dashboard/prayer-editor/templates` redirects to daily.

### Template form

| Field | Value |
|-------|--------|
| Name | `Winter Timetable` |
| Active | Yes |
| Days of week | All (Sun–Sat) |

| Prayer | Start | Jamaat |
|--------|-------|--------|
| Fajr | `06:00` | `06:15` |
| Dhuhr | `12:20` | `12:45` |
| Asr | `15:00` | `15:20` |
| Maghrib | `17:30` | `17:40` |
| Isha | `19:00` | `19:20` |

### Generate form

| Field | Value |
|-------|--------|
| Template | `Winter Timetable` |
| From | today |
| To | today + 7 days |
| Overwrite published | No (first run) |
| Publish generated | Yes |

**Pass criteria:**
- Daily rows created for the range
- Audit Log contains **TEMPLATE_APPLIED**

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## PT-E — Public countdown + monthly

| Check | Where |
|-------|--------|
| Next prayer + live HH:MM:SS countdown | Public `/mosque/{slug}` |
| Daily + Monthly tabs | `/dashboard/prayer-times` |
| Timezone | `Europe/London` (or mosque timezone) |

**Pass criteria:** Countdown ticks every second; monthly month navigation works; empty state if unpublished.

| Result | Pass ☐ | Fail ☐ | Notes: _______________ |

---

## Module 3.2 summary checklist

| # | Test | Pass |
|---|------|------|
| A | Daily publish → public | ☐ |
| B | Two Jumuah slots | ☐ |
| C | Maghrib exception override | ☐ |
| D | Winter template generate (7 days) | ☐ |
| E | Countdown + monthly | ☐ |

---

# Part 3 — Related documentation

| Doc | Purpose |
|-----|---------|
| [Module31_Verification.md](./Module31_Verification.md) | Module 3.1 verification notes |
| [Module32_Verification.md](./Module32_Verification.md) | Module 3.2 verification notes |
| [ClientDeliveryChecklist.md](./ClientDeliveryChecklist.md) | Delivery checklist |
| [PrayerEditorModule.md](./PrayerEditorModule.md) | Prayer editor module overview |

---

# Part 4 — Sign-off

| Module | Result | Tester name | Date |
|--------|--------|-------------|------|
| 3.1 Mosque Profile | Pass ☐ / Fail ☐ | _______________ | ________ |
| 3.2 Prayer Times | Pass ☐ / Fail ☐ | _______________ | ________ |

**Environment confirmed:** localhost frontend + API ☐  

**Notes / defects:**

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

**Signed:** _______________________  **Date:** _______________

---

*End of Module 3.1 & 3.2 Test Pack*
