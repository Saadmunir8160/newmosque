# MosqueOS — Module Requirements Specification

**Version:** 1.0  
**Status:** MVP  
**Stack:** ASP.NET Core (.NET 8) · Angular 17 · SQL Server · JWT + ASP.NET Identity

---

## Roles Reference

| Role                | Scope                                                        |
|---------------------|--------------------------------------------------------------|
| Super Admin         | Platform-level management, multi-mosque oversight            |
| Mosque Owner        | Claim and own a mosque profile                               |
| Mosque Admin        | Manage all mosque content, prayer times, events              |
| Prayer Times Editor | Update jamaah times only                                     |
| Teacher             | Manage madrassah classes, attendance, progress               |
| Muqaddam            | Tariqa leadership; view murid progress summaries             |
| Content Editor      | Manage spiritual content, awrad, duas, articles              |
| Parent              | View child's madrassah attendance, fees, progress            |
| Member              | Browse public content, follow guided readings, manage wird   |

---

## Module 3.1 — Mosque Profile

Core identity of each mosque. Public-facing with admin management.

### Data Model

| Field          | Type         | Notes                              |
|----------------|--------------|------------------------------------|
| id             | UUID / int   | PK                                 |
| name           | string       | Required                           |
| slug           | string       | Unique, URL-safe                   |
| address        | string       |                                    |
| city           | string       | Indexed for search                 |
| postcode       | string       |                                    |
| country        | string       |                                    |
| phone          | string       |                                    |
| email          | string       |                                    |
| website        | string       |                                    |
| social_links   | JSON         | Twitter, Facebook, Instagram       |
| description    | text         |                                    |
| logo_url       | string       |                                    |
| banner_url     | string       |                                    |
| timezone       | string       | Default: `Europe/London`           |
| status         | enum         | `UNCLAIMED \| CLAIMED \| ACTIVE`    |
| owner_id       | FK → User    | Nullable until claimed             |

### Functional Requirements

- Public mosque profile page at `/mosque/[slug]`
- Admin can edit all mosque details
- Super Admin can manually seed a mosque listing
- Mosque admins can claim an existing unclaimed listing
- Verification flow after claim (manual approval — MVP)
- Per-mosque feature flags to enable/disable individual modules

### Role Access

| Action                  | Roles Permitted                        |
|-------------------------|----------------------------------------|
| View public profile     | All (public)                           |
| Edit mosque details     | Super Admin, Mosque Owner, Mosque Admin |
| Seed new mosque         | Super Admin                            |
| Submit ownership claim  | Any authenticated user                 |
| Approve/reject claim    | Super Admin                            |
| Toggle module flags     | Super Admin, Mosque Owner              |

---

## Module 3.2 — Prayer Times

Daily and monthly prayer timetable with jamaah times.

### Data Model

**prayer_times_daily**

| Field           | Type      | Notes                    |
|-----------------|-----------|--------------------------|
| mosque_id       | FK        |                          |
| date            | date      |                          |
| fajr_start      | time      |                          |
| fajr_jamaat     | time      |                          |
| dhuhr_start     | time      |                          |
| dhuhr_jamaat    | time      |                          |
| asr_start       | time      |                          |
| asr_jamaat      | time      |                          |
| maghrib_start   | time      |                          |
| maghrib_jamaat  | time      |                          |
| isha_start      | time      |                          |
| isha_jamaat     | time      |                          |

**jumuah_times** — `mosque_id, khutbah_time, jamaat_time, slot_number`  
**jamaah_templates** — `mosque_id, name, recurring rules`  
**prayer_exceptions** — `mosque_id, date, prayer, override_value, reason`

### Functional Requirements

- Public daily timetable page
- Monthly timetable view
- Next prayer countdown (client-side, `Europe/London`)
- Admin direct daily editing
- Recurring template system to auto-generate daily rows
- Exception support for Ramadan, Fridays, special dates
- Audit log for all changes
- One or more Jumuah time slots per mosque

### Role Access

