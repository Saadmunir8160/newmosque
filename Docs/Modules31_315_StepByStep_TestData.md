# MosqueOS — Step-by-Step Test Data File
## Modules 3.1 → 3.15 (Manual QA)

| Meta | Value |
|------|--------|
| **Project** | MosqueOS |
| **Feature mosque** | id **115** · Masjid Al Noor Bradford |
| **Slug** | `masjid-al-noor-bradford` |
| **Public URL** | http://localhost:4200/mosque/masjid-al-noor-bradford |
| **API** | http://localhost:5000 |
| **Frontend** | http://localhost:4200 |
| **3.1 claim test** | Seed a **new** mosque (do not use 115 for claim lifecycle) |

---

## 0. Before you start

### 0.1 Start servers

```powershell
# Terminal 1 — API
cd C:\Users\hp\OneDrive\Desktop\newmosque\backend\MosqueOS.API
dotnet run

# Terminal 2 — Frontend
cd C:\Users\hp\OneDrive\Desktop\newmosque\frontend
npm start
```

Wait until API listens on **5000** and FE on **4200**.

### 0.2 All logins

| # | Role | Username | Password | Used in |
|---|------|----------|----------|---------|
| L1 | Super Admin | `admin` | `Admin@123` | 3.1 seed/approve/activate · module flags |
| L2 | Mosque Admin | `mosqueadmin` | `Admin@123` | 3.1 claim · 3.3–3.6 · 3.12–3.14 |
| L3 | Prayer Editor | `prayereditor` | `Prayer@123` | 3.2 |
| L4 | Content Editor | `editor` | `Editor@123` | 3.7–3.11 · 3.15 |
| L5 | Teacher | `teacher` | `Teacher@123` | 3.5 |
| L6 | Parent | `parent` | `Parent@123` | 3.5 |
| L7 | Member | `member` | `Member@123` | 3.6–3.10 · 3.13–3.14 |
| L8 | Owner | `owner` | `Owner@123` | optional |

### 0.3 Enable modules (mosque 115)

Login **admin** → mosque **115** settings → turn **ON**:

PrayerTimes · Announcements · Events · Madrassah · Communities · Awrad · Adhkar · Duas · Quran · RitualGuides · Janaza · DeathReadings · Participation · JourneyGuides

---

# MODULE 3.1 — Mosque Profile

### Purpose
Public profile, seed, claim, approve, activate.  
**Mosque statuses:** `UNCLAIMED | CLAIMED | ACTIVE` only.

### Test data

| Field | Enter this value |
|-------|------------------|
| Name | `Client Demo Mosque` |
| City | `Bradford` |
| Address | `12 High Street` |
| Postcode | `BD1 1AA` |
| Phone | `01274123456` |
| Email | *(leave empty)* |
| Website | `https://example.org` |
| Timezone | `Europe/London` |
| Description | `Client demo listing for Module 3.1` |
| Claim full name | `Mosque Admin` |
| Claim role / position | `Imam` |
| Claim phone | `07123456789` |
| Claim notes | `Module 3.1 claim test` |

### Steps

| Step | Login | Action | Expected result | Pass |
|------|-------|--------|-----------------|------|
| 3.1.1 | admin | Super Mosques → Seed / Add listing with data above | Status = **Unclaimed** | ☐ |
| 3.1.2 | guest | Open `/mosque/{new-slug}` | Profile visible + Claim CTA | ☐ |
| 3.1.3 | mosqueadmin | Submit claim (Imam / 07123456789) | Claim **PENDING**; mosque still **Unclaimed**; Claim CTA off | ☐ |
| 3.1.4 | guest | Refresh public page | Still Unclaimed; no Claim button | ☐ |
| 3.1.5 | admin | Claims → Approve | Mosque = **Claimed**; public **404** | ☐ |
| 3.1.6 | admin | Activate mosque | Mosque = **Active** | ☐ |
| 3.1.7 | guest | Open `/mosque/{slug}` | Active public profile | ☐ |
| 3.1.8 | admin | Toggle Announcements OFF then ON | Saves OK | ☐ |
| 3.1.9 | guest | Directory search `Bradford` | Listing found | ☐ |

