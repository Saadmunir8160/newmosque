# MosqueOS — Step-by-Step Test Guide (Module 3.1 → 3.15)

Complete manual test for every module. Follow in order. Tick each step as you go.

---

## 0. Start environment

| # | Step | Expected |
|---|------|----------|
| 0.1 | Start API: `cd backend/MosqueOS.API` → `dotnet run` | Listening on `http://localhost:5000` |
| 0.2 | Start FE: `cd frontend` → `ng serve` | Open `http://localhost:4200` |
| 0.3 | Use Incognito for public/claim checks | Clean session |

### Logins (all modules)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `Admin@123` |
| Mosque Admin / Claimant | `mosqueadmin` | `Admin@123` |
| Prayer Editor | `prayereditor` | `Prayer@123` |
| Content Editor | `editor` | `Editor@123` |
| Teacher | `teacher` | `Teacher@123` |
| Parent | `parent` | `Parent@123` |
| Member | `member` | `Member@123` |
| Owner | `owner` | `Owner@123` |

### Two test mosques

| Purpose | Mosque | Slug |
|---------|--------|------|
| **3.1 claim lifecycle** | Create fresh seed (below) | new slug each time |
| **3.2–3.15 features** | Masjid Al Noor Bradford **id 115** | `masjid-al-noor-bradford` |

Public 115: http://localhost:4200/mosque/masjid-al-noor-bradford

---

# Module 3.1 — Mosque Profile

**Statuses (your spec only):** `UNCLAIMED | CLAIMED | ACTIVE`  
**Claim statuses:** `PENDING | APPROVED | REJECTED`

### Test data

| Field | Value |
|-------|--------|
| Name | Client Demo Mosque |
| City | Bradford |
| Address | 12 High Street |
| Postcode | BD1 1AA |
| Phone | 01274123456 |
| Email | *(leave empty)* |
| Website | https://example.org |
| Timezone | Europe/London |
| Claim full name | Mosque Admin |
| Claim role | Imam |
| Claim phone | 07123456789 |
| Claim notes | Module 3.1 claim test |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 1.1 | `admin` | Super Mosques → **Add / Seed** listing with data above (email empty) | Status **Unclaimed** | ☐ |
| 1.2 | Guest | Open `/mosque/{slug}` | Profile visible + **Claim** CTA | ☐ |
| 1.3 | `mosqueadmin` | Submit claim (Imam / 07123456789) | Claim **PENDING**; mosque stays **Unclaimed**; CTA off | ☐ |
| 1.4 | Guest | Refresh public page | Still visible as Unclaimed; no Claim button | ☐ |
| 1.5 | `admin` | Claims queue → **Approve** | Mosque → **Claimed**; public **hidden** (404) | ☐ |
| 1.6 | `admin` | Mosque detail → **Activate** | Status → **Active** | ☐ |
| 1.7 | Guest | Open `/mosque/{slug}` | Public **Active** profile | ☐ |
| 1.8 | `admin` / owner | Toggle a module flag (e.g. Announcements) off/on | Saves successfully | ☐ |
| 1.9 | Guest | Directory search city **Bradford** | Listing appears | ☐ |

**Pass when:** Unclaimed → claim PENDING → Claimed → Active works; public only for Unclaimed + Active.

---

# Module 3.2 — Prayer Times

**Mosque:** 115 · **Login:** `prayereditor` (edit) · `mosqueadmin` (templates) · `admin` (enable module)

### Enable
| # | Action | ☐ |
|---|--------|---|
| 2.0 | `admin` → mosque 115 settings → **PrayerTimes ON** | ☐ |

### Test data — daily