| Action                  | Roles Permitted                                          |
|-------------------------|----------------------------------------------------------|
| View timetable          | All (public)                                             |
| Edit daily times        | Super Admin, Mosque Owner, Mosque Admin, Prayer Times Editor |
| Manage templates        | Super Admin, Mosque Owner, Mosque Admin                  |
| Add exceptions          | Super Admin, Mosque Owner, Mosque Admin, Prayer Times Editor |

---

## Module 3.3 — Announcements

Mosque news, notices, and updates.

### Data Model

| Field        | Type    | Notes                              |
|--------------|---------|------------------------------------|
| id           | int     | PK                                 |
| mosque_id    | FK      |                                    |
| title        | string  | Required                           |
| summary      | string  | Short preview text                 |
| body         | text    | Full content                       |
| image_url    | string  | Optional                           |
| status       | enum    | `DRAFT \| PUBLISHED \| UNPUBLISHED` |
| is_featured  | bool    | Shown on homepage                  |
| published_at | datetime|                                    |
| created_by   | FK→User |                                    |

### Functional Requirements

- Admin: create, edit, publish, unpublish, delete
- Public list and detail pages
- Featured announcement section on mosque homepage
- Announcement cards: title, summary, optional image, date

### Role Access

| Action              | Roles Permitted                                       |
|---------------------|-------------------------------------------------------|
| View published      | All (public)                                          |
| Create / Edit       | Super Admin, Mosque Owner, Mosque Admin, Content Editor |
| Publish / Unpublish | Super Admin, Mosque Owner, Mosque Admin               |
| Delete              | Super Admin, Mosque Owner, Mosque Admin               |

---

## Module 3.4 — Events

Mosque events: talks, gatherings, special nights.

### Data Model

| Field        | Type    | Notes                                              |
|--------------|---------|----------------------------------------------------|
| id           | int     | PK                                                 |
| mosque_id    | FK      |                                                    |
| title        | string  | Required                                           |
| description  | text    |                                                    |
| date         | date    |                                                    |
| time         | time    |                                                    |
| end_time     | time    |                                                    |
| location     | string  |                                                    |
| speaker      | string  |                                                    |
| is_recurring | bool    | Flag only — not enforced in v1                     |
| status       | enum    | `Scheduled \| Cancelled \| Completed`              |
| event_type   | enum    | `GENERAL \| MAWLID \| DHIKR \| CLASS \| JUMUAH \| OTHER` |

### Functional Requirements

- Public event list and detail pages
- Admin create / edit / delete
- Recurring flag stored but not enforced in v1
- Events linkable to Awrad guided reading sequences

### Role Access

| Action              | Roles Permitted                                       |
|---------------------|-------------------------------------------------------|
| View events         | All (public)                                          |
| Create / Edit       | Super Admin, Mosque Owner, Mosque Admin, Content Editor |
| Delete              | Super Admin, Mosque Owner, Mosque Admin               |

---

## Module 3.5 — Madrassah Management

Student, teacher, class, attendance, and fee management.

### Data Model

- **students** — `id, name, dob, gender, user_id (optional)`
- **guardians** — `id, user_id, student_id, relationship`
- **classes** — `id, mosque_id, name, teacher_id, schedule`
- **enrolments** — `student_id, class_id, enrolled_at, status`
- **attendance_sessions** — `class_id, date, notes`
- **attendance_records** — `session_id, student_id, status: PRESENT | ABSENT | LATE`
- **fees** — `student_id, amount, due_date, paid_at, status`
- **progress_notes** — `student_id, class_id, note, created_by`

### Functional Requirements

- Admin: manage students, guardians, teachers, classes
- Enrol students into classes
- Record attendance per session
- Simple fee tracking (paid / unpaid / overdue)
- Progress notes per student per class
- Parent portal: view child's attendance, fees, progress
- Dashboard summaries: attendance rates, fee status

### Role Access