**Module 3.1 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.2 — Prayer Times

### Purpose
Daily/monthly times, Jumuah, exceptions, templates, audit, public countdown.

### Test data — Daily (publish)

| Prayer | Start | Jamaat |
|--------|-------|--------|
| Fajr | `05:30` | `05:45` |
| Dhuhr | `12:30` | `13:00` |
| Asr | `15:30` | `16:00` |
| Maghrib | `18:00` | `18:10` |
| Isha | `19:30` | `20:00` |

### Test data — Jumuah

| Slot | Khutbah | Jamaat |
|------|---------|--------|
| 1 | `12:45` | `13:15` |
| 2 | `13:30` | `14:00` |

### Test data — Exception

| Field | Value |
|-------|--------|
| Prayer | Maghrib |
| Override jamaat | `18:25` |
| Date | today |
| Reason | `Client Maghrib override test` |

### Test data — Template

| Field | Value |
|-------|--------|
| Name | `Winter Timetable` |
| Action | Generate next 7 days + publish |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.2.1 | admin | PrayerTimes ON for mosque 115 | Enabled | ☐ |
| 3.2.2 | prayereditor | `/dashboard/prayer-editor/daily` → enter daily times → Publish | Saved | ☐ |
| 3.2.3 | guest | Public mosque prayer section | Shows published times | ☐ |
| 3.2.4 | prayereditor | Add Jumuah slot 1 and 2 | 2 slots saved | ☐ |
| 3.2.5 | prayereditor | Add Maghrib exception 18:25 | Saved | ☐ |
| 3.2.6 | guest | Public daily for today | Maghrib shows **18:25** | ☐ |
| 3.2.7 | mosqueadmin | Create Winter Timetable → generate 7 days | Rows created | ☐ |
| 3.2.8 | prayereditor | Open templates screen | Access denied | ☐ |
| 3.2.9 | prayereditor | Monthly view + Audit log | Data visible | ☐ |
| 3.2.10 | guest | Public page countdown | Next prayer countdown works | ☐ |

**Module 3.2 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.3 — Announcements

### Purpose
Create / edit / publish / unpublish; featured on homepage.

### Test data

| Field | Value |
|-------|--------|
| Title | `Community Iftar Reminder` |
| Summary | `Join us for community iftar after Maghrib.` |
| Body | `Please bring a dish to share. Sisters hall open from 7pm.` |
| Featured | `Yes` |
| Image | any mosque image URL |
| Status path | Draft → Published → Unpublished → Published |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.3.1 | admin | Announcements ON | Enabled | ☐ |
| 3.3.2 | mosqueadmin | Create announcement as Draft | Status Draft | ☐ |
| 3.3.3 | mosqueadmin | Edit: featured + image | Updated | ☐ |
| 3.3.4 | mosqueadmin | Publish | On public list | ☐ |
| 3.3.5 | guest | Open detail | Title, summary, image, date | ☐ |
| 3.3.6 | guest | Mosque home | Featured announcement shows | ☐ |
| 3.3.7 | mosqueadmin | Unpublish | Public detail hidden | ☐ |
| 3.3.8 | mosqueadmin | Publish again | Visible again | ☐ |

**Module 3.3 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.4 — Events

### Purpose
Public events list/detail; type; recurring flag; optional guided reading.

### Test data

| Field | Value |
|-------|--------|
| Title | `Mawlid Night Gathering` |
| Type | `Mawlid` |
| Date | today |
| Start time | `19:15` |
| End time | `21:00` |
| Location | `Main Prayer Hall` |
| Speaker | `Shaykh Demo` (optional) |
| Recurring | `Yes` |
| Guided reading | link Wird collection if available |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.4.1 | admin | Events ON | Enabled | ☐ |
| 3.4.2 | mosqueadmin | Create Mawlid event | Saved Scheduled | ☐ |
| 3.4.3 | guest | Events list | Event appears | ☐ |
| 3.4.4 | guest | Event detail | Date, time, location, type | ☐ |
| 3.4.5 | guest | Mosque home | Upcoming events | ☐ |
| 3.4.6 | mosqueadmin | Edit title or time | Updates | ☐ |

