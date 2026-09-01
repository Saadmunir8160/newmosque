# MosqueOS — Manual Test Data Pack (Modules 3.2 → 3.15)

Use this pack to test the live system. All demo content is scoped to **mosque 115**.

| Item | Value |
|------|--------|
| **Mosque** | Masjid Al Noor Bradford |
| **Mosque id** | `115` |
| **Slug** | `masjid-al-noor-bradford` |
| **Public URL** | http://localhost:4200/mosque/masjid-al-noor-bradford |
| **API** | http://localhost:5000 |
| **Frontend** | http://localhost:4200 |

**Before you start:** API + frontend running. If login returns 429, restart the API and wait ~1 minute.

---

## Shared logins

| Role | Username | Password | Modules |
|------|----------|----------|---------|
| Super Admin | `admin` | `Admin@123` | Enable module flags |
| Mosque Admin | `mosqueadmin` | `Admin@123` | 3.3, 3.4, 3.5, 3.6, 3.12–3.14 |
| Prayer Editor | `prayereditor` | `Prayer@123` | 3.2 daily / jumuah / exceptions |
| Content Editor | `editor` | `Editor@123` | 3.7–3.11, 3.15 |
| Teacher | `teacher` | `Teacher@123` | 3.5 attendance / notes |
| Parent | `parent` | `Parent@123` | 3.5 parent portal |
| Member | `member` | `Member@123` | 3.7–3.10, 3.13–3.14 home |
| Owner | `owner` | `Owner@123` | optional owner checks |
| Muqaddam | `muqaddam` | `Muqaddam@123` | 3.6 invite (optional) |

**Enable modules (as `admin`):** Settings for mosque 115 → turn ON each module you test.

---

## Module 3.2 — Prayer Times

**Login:** `prayereditor` / `Prayer@123`  
**UI:** `/dashboard/prayer-editor/daily`

### Daily times (publish)

| Prayer | Start | Jamaat |
|--------|-------|--------|
| Fajr | 05:30 | 05:45 |
| Dhuhr | 12:30 | 13:00 |
| Asr | 15:30 | 16:00 |
| Maghrib | 18:00 | 18:10 |
| Isha | 19:30 | 20:00 |

### Jumuah (2 slots)

| Slot | Khutbah | Jamaat |
|------|---------|--------|
| 1 | 12:45 | 13:15 |
| 2 | 13:30 | 14:00 |

### Exception
- Prayer: **Maghrib**
- Override jamaat: **18:25**
- Reason: `Client Maghrib override test`

### Template (login `mosqueadmin`)
- Name: `Winter Timetable`
- Generate next 7 days + publish

### Check
- Public mosque page shows daily times  
- Maghrib shows **18:25** when exception is for today  
- Editor **cannot** open templates (403 / no access)

---

## Module 3.3 — Announcements

**Login:** `mosqueadmin` / `Admin@123`  
**UI:** `/dashboard/admin/announcements`

| Field | Value |
|-------|--------|
| Title | `Community Iftar Reminder` |
| Summary | `Join us for community iftar after Maghrib.` |
| Body | `Please bring a dish to share. Sisters hall open from 7pm.` |
| Status flow | Draft → **Published** → Unpublished → Published |
| Featured | **Yes** |
| Image | any mosque image URL |

### Check
- `/dashboard/announcements` lists published  
- Public home shows featured  
- Unpublish → public detail hidden

---

## Module 3.4 — Events

**Login:** `mosqueadmin`  
**UI:** `/dashboard/admin/events`

| Field | Value |
|-------|--------|
| Title | `Mawlid Night Gathering` |
| Type | **Mawlid** |
| Date | today |
| Start / End | 19:15 – 21:00 |
| Location | Main Prayer Hall |
| Recurring | Yes |
| Guided reading | link Wird collection if available (e.g. Mawlid Night Reading) |

### Check
- Public events list + detail  
- Home “upcoming events”

---

## Module 3.5 — Madrassah