| Action                   | Roles Permitted                                  |
|--------------------------|--------------------------------------------------|
| Manage students/classes  | Super Admin, Mosque Owner, Mosque Admin, Teacher |
| Record attendance        | Teacher                                          |
| View child's records     | Parent                                           |
| Manage fees              | Super Admin, Mosque Owner, Mosque Admin          |
| Write progress notes     | Teacher                                          |

---

## Module 3.6 — Communities

Groups and circles within or linked to a mosque.

### Community Types
`Tariqa | Class | Youth Group | Sisters Group | Study Circle | Madrassah Group`

### Data Model

- **communities** — `id, mosque_id (optional), name, type, description, is_public`
- **community_members** — `community_id, user_id, role: ADMIN | TEACHER | MEMBER`
- **community_posts** — `id, community_id, author_id, content, created_at`
- **community_resources** — `id, community_id, title, url, type`
- **community_events** — `community_id, event_id`

### Functional Requirements

- Create and list communities
- Member roles: admin, teacher, member
- Join or invite members
- Feed posts (text-based — no media upload in MVP)
- Resources section per community
- Optional link to a mosque
- Hadith references where applicable

### Role Access

| Action               | Roles Permitted                                    |
|----------------------|----------------------------------------------------|
| Create community     | Super Admin, Mosque Owner, Mosque Admin, Muqaddam  |
| Post in community    | Community members with ADMIN or TEACHER role       |
| Join community       | Any authenticated Member                           |
| Manage members       | Community ADMIN, Mosque Admin, Super Admin         |

---

## Module 3.7 — Awrad & Wird

Structured daily and event-based spiritual reading system.

### Data Model

- **content_items** — `id, title, arabic_text, transliteration, translation, repeat_count, audio_url, source_ref, type`
- **wird_collections** — `id, name, tariqa (BA_ALAWI | SHADHILI | GENERAL), type (DAILY | WEEKLY | EVENT), recommended_time`
- **wird_steps** — `id, collection_id, content_item_id, order_index, custom_instructions`
- **user_wird_schedules** — `user_id, prayer_slot, collection_id, mode (FULL | QUICK)`
- **user_wird_progress** — `user_id, collection_id, completed, last_completed_at`

### Functional Requirements

- Structured wird collections (e.g. Khulasa Wird)
- Ordered step-by-step guided reading
- Arabic text, transliteration, translation toggles
- Repeat count display per item
- Audio playback per item (URL-based)
- Completion state at end of collection
- Wird Builder: admin assigns passages to prayer slots
- Mawlid Schedule Builder: Thursday/event sequences
- Recommended-now logic: surface correct wird by time of day and day of week
- Path-specific content: Ba'alawi vs Shadhili defaults
- User level (BEGINNER | REGULAR | ADVANCED) adjusts sequence length

### Role Access

| Action                   | Roles Permitted                                         |
|--------------------------|---------------------------------------------------------|
| View / follow wird       | Member (authenticated)                                  |
| Build/edit collections   | Super Admin, Content Editor, Muqaddam                  |
| Assign to prayer slots   | Super Admin, Mosque Admin, Muqaddam, Content Editor     |

---

## Module 3.8 — Daily Adhkar

Personalised dhikr counter and habit tracker.

### Data Model

- **adhkar_items** — `id, title, arabic_text, transliteration, translation, default_count, category`
- **user_adhkar** — `id, user_id, adhkar_item_id (or custom), target_count, prayer_slot, occasion`
- **user_adhkar_log** — `user_adhkar_id, date, count_completed`

### Functional Requirements

- Users build personal adhkar list
- Set target count per item
- Assign to prayer slot (optional)
- Occasion filter: `always | Friday | Ramadan | special event`
- +1 / +10 counter interaction
- Progress display: e.g. 43/50
- My Wird page shows minimal summary card — full detail in Adhkar Dashboard
- Occasion logic surfaces relevant adhkar at the right time

### Role Access

| Action              | Roles Permitted                       |
|---------------------|---------------------------------------|
| Personal adhkar     | Member (own data only)                |
| Manage adhkar items | Super Admin, Content Editor           |

---

## Module 3.9 — Duas Library

Curated supplication library with contextual recommendations.