**Module 3.4 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.5 — Madrassah

### Purpose
Students, guardians, classes, attendance, fees, notes, parent portal.

### Test data

| Item | Value |
|------|--------|
| Student name | `Ahmad Ali` |
| Guardian user | `parent` |
| Guardian relation | `Father` |
| Class name | `Quran Level 1` |
| Teacher user | `teacher` |
| Session notes | `Morning class` |
| Attendance | Ahmad = `PRESENT` |
| Fee 1 | amount `25` → mark **Paid** |
| Fee 2 | amount `30` → leave **Unpaid** |
| Progress note | `Good progress on Surah Al-Fatiha` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.5.1 | admin | Madrassah ON | Enabled | ☐ |
| 3.5.2 | mosqueadmin | Create student Ahmad Ali | Created | ☐ |
| 3.5.3 | mosqueadmin | Link parent as Father | Linked | ☐ |
| 3.5.4 | mosqueadmin | Create class + assign teacher | Created | ☐ |
| 3.5.5 | mosqueadmin | Enrol Ahmad | Enrolled | ☐ |
| 3.5.6 | teacher | Create session today | Session exists | ☐ |
| 3.5.7 | teacher | Mark PRESENT | Saved | ☐ |
| 3.5.8 | mosqueadmin | Add fee 25 paid + fee 30 unpaid | Both exist | ☐ |
| 3.5.9 | teacher | Add progress note | Saved | ☐ |
| 3.5.10 | mosqueadmin | Open dashboard | Attendance rate + unpaid fees | ☐ |
| 3.5.11 | parent | My children / parent portal | Sees Ahmad | ☐ |

**Module 3.5 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.6 — Communities

### Purpose
Study circle / tariqa, invite, feed, resources, link event.

### Test data

| Item | Value |
|------|--------|
| Community 1 name | `Friday Study Circle` |
| Community 1 type | `StudyCircle` |
| Community 2 name | `BaAlawi Circle` |
| Community 2 type | `Tariqa` |
| Invite user | `member` as role `Member` |
| Feed post | any text + hadith ref `Ibn Majah 224` |
| Resource title | `Weekly notes` |
| Resource URL | `https://example.org/notes` |
| Link | attach an existing event |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.6.1 | admin | Communities ON | Enabled | ☐ |
| 3.6.2 | mosqueadmin | Create Friday Study Circle | Listed | ☐ |
| 3.6.3 | mosqueadmin | Create BaAlawi Circle | Listed | ☐ |
| 3.6.4 | mosqueadmin | Invite member | Joined | ☐ |
| 3.6.5 | mosqueadmin/member | Post feed with hadith ref | Visible | ☐ |
| 3.6.6 | mosqueadmin | Add resource | Visible | ☐ |
| 3.6.7 | mosqueadmin | Link community → event | Linked | ☐ |

**Module 3.6 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.7 — Awrad & Wird

### Purpose
Content items, collections, guided reading, schedule, recommended-now.

### Test data

| Field | Value |
|-------|--------|
| Content title | `Test Salawat` |
| Arabic | `اللهم صل على محمد` |
| Transliteration | `Allahumma salli ala Muhammad` |
| Translation | `O Allah send blessings upon Muhammad` |
| Repeat | `10` |
| Collection name | `Demo Daily Wird` |
| Steps | 5 ordered steps |
| Member level | `Beginner` |
| Member mode | `Quick` |
| Schedule slot | `AfterMaghrib` (or any) |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.7.1 | admin | Awrad ON | Enabled | ☐ |
| 3.7.2 | editor | Create content item | Saved | ☐ |
| 3.7.3 | editor | Create collection + 5 steps | Ordered | ☐ |
| 3.7.4 | editor | Publish collection | Published | ☐ |
| 3.7.5 | member | Set Beginner + Quick | Saved | ☐ |
| 3.7.6 | member | Assign to prayer slot | On schedule | ☐ |
| 3.7.7 | member | Start guided reading | Steps trimmed | ☐ |
| 3.7.8 | member | Complete collection | Completion recorded | ☐ |
| 3.7.9 | member | Recommended-now | Returns a collection | ☐ |