| Prayer | Start | Jamaat |
|--------|-------|--------|
| Fajr | 05:30 | 05:45 |
| Dhuhr | 12:30 | 13:00 |
| Asr | 15:30 | 16:00 |
| Maghrib | 18:00 | 18:10 |
| Isha | 19:30 | 20:00 |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 2.1 | `prayereditor` | `/dashboard/prayer-editor/daily` → enter times → **Publish** | Saved | ☐ |
| 2.2 | Guest | Public mosque prayer section / daily | Shows published times | ☐ |
| 2.3 | `prayereditor` | Jumuah: slot1 **12:45 / 13:15**, slot2 **13:30 / 14:00** | 2 slots saved | ☐ |
| 2.4 | `prayereditor` | Exception: Maghrib jamaat **18:25** today | Saved | ☐ |
| 2.5 | Guest | Public daily for today | Maghrib shows **18:25** | ☐ |
| 2.6 | `mosqueadmin` | Templates → create **Winter Timetable** → generate 7 days publish | Rows created | ☐ |
| 2.7 | `prayereditor` | Open templates | **Denied** (no template manage) | ☐ |
| 2.8 | `prayereditor` | Monthly view + Audit log | Month rows + audit entries | ☐ |
| 2.9 | Guest | Public page | Next-prayer countdown works | ☐ |

**Pass when:** Daily, Jumuah, exception, template, audit, public countdown all OK.

---

# Module 3.3 — Announcements

**Login:** `mosqueadmin` · Enable **Announcements**

### Test data

| Field | Value |
|-------|--------|
| Title | Community Iftar Reminder |
| Summary | Join us for community iftar after Maghrib. |
| Body | Please bring a dish to share. Sisters hall open from 7pm. |
| Featured | Yes |
| Image | optional image URL |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 3.1 | `mosqueadmin` | Create announcement → save as **Draft** | Draft | ☐ |
| 3.2 | Edit | Set featured + image → save | Updated | ☐ |
| 3.3 | **Publish** | Status Published | Public list shows it | ☐ |
| 3.4 | Guest | Detail page | Title, summary, image, date | ☐ |
| 3.5 | Guest | Mosque home | Featured section shows it | ☐ |
| 3.6 | Admin | **Unpublish** | Public detail hidden | ☐ |
| 3.7 | Admin | Publish again | Visible again | ☐ |
| 3.8 | Admin | Delete (optional) | Removed | ☐ |

**Pass when:** Draft / Published / Unpublished + featured home work.

---

# Module 3.4 — Events

**Login:** `mosqueadmin` · Enable **Events**

### Test data

| Field | Value |
|-------|--------|
| Title | Mawlid Night Gathering |
| Type | Mawlid |
| Date | today |
| Start–End | 19:15 – 21:00 |
| Location | Main Prayer Hall |
| Speaker | optional |
| Recurring | Yes |
| Guided reading | link Wird collection if listed |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 4.1 | Admin | Create event with data above | Saved Scheduled | ☐ |
| 4.2 | Guest | Events list | Event appears | ☐ |
| 4.3 | Guest | Event detail | Date, time, location, type | ☐ |
| 4.4 | Guest | Mosque home | Upcoming events | ☐ |
| 4.5 | Admin | Edit title/time | Updates | ☐ |
| 4.6 | Admin | Cancel or delete (optional) | Reflects on public | ☐ |

**Pass when:** Public list/detail + admin CRUD + type/recurring stored.

---

# Module 3.5 — Madrassah

**Login:** `mosqueadmin` · `teacher` · `parent` · Enable **Madrassah**  
**UI:** `/dashboard/admin/madrassah`

### Test data