### Data Model

- **duas** — `id, title, arabic_text, transliteration, translation, source_name, source_ref, category, tags[], tradition, audio_url`
- **dua_collections** — `id, name, description, type`
- **dua_collection_items** — `collection_id, dua_id, order_index`

### Functional Requirements

- Dua library categories: `morning | wudu | after_prayer | mosque | general | food | sleep | travel`
- Curated collections: Ghazali Supplications, Friday Duas, Duas for Hardship
- Contextual recommendations: after prayer, on Fridays, in Ramadan
- Integration into Wudu guided flow (step-by-step dua at each wudu step)
- Insertable into guided awrad/event sequences
- Home screen surfaces single most relevant dua at current time
- Browse page organised by category

### Role Access

| Action                    | Roles Permitted                         |
|---------------------------|-----------------------------------------|
| Browse / view duas        | All (public or authenticated)           |
| Create / edit duas        | Super Admin, Content Editor             |
| Manage collections        | Super Admin, Content Editor             |

---

## Module 3.10 — Qur'an Reading

Daily para reading plan with progress tracking.

### Data Model

- **quran_plans** — `id, user_id, type (30_DAY | CUSTOM), start_date`
- **quran_progress** — `plan_id, para_number, completed, completed_at`

### Functional Requirements

- 30-day para plan (1 para/day default)
- Minimum read per day configurable (less than 1 para allowed)
- Today's reading card on home screen
- Progress tracking: paras completed / 30
- Gentle reminders (optional)
- Custom plan support in v2

### Role Access

| Action              | Roles Permitted            |
|---------------------|----------------------------|
| Start / track plan  | Member (own data only)     |

---

## Module 3.11 — Ritual Guides

Step-by-step guides for wudu, ghusl, salah basics.

### Data Model

- **ritual_guides** — `id, title, type (WUDU | GHUSL | SALAH | OTHER)`
- **ritual_steps** — `id, guide_id, order_index, title, description, image_url, dua_id (FK)`

### Functional Requirements

- Beginner-friendly step-by-step wudu guide
- Each step links to relevant Ghazali dua where applicable
- Visual layout, large text, mobile-first
- Ghusl and salah guides in later phases

### Role Access

| Action              | Roles Permitted                  |
|---------------------|----------------------------------|
| View guides         | All (public)                     |
| Create / edit steps | Super Admin, Content Editor      |

---

## Module 3.12 — Janaza Announcements

Respectful death and funeral announcements.

### Data Model

- **janaza_announcements** — `id, mosque_id, name, date_of_death, janaza_date, janaza_time, location, burial_location, notes, mosque_site_url`

### Functional Requirements

- Admin posts janaza announcement
- Public view: date, time, location, burial details
- Optional push notification to mosque followers
- Link to mosque website if relevant
- Dignified, simple UI — no gamification

### Role Access

| Action              | Roles Permitted                              |
|---------------------|----------------------------------------------|
| View announcements  | All (public)                                 |
| Post / edit         | Super Admin, Mosque Owner, Mosque Admin      |
| Delete              | Super Admin, Mosque Owner, Mosque Admin      |

---

## Module 3.13 — Death Readings Allocation

Assign Qur'an portions and readings in memory of the deceased.

### Data Model

- **reading_campaigns** — `id, mosque_id, deceased_name, created_by, is_active`
- **reading_allocations** — `id, campaign_id, user_id, type (YASEEN | PARA | DUA | ADHKAR), description, status: ASSIGNED | COMPLETED`

### Functional Requirements

- Admin creates reading campaign for deceased
- Assign reading portions to individuals
- Users mark their portion as completed
- Community participation view (who has completed)
- Spiritually focused — not task-management aesthetic

### Role Access

| Action                   | Roles Permitted                             |
|--------------------------|---------------------------------------------|
| Create campaign          | Super Admin, Mosque Owner, Mosque Admin     |
| Assign portions          | Super Admin, Mosque Owner, Mosque Admin     |
| Mark portion complete    | Assigned Member                             |
| View participation       | Any authenticated Member                    |