**Module 3.7 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.8 — Daily Adhkar

### Purpose
Library, personal counters, occasions, custom dhikr, My Wird summary.

### Test data

| Field | Value |
|-------|--------|
| Library title | `Astaghfirullah` |
| Target count | `50` |
| Prayer slot | `AfterFajr` |
| Occasion | `Always` |
| Extra item occasion | `Friday` |
| Counter actions | +1 then +10 |
| Expected label | `11/50` |
| Custom title | `My Custom Dhikr` |
| Custom target | `33` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.8.1 | admin | Adhkar ON | Enabled | ☐ |
| 3.8.2 | editor | Create + publish Astaghfirullah | In library | ☐ |
| 3.8.3 | member | Add to My Adhkar | On list | ☐ |
| 3.8.4 | member | +1 then +10 | Label `11/50` | ☐ |
| 3.8.5 | member | Add Friday-occasion item | Filters OK | ☐ |
| 3.8.6 | member | Add custom dhikr | Saved | ☐ |
| 3.8.7 | member | Open My Wird | Adhkar summary card | ☐ |

**Module 3.8 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.9 — Duas Library

### Purpose
Categories, collections, one home recommended dua, insert into awrad.

### Test data

| Field | Value |
|-------|--------|
| Title | `Friday Mosque Dua` |
| Arabic | `Allahumma barik` |
| Transliteration | `Allahumma barik lana fi yawmil jumuah` |
| Translation | `O Allah bless us on Friday` |
| Source name | `Ghazali` |
| Source ref | `Ihya` |
| Category | `mosque` |
| Tags | `friday,ghazali` |
| Collection name | `Duas for Hardship` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.9.1 | admin | Duas ON | Enabled | ☐ |
| 3.9.2 | editor | Create + publish dua | Published | ☐ |
| 3.9.3 | guest/member | Browse duas | Grouped by category | ☐ |
| 3.9.4 | member | Home / recommended | **One** dua only | ☐ |
| 3.9.5 | editor | Create collection + add dua | Item linked | ☐ |
| 3.9.6 | editor | Insert dua into awrad content | Content created | ☐ |

**Module 3.9 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.10 — Qur'an Reading

### Purpose
30-day para plan, today card, progress, min daily, reminders.

### Test data

| Field | Value |
|-------|--------|
| Plan type | `30-day` |
| Min daily paras | `0.5` |
| Reminders | `ON` |
| Action | Complete today’s para |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.10.1 | admin | Quran ON | Enabled | ☐ |
| 3.10.2 | member | Start 30-day plan (min 0.5, reminders on) | Plan created | ☐ |
| 3.10.3 | member | Open today reading card | Today’s para shown | ☐ |
| 3.10.4 | member | Complete today’s para | Progress `x/30` | ☐ |
| 3.10.5 | member | Update settings | Saved | ☐ |
| 3.10.6 | member | Home | Quran card visible | ☐ |

**Module 3.10 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.11 — Ritual Guides

### Purpose
Wudu step-by-step; link dua per step; mobile-friendly layout.

### Test data

| Field | Value |
|-------|--------|
| Guide title | `How to Perform Wudu` |
| Type | `Wudu` |
| Step title | `Intention (Niyyah)` |
| Description | `Make the intention for purification.` |
| Image URL | any image URL |
| Linked dua | `Friday Mosque Dua` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.11.1 | admin | RitualGuides ON | Enabled | ☐ |
| 3.11.2 | editor | Create/open Wudu guide | Exists | ☐ |
| 3.11.3 | editor | Add/update step with image + dua | Saved | ☐ |
| 3.11.4 | member/guest | Open guide | Clear ordered steps | ☐ |
| 3.11.5 | viewer | Check step dua | Dua shown | ☐ |