| Item | Value |
|------|--------|
| Student | Ahmad Ali |
| Guardian | `parent` as Father |
| Class | Quran Level 1 |
| Teacher | `teacher` |
| Fee 1 | £25 → mark Paid |
| Fee 2 | £30 → leave Unpaid |
| Progress note | Good progress on Surah Al-Fatiha |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 5.1 | Admin | Create student Ahmad Ali | Created | ☐ |
| 5.2 | Admin | Link guardian `parent` (Father) | Linked | ☐ |
| 5.3 | Admin | Create class Quran Level 1 + assign teacher | Created | ☐ |
| 5.4 | Admin | Enrol Ahmad into class | Enrolled | ☐ |
| 5.5 | Teacher | Create session today | Session exists | ☐ |
| 5.6 | Teacher | Mark Ahmad **PRESENT** | Attendance saved | ☐ |
| 5.7 | Admin | Add fee £25 → mark paid | Paid | ☐ |
| 5.8 | Admin | Add fee £30 unpaid | Unpaid remains | ☐ |
| 5.9 | Teacher | Add progress note (Al-Fatiha) | Note saved | ☐ |
| 5.10 | Admin | Dashboard | Attendance rate + unpaid fees | ☐ |
| 5.11 | Parent | Parent portal / my children | Sees Ahmad | ☐ |

**Pass when:** student/class/enrol/attendance/fees/notes/parent portal work.

---

# Module 3.6 — Communities

**Login:** `mosqueadmin` · `member` · Enable **Communities**

### Test data

| Item | Value |
|------|--------|
| Study circle | Friday Study Circle (StudyCircle) |
| Tariqa | BaAlawi Circle (Tariqa) |
| Invite | member → role Member |
| Post | text + hadith ref Ibn Majah 224 |
| Resource | Weekly notes + URL |
| Link | attach an existing event |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 6.1 | Admin | Create Study Circle (mosque 115) | Listed | ☐ |
| 6.2 | Admin | Create Tariqa community | Listed | ☐ |
| 6.3 | Admin | Invite `member` as Member | Member joined | ☐ |
| 6.4 | Member/Admin | Post to feed with hadith ref | Post visible | ☐ |
| 6.5 | Admin | Add resource | Resource section shows it | ☐ |
| 6.6 | Admin | Link community → event | Link listed | ☐ |

**Pass when:** types, roles, feed, resources, event link work.

---

# Module 3.7 — Awrad & Wird

**Login:** `editor` · `member` · Enable **Awrad**  
**UI:** `/dashboard/content/awrad` · `/dashboard/member/wird`

### Test data

| Item | Value |
|------|--------|
| Content | Test Salawat — Arabic/translit/translation, repeat 10 |
| Collection | Demo Daily Wird — 5 steps |
| Member prefs | Beginner + Quick mode |
| Schedule | Assign to AfterMaghrib (or any slot) |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 7.1 | Editor | Create content item (full fields) | Saved | ☐ |
| 7.2 | Editor | Create collection + 5 ordered steps | Ordered | ☐ |
| 7.3 | Editor | **Publish** collection | Published | ☐ |
| 7.4 | Member | Set prefs Beginner + Quick | Saved | ☐ |
| 7.5 | Member | Assign collection to prayer slot | On schedule | ☐ |
| 7.6 | Member | Start guided reading | Steps trimmed (Beginner/Quick) | ☐ |
| 7.7 | Member | Complete collection | Completion recorded | ☐ |
| 7.8 | Member | Recommended-now | Returns a collection | ☐ |

**Pass when:** content, guided trim, schedule, complete, recommended-now work.

---

# Module 3.8 — Daily Adhkar

**Login:** `editor` · `member` · Enable **Adhkar**  
**UI:** `/dashboard/member/adhkar`

### Test data

| Item | Value |
|------|--------|
| Library item | Astaghfirullah, target 50, AfterFajr, Always |
| Friday item | occasion Friday |
| Custom | My Custom Dhikr, target 33 |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 8.1 | Editor | Create + publish adhkar item | In library | ☐ |
| 8.2 | Member | Add to My Adhkar | On personal list | ☐ |
| 8.3 | Member | +1 then +10 | Progress label e.g. `11/50` | ☐ |
| 8.4 | Member | Add Friday-occasion item | Filters with relevantOnly | ☐ |
| 8.5 | Member | Add custom dhikr | Saved without library item | ☐ |
| 8.6 | Member | My Wird page | Adhkar summary card | ☐ |