---

## Module 3.14 — Community Participation

Encourage real-world mosque engagement.

### Data Model

- **participation_opportunities** — `id, mosque_id, title, type (CLASS | VOLUNTEERING | PROJECT | EVENT | PRAYER), description, date, is_active`
- **participation_registrations** — `opportunity_id, user_id, registered_at, status`

### Functional Requirements

- Admin posts opportunities: classes, volunteering, projects, events
- Users browse and register interest
- Encourages in-person mosque connection
- Integrated with Classes module for enrolment

### Role Access

| Action                   | Roles Permitted                              |
|--------------------------|----------------------------------------------|
| Post opportunity         | Super Admin, Mosque Owner, Mosque Admin      |
| Register interest        | Member                                       |
| View registrations       | Super Admin, Mosque Owner, Mosque Admin, Teacher |

---

## Module 3.15 — Umrah & Hajj Guides

Step-by-step spiritual journey guides.

### Data Model

- **journey_guides** — `id, type (UMRAH | HAJJ), title`
- **journey_stages** — `id, guide_id, order_index, title, description, duas[], notes`

### Functional Requirements

- Umrah: pre-departure → ihram → tawaf → sa'i → halq → completion
- Hajj: structured by day (8th–13th Dhul Hijjah)
- Each stage includes relevant duas and readings
- Mobile-first, offline-friendly reading experience
- Calm spiritual tone throughout

### Role Access

| Action              | Roles Permitted                  |
|---------------------|----------------------------------|
| View guides         | All (public or authenticated)    |
| Create / edit       | Super Admin, Content Editor      |

---

## Role-Permission Matrix (All Modules)

| Module                     | Super Admin | Mosque Owner | Mosque Admin | Prayer Ed. | Teacher | Muqaddam | Content Ed. | Parent | Member |
|----------------------------|:-----------:|:------------:|:------------:|:----------:|:-------:|:--------:|:-----------:|:------:|:------:|
| 3.1 Mosque Profile         | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | —        | —           | —      | 👁 View |
| 3.2 Prayer Times           | ✅ Full      | ✅ Own       | ✅ Own       | ✅ Edit    | —       | —        | —           | —      | 👁 View |
| 3.3 Announcements          | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | —        | ✅ Create   | —      | 👁 View |
| 3.4 Events                 | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | —        | ✅ Create   | —      | 👁 View |
| 3.5 Madrassah              | ✅ Full      | ✅ Own       | ✅ Own       | —          | ✅ Class| —        | —           | 👁 Child| —      |
| 3.6 Communities            | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | ✅ Manage| —           | —      | ✅ Join |
| 3.7 Awrad / Wird           | ✅ Full      | —            | —            | —          | —       | ✅ Build | ✅ Build    | —      | ✅ Use  |
| 3.8 Daily Adhkar           | ✅ Full      | —            | —            | —          | —       | —        | ✅ Items    | —      | ✅ Own  |
| 3.9 Duas Library           | ✅ Full      | —            | —            | —          | —       | —        | ✅ Full     | 👁 View| 👁 View |
| 3.10 Qur'an Reading        | ✅ Full      | —            | —            | —          | —       | —        | —           | —      | ✅ Own  |
| 3.11 Ritual Guides         | ✅ Full      | —            | —            | —          | —       | —        | ✅ Full     | 👁 View| 👁 View |
| 3.12 Janaza                | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | —        | —           | —      | 👁 View |
| 3.13 Death Readings        | ✅ Full      | ✅ Own       | ✅ Own       | —          | —       | —        | —           | —      | ✅ Self |
| 3.14 Participation         | ✅ Full      | ✅ Own       | ✅ Own       | —          | 👁 View | —        | —           | —      | ✅ Register |
| 3.15 Umrah & Hajj Guides   | ✅ Full      | —            | —            | —          | —       | —        | ✅ Full     | 👁 View| 👁 View |

> Legend: ✅ = full access for that scope · 👁 = read only · — = no access