**Module 3.11 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.12 — Janaza Announcements

### Purpose
Respectful funeral notice; public details; site link; notify intent.

### Test data

| Field | Value |
|-------|--------|
| Name | `Brother Yusuf` |
| Date of death | today |
| Janaza date | today |
| Janaza time | `14:00` |
| Location | `Main Prayer Hall` |
| Burial location | `Scholemoor Cemetery` |
| Notes | `Inna lillahi wa inna ilayhi rajiun` |
| Mosque site URL | `https://alnoorbradford.org.uk/janaza` |
| Notify followers | `Yes` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.12.1 | admin | Janaza ON | Enabled | ☐ |
| 3.12.2 | mosqueadmin | Create janaza announcement | Saved | ☐ |
| 3.12.3 | guest | Public detail | Date, time, location, burial | ☐ |
| 3.12.4 | guest | Site URL | Link present | ☐ |
| 3.12.5 | UI check | Look & feel | Dignified / simple | ☐ |

**Module 3.12 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.13 — Death Readings Allocation

### Purpose
Campaign for deceased; assign readings; mark complete; community view.

### Test data

| Field | Value |
|-------|--------|
| Campaign name / deceased | `Brother Yusuf` |
| Allocation type | `YASEEN` or `PARA` |
| Assign to user | `member` |
| Status flow | ASSIGNED → COMPLETED |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.13.1 | admin | DeathReadings ON | Enabled | ☐ |
| 3.13.2 | mosqueadmin | Create campaign | Active | ☐ |
| 3.13.3 | mosqueadmin | Assign to member | Status ASSIGNED | ☐ |
| 3.13.4 | member | Mark COMPLETED | Status Completed | ☐ |
| 3.13.5 | viewer | Community participation view | Shows completers | ☐ |

**Module 3.13 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.14 — Community Participation

### Purpose
Post opportunities; register interest; Class type for classes link.

### Test data

| Title | Type | Description |
|-------|------|-------------|
| `Mosque Garden Volunteering` | `Volunteering` | `Help tend the courtyard garden after Maghrib` |
| `Weekend Quran Class` | `Class` | `Open class - links to madrassah/classes` |

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.14.1 | admin | Participation ON | Enabled | ☐ |
| 3.14.2 | mosqueadmin | Post volunteering opportunity | Active | ☐ |
| 3.14.3 | member | Browse opportunities | Sees list | ☐ |
| 3.14.4 | member | Register interest | Saved | ☐ |
| 3.14.5 | mosqueadmin | Post Class-type opportunity | Created | ☐ |
| 3.14.6 | member | Register on Class | Registered | ☐ |

**Module 3.14 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# MODULE 3.15 — Umrah & Hajj Guides

### Purpose
Journey guides with stages and duas; calm mobile reading.

### Test data / expect

| Guide | Stages to verify |
|-------|------------------|
| Umrah | pre-departure, ihram, tawaf, sa'i, halq, completion |
| Hajj | days 8, 9, 10, 11, 12, 13 Dhul Hijjah |

Each stage: title + description + duas/notes.

### Steps

| Step | Login | Action | Expected | Pass |
|------|-------|--------|----------|------|
| 3.15.1 | admin | JourneyGuides ON | Enabled | ☐ |
| 3.15.2 | guest/member | List Umrah guides | Umrah listed | ☐ |
| 3.15.3 | open Umrah | Read stages | Stages + duas present | ☐ |
| 3.15.4 | open Hajj | Read day stages | Days 8–13 + duas/notes | ☐ |
| 3.15.5 | mobile width | Read guide | Readable, calm tone | ☐ |

**Module 3.15 result:** Pass ☐ · Fail ☐ · Notes: ____________