**Pass when:** library, counter, occasions, custom, summary card work.

---

# Module 3.9 — Duas Library

**Login:** `editor` · `member` · Enable **Duas**

### Test data

| Field | Value |
|-------|--------|
| Title | Friday Mosque Dua |
| Arabic / translit / translation | Allahumma barik… / O Allah bless us on Friday |
| Source | Ghazali / Ihya |
| Category | mosque |
| Tags | friday,ghazali |
| Collection | Duas for Hardship |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 9.1 | Editor | Create + publish dua | Published | ☐ |
| 9.2 | Guest/Member | Browse duas | Grouped by **category** | ☐ |
| 9.3 | Member | Home / recommended-now | **Single** dua (not a list) | ☐ |
| 9.4 | Editor | Create collection + add dua | Collection has item | ☐ |
| 9.5 | Editor | Insert dua into awrad content | Content item created | ☐ |

**Pass when:** categories, one home dua, collections, awrad insert work.

---

# Module 3.10 — Qur'an Reading

**Login:** `member` · Enable **Quran**

### Test data

| Field | Value |
|-------|--------|
| Plan | 30-day |
| Min daily | 0.5 para |
| Reminders | ON |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 10.1 | Member | Start 30-day plan (min 0.5, reminders on) | Plan created | ☐ |
| 10.2 | Member | Open today reading card | Today’s para shown | ☐ |
| 10.3 | Member | Complete today’s para | Progress `x/30` updates | ☐ |
| 10.4 | Member | Update settings (min daily / reminders) | Saved | ☐ |
| 10.5 | Member | Home | Quran card visible | ☐ |

**Pass when:** plan, today card, progress, settings work.

---

# Module 3.11 — Ritual Guides

**Login:** `editor` · Enable **RitualGuides**

### Test data

| Field | Value |
|-------|--------|
| Guide | How to Perform Wudu (type Wudu) |
| Step | Intention (Niyyah) |
| Description | Make the intention for purification. |
| Image URL | any image |
| Dua | link Friday Mosque Dua |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 11.1 | Editor | Create/open Wudu guide | Guide exists | ☐ |
| 11.2 | Editor | Add/update step with image + dua | Step saved | ☐ |
| 11.3 | Member/Guest | Open guide | Step-by-step, large text, mobile OK | ☐ |
| 11.4 | Viewer | Step with dua | Relevant dua shown | ☐ |

**Pass when:** wudu steps + dua link work (Ghusl/Salah later OK).

---

# Module 3.12 — Janaza Announcements

**Login:** `mosqueadmin` · Enable **Janaza**

### Test data

| Field | Value |
|-------|--------|
| Name | Brother Yusuf |
| Date of death | today |
| Janaza date/time | today 14:00 |
| Location | Main Prayer Hall |
| Burial | Scholemoor Cemetery |
| Notes | Inna lillahi wa inna ilayhi rajiun |
| Site URL | https://alnoorbradford.org.uk/janaza |
| Notify followers | Yes |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 12.1 | Admin | Create janaza announcement | Saved | ☐ |
| 12.2 | Guest | Public janaza detail | Date, time, location, burial | ☐ |
| 12.3 | Guest | Site URL | Link present | ☐ |
| 12.4 | UI | Visual check | Dignified, simple (no gamification) | ☐ |

**Pass when:** admin post + public respectful detail work.

---

# Module 3.13 — Death Readings Allocation

**Login:** `mosqueadmin` · `member` · Enable **DeathReadings**

### Test data

| Field | Value |
|-------|--------|
| Campaign | In memory of Brother Yusuf |
| Allocation | type YASEEN or PARA → assign to `member` |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 13.1 | Admin | Create reading campaign | Active campaign | ☐ |
| 13.2 | Admin | Assign portion to member | Status **ASSIGNED** | ☐ |
| 13.3 | Member | Mark portion **COMPLETED** | Status Completed | ☐ |
| 13.4 | Anyone | Community participation view | Shows who completed | ☐ |