**Login:** `mosqueadmin` (setup) · `teacher` (attendance) · `parent` (portal)  
**UI:** `/dashboard/admin/madrassah`

| Item | Value |
|------|--------|
| Student name | `Ahmad Ali` |
| DOB / notes | any valid |
| Guardian | link user `parent` as **Father** |
| Class | `Quran Level 1` |
| Teacher | `teacher` |
| Enrol | Ahmad → Quran Level 1 |
| Session | today, notes `Morning class` |
| Attendance | Ahmad = **PRESENT** |
| Fee 1 | amount `25`, mark **Paid** |
| Fee 2 | amount `30`, leave **Unpaid** |
| Progress note | `Good progress on Surah Al-Fatiha` |

### Check
- Admin dashboard: attendance rate + unpaid fees  
- `parent` → my children shows Ahmad  
- Teacher can mark attendance

---

## Module 3.6 — Communities

**Login:** `mosqueadmin`  
**UI:** `/dashboard/admin/communities` or member communities

| Item | Value |
|------|--------|
| Study circle | Name `Friday Study Circle`, type **StudyCircle** |
| Tariqa | Name `BaAlawi Circle`, type **Tariqa** |
| Invite | member as **Member** |
| Feed post | text + hadith ref `Ibn Majah 224` |
| Resource | title `Weekly notes`, URL any |
| Link event | attach an existing event |

### Check
- List communities (mosque-linked)  
- Feed + resources visible to members

---

## Module 3.7 — Awrad & Wird

**Login:** `editor` (content) · `member` (guided)  
**UI:** `/dashboard/content/awrad` · `/dashboard/member/wird`

| Item | Value |
|------|--------|
| Content title | `Test Salawat` |
| Arabic | `اللهم صل على محمد` |
| Transliteration | `Allahumma salli ala Muhammad` |
| Translation | `O Allah send blessings upon Muhammad` |
| Repeat | 10 |
| Collection | `Demo Daily Wird` (5 ordered steps) |
| Publish | Yes |
| Member prefs | Level **Beginner**, mode **Quick** |
| Schedule | assign collection to AfterMaghrib (or any slot) |

### Check
- Guided path shorter for Beginner / Quick  
- Complete collection  
- Recommended-now returns something sensible

---

## Module 3.8 — Daily Adhkar

**Login:** `editor` · `member`  
**UI:** `/dashboard/member/adhkar`

| Item | Value |
|------|--------|
| Library title | `Astaghfirullah` |
| Target | 50 |
| Slot | AfterFajr |
| Occasion | Always / also add a **Friday** item |
| Publish | Yes |
| Member add | from library |
| Counter | +1 then +10 → label like `11/50` |
| Custom | title `My Custom Dhikr`, target 33 |

### Check
- My Wird shows adhkar summary  
- Occasion filter works

---

## Module 3.9 — Duas Library

**Login:** `editor` · `member`  
**Browse:** duas browse page / home

| Field | Value |
|-------|--------|
| Title | `Friday Mosque Dua` |
| Arabic | `Allahumma barik` |
| Transliteration | `Allahumma barik lana fi yawmil jumuah` |
| Translation | `O Allah bless us on Friday` |
| Source | Ghazali / Ihya |
| Category | **mosque** |
| Tags | `friday,ghazali` |
| Publish | Yes |
| Collection | `Duas for Hardship` + add this dua |

### Check
- Browse organised by **category** (not flat list)  
- Home shows **one** recommended dua  
- Can insert dua into awrad content (editor)

---

## Module 3.10 — Qur'an Reading

**Login:** `member`  
**UI:** home / quran today card

| Field | Value |
|-------|--------|
| Plan type | **30-day** (1 para/day default) |
| Min daily | **0.5** para |
| Reminders | ON |
| Action | Complete today’s para |

### Check
- Today card shows today’s para  
- Progress label `x/30`  
- Settings update min daily + reminders

---

## Module 3.11 — Ritual Guides