---

# FINAL SYSTEM CHECK

| Step | Action | Expected | Pass |
|------|--------|----------|------|
| F.1 | Guest: public mosque 115 | Prayer / announcements / events if ON | ☐ |
| F.2 | member home / Today | One recommended dua + Quran card | ☐ |
| F.3 | Turn one module OFF | Feature disappears | ☐ |
| F.4 | Turn module ON again | Feature returns | ☐ |

---

# MODULE-BY-MODULE TEST DATA SUMMARY

| Module | Copy-paste test data |
|--------|----------------------|
| **3.1** | Client Demo Mosque · Bradford · 12 High Street · BD1 1AA · 01274123456 · email empty · claim Imam / 07123456789 |
| **3.2** | Fajr 05:30/05:45 · Dhuhr 12:30/13:00 · Asr 15:30/16:00 · Maghrib 18:00/18:10 · Isha 19:30/20:00 · Jumuah 12:45/13:15 & 13:30/14:00 · Maghrib exception 18:25 · Winter Timetable |
| **3.3** | Community Iftar Reminder · featured Yes · Draft→Published→Unpublished→Published |
| **3.4** | Mawlid Night Gathering · Mawlid · today 19:15–21:00 · Main Prayer Hall · recurring Yes |
| **3.5** | Ahmad Ali · parent/Father · Quran Level 1 · teacher · PRESENT · £25 paid / £30 unpaid · Al-Fatiha note |
| **3.6** | Friday Study Circle · BaAlawi Circle · invite member · Ibn Majah 224 · Weekly notes · link event |
| **3.7** | Test Salawat · Demo Daily Wird (5 steps) · Beginner + Quick · AfterMaghrib |
| **3.8** | Astaghfirullah target 50 · +1/+10 → 11/50 · Friday occasion · My Custom Dhikr 33 |
| **3.9** | Friday Mosque Dua · category mosque · tags friday,ghazali · Duas for Hardship |
| **3.10** | 30-day · minDaily 0.5 · reminders ON · complete today |
| **3.11** | How to Perform Wudu · Intention (Niyyah) · image + Friday Mosque Dua |
| **3.12** | Brother Yusuf · today 14:00 · Main Prayer Hall · Scholemoor · site URL · notify Yes |
| **3.13** | Campaign Brother Yusuf · YASEEN/PARA → member → COMPLETED |
| **3.14** | Mosque Garden Volunteering · Weekend Quran Class (Class) · member register |
| **3.15** | Umrah stages ihram→halq · Hajj days 8–13 with duas |

---

# SCORECARD

| Module | Pass | Fail | Tester notes |
|--------|:----:|:----:|--------------|
| 3.1 Mosque Profile | ☐ | ☐ | |
| 3.2 Prayer Times | ☐ | ☐ | |
| 3.3 Announcements | ☐ | ☐ | |
| 3.4 Events | ☐ | ☐ | |
| 3.5 Madrassah | ☐ | ☐ | |
| 3.6 Communities | ☐ | ☐ | |
| 3.7 Awrad & Wird | ☐ | ☐ | |
| 3.8 Daily Adhkar | ☐ | ☐ | |
| 3.9 Duas Library | ☐ | ☐ | |
| 3.10 Qur'an Reading | ☐ | ☐ | |
| 3.11 Ritual Guides | ☐ | ☐ | |
| 3.12 Janaza | ☐ | ☐ | |
| 3.13 Death Readings | ☐ | ☐ | |
| 3.14 Participation | ☐ | ☐ | |
| 3.15 Umrah & Hajj | ☐ | ☐ | |

**Date tested:** ____________  
**Tester name:** ____________  
**Overall:** Pass ☐ · Fail ☐  

---

## Optional auto-seed scripts (then use UI checklist above)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module31-tests.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module32-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module33-34-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module35-36-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module37-38-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module39-315-setup-test.ps1
```

---

*Next (when you ask): make the Angular app fully mobile responsive.*