**Pass when:** campaign → assign → complete → community view work.

---

# Module 3.14 — Community Participation

**Login:** `mosqueadmin` · `member` · Enable **Participation**

### Test data

| Title | Type | Description |
|-------|------|-------------|
| Mosque Garden Volunteering | Volunteering | Help tend courtyard after Maghrib |
| Weekend Quran Class | Class | Open class (Classes integration) |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 14.1 | Admin | Post volunteering opportunity | Active | ☐ |
| 14.2 | Member | Browse opportunities | Sees active list | ☐ |
| 14.3 | Member | Register interest | Registration saved | ☐ |
| 14.4 | Admin | Post Class-type opportunity | Created | ☐ |
| 14.5 | Member | Register on Class opportunity | Registered | ☐ |

**Pass when:** post, browse, register, Class type work.

---

# Module 3.15 — Umrah & Hajj Guides

**Login:** `editor` / guest · Enable **JourneyGuides**

### Test data / expect

| Guide | Stages |
|-------|--------|
| Umrah | pre-departure, ihram, tawaf, sa'i, halq, completion |
| Hajj | days **8–13** Dhul Hijjah |

### Steps

| # | Who | Action | Expected | ☐ |
|---|-----|--------|----------|---|
| 15.1 | Guest/Member | List Umrah guides | Umrah listed | ☐ |
| 15.2 | Open Umrah | Read stages | Each stage: title, description, duas/notes | ☐ |
| 15.3 | Editor/Admin | Ensure Hajj guide (if needed) | Hajj with days 8–13 | ☐ |
| 15.4 | Open Hajj | Day stages | Duas/notes present | ☐ |
| 15.5 | Mobile | Read offline-friendly | Calm spiritual tone | ☐ |

**Pass when:** Umrah + Hajj structured guides with duas work.

---

# Final system check (after all modules)

| # | Action | Expected | ☐ |
|---|--------|----------|---|
| F.1 | Guest: `/mosque/masjid-al-noor-bradford` | Prayer, announcements, events visible if ON | ☐ |
| F.2 | `member` home / Today | Recommended dua + Quran card | ☐ |
| F.3 | Module flags OFF for one module | Feature disappears from public/nav | ☐ |
| F.4 | Module flags ON again | Feature returns | ☐ |

---

# Scorecard

| Module | Result | Tester notes |
|--------|--------|--------------|
| 3.1 Mosque Profile | Pass ☐ Fail ☐ | |
| 3.2 Prayer Times | Pass ☐ Fail ☐ | |
| 3.3 Announcements | Pass ☐ Fail ☐ | |
| 3.4 Events | Pass ☐ Fail ☐ | |
| 3.5 Madrassah | Pass ☐ Fail ☐ | |
| 3.6 Communities | Pass ☐ Fail ☐ | |
| 3.7 Awrad & Wird | Pass ☐ Fail ☐ | |
| 3.8 Daily Adhkar | Pass ☐ Fail ☐ | |
| 3.9 Duas Library | Pass ☐ Fail ☐ | |
| 3.10 Qur'an Reading | Pass ☐ Fail ☐ | |
| 3.11 Ritual Guides | Pass ☐ Fail ☐ | |
| 3.12 Janaza | Pass ☐ Fail ☐ | |
| 3.13 Death Readings | Pass ☐ Fail ☐ | |
| 3.14 Participation | Pass ☐ Fail ☐ | |
| 3.15 Umrah & Hajj | Pass ☐ Fail ☐ | |

**Date tested:** ____________ · **Tester:** ____________

---

## Optional auto-seed (then use UI checklist above)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module31-tests.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module32-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module33-34-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module35-36-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module37-38-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module39-315-setup-test.ps1
```

Related shorter pack (3.2–3.15 data only): `Docs/Modules32_315_ManualTestData.md`