**Login:** `editor`  
**UI:** ritual / wudu guide

| Field | Value |
|-------|--------|
| Guide | `How to Perform Wudu` type **Wudu** |
| Step 1 title | `Intention (Niyyah)` |
| Description | `Make the intention for purification.` |
| Image URL | any image |
| Linked dua | Friday Mosque Dua (or any published dua) |

### Check
- Steps ordered, large/mobile-friendly  
- Step shows linked dua when set

---

## Module 3.12 — Janaza Announcements

**Login:** `mosqueadmin`  
**UI:** admin janaza

| Field | Value |
|-------|--------|
| Name | `Brother Yusuf` |
| Date of death | today |
| Janaza date | today |
| Janaza time | 14:00 |
| Location | Main Prayer Hall |
| Burial | Scholemoor Cemetery |
| Notes | `Inna lillahi wa inna ilayhi rajiun` |
| Mosque site URL | `https://alnoorbradford.org.uk/janaza` |
| Notify followers | Yes |

### Check
- Public view: date, time, location, burial  
- Simple / dignified UI  
- Site link present

---

## Module 3.13 — Death Readings Allocation

**Login:** `mosqueadmin` (create) · `member` (complete)

| Field | Value |
|-------|--------|
| Campaign | deceased name `Brother Yusuf` (or matching janaza) |
| Active | Yes |
| Allocation type | **YASEEN** or **PARA** |
| Assign to | `member` |
| Member action | mark **COMPLETED** |

### Check
- Community participation view (who completed)  
- Status ASSIGNED → COMPLETED

---

## Module 3.14 — Community Participation

**Login:** `mosqueadmin` · `member`

| Opportunity | Type | Details |
|-------------|------|---------|
| Mosque Garden Volunteering | **Volunteering** | After Maghrib, courtyard garden |
| Weekend Quran Class | **Class** | Open class (Classes integration) |

### Check
- Member browses active list  
- Member registers interest  
- Status recorded on registration

---

## Module 3.15 — Umrah & Hajj Guides

**Login:** guest or `member` / editor for ensure

| Guide | What to verify |
|-------|----------------|
| **Umrah** | Stages: pre-departure, ihram, tawaf, sa'i, halq, completion + duas |
| **Hajj** | Days **8–13** Dhul Hijjah with notes/duas |

### Check
- Mobile-friendly reading  
- Each stage has description + duas/notes  
- Calm tone (no gamification)

---

## Suggested test order (1–2 hours)

1. Enable all needed modules (`admin`)  
2. **3.2** prayer times + public check  
3. **3.3 + 3.4** announcement + Mawlid event  
4. **3.5 + 3.6** student/class + study circle  
5. **3.7 + 3.8** wird + adhkar counter  
6. **3.9–3.11** dua + quran card + wudu  
7. **3.12–3.14** janaza + readings + volunteering  
8. **3.15** Umrah/Hajj stages  
9. Public slug page + member home (`member`)

---

## Optional: auto-seed then manual UI check

With API on `:5000`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module32-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module33-34-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module35-36-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module37-38-setup-test.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-module39-315-setup-test.ps1
```

Then walk the UI using the same titles above (scripts create `M33` / `M35` / `M39` prefixed names).

---

## Pass checklist (print / tick)

| Module | Pass? | Notes |
|--------|-------|-------|
| 3.2 Prayer Times | ☐ | |
| 3.3 Announcements | ☐ | |
| 3.4 Events | ☐ | |
| 3.5 Madrassah | ☐ | |
| 3.6 Communities | ☐ | |
| 3.7 Awrad / Wird | ☐ | |
| 3.8 Adhkar | ☐ | |
| 3.9 Duas | ☐ | |
| 3.10 Qur'an | ☐ | |
| 3.11 Ritual Guides | ☐ | |
| 3.12 Janaza | ☐ | |
| 3.13 Death Readings | ☐ | |
| 3.14 Participation | ☐ | |
| 3.15 Umrah / Hajj | ☐ | |
