-- =============================================
-- Mosque Operating System (MOS) Database
-- Database: mos_db
-- Platform: SQL Server (T-SQL)
-- Version: MVP v1.0
-- =============================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'mos_db')
    CREATE DATABASE mos_db;
GO

USE mos_db;
GO

-- =============================================
-- 1. CORE TABLES
-- =============================================

CREATE TABLE mosques (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    name            NVARCHAR(200)       NOT NULL,
    slug            NVARCHAR(100)       NOT NULL UNIQUE,
    address         NVARCHAR(300)       NULL,
    city            NVARCHAR(100)       NULL,
    postcode        NVARCHAR(20)        NULL,
    country         NVARCHAR(100)       NOT NULL DEFAULT 'United Kingdom',
    phone           NVARCHAR(30)        NULL,
    email           NVARCHAR(200)       NULL,
    website         NVARCHAR(300)       NULL,
    social_links    NVARCHAR(MAX)       NULL,   -- JSON
    description     NVARCHAR(MAX)       NULL,
    logo_url        NVARCHAR(500)       NULL,
    banner_url      NVARCHAR(500)       NULL,
    timezone        NVARCHAR(50)        NOT NULL DEFAULT 'Europe/London',
    status          NVARCHAR(20)        NOT NULL DEFAULT 'UNCLAIMED'
                        CHECK (status IN ('UNCLAIMED','CLAIMED','ACTIVE')),
    owner_id        UNIQUEIDENTIFIER    NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE users (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    email           NVARCHAR(300)       NOT NULL UNIQUE,
    password_hash   NVARCHAR(500)       NOT NULL,
    full_name       NVARCHAR(200)       NULL,
    role            NVARCHAR(50)        NOT NULL DEFAULT 'MEMBER'
                        CHECK (role IN ('SUPER_ADMIN','MOSQUE_ADMIN','PRAYER_EDITOR','TEACHER','MUQADDAM','CONTENT_EDITOR','PARENT','MEMBER')),
    tariqa_path     NVARCHAR(20)        NOT NULL DEFAULT 'GENERAL'
                        CHECK (tariqa_path IN ('BA_ALAWI','SHADHILI','GENERAL')),
    level           NVARCHAR(20)        NOT NULL DEFAULT 'BEGINNER'
                        CHECK (level IN ('BEGINNER','REGULAR','ADVANCED')),
    home_mosque_id  UNIQUEIDENTIFIER    NULL,
    interests       NVARCHAR(MAX)       NULL,   -- JSON array
    display_pref    NVARCHAR(20)        NOT NULL DEFAULT 'ARABIC_TRANS'
                        CHECK (display_pref IN ('ARABIC_ONLY','ARABIC_TRANS','ARABIC_TRANSLATION')),
    is_active       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_users_mosque FOREIGN KEY (home_mosque_id) REFERENCES mosques(id)
);
GO

ALTER TABLE mosques
    ADD CONSTRAINT FK_mosques_owner FOREIGN KEY (owner_id) REFERENCES users(id);
GO

CREATE TABLE mosque_settings (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    module_key      NVARCHAR(100)       NOT NULL,
    is_enabled      BIT                 NOT NULL DEFAULT 1,
    config_json     NVARCHAR(MAX)       NULL,
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_settings_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE,
    CONSTRAINT UQ_mosque_module UNIQUE (mosque_id, module_key)
);
GO

-- =============================================
-- 2. PRAYER TIMES
-- =============================================

CREATE TABLE prayer_times_daily (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    [date]          DATE                NOT NULL,
    fajr_start      TIME                NULL,
    fajr_jamaat     TIME                NULL,
    dhuhr_start     TIME                NULL,
    dhuhr_jamaat    TIME                NULL,
    asr_start       TIME                NULL,
    asr_jamaat      TIME                NULL,
    maghrib_start   TIME                NULL,
    maghrib_jamaat  TIME                NULL,
    isha_start      TIME                NULL,
    isha_jamaat     TIME                NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_prayertimes_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE,
    CONSTRAINT UQ_prayer_date UNIQUE (mosque_id, [date])
);
GO

CREATE TABLE jumuah_times (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    khutbah_time    TIME                NOT NULL,
    jamaat_time     TIME                NOT NULL,
    slot_number     INT                 NOT NULL DEFAULT 1,
    is_active       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_jumuah_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE
);
GO

CREATE TABLE prayer_exceptions (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    [date]          DATE                NOT NULL,
    prayer          NVARCHAR(20)        NOT NULL
                        CHECK (prayer IN ('FAJR','DHUHR','ASR','MAGHRIB','ISHA','JUMUAH')),
    override_value  TIME                NOT NULL,
    reason          NVARCHAR(300)       NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_exceptions_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE
);
GO

CREATE TABLE prayer_audit_log (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    changed_by      UNIQUEIDENTIFIER    NOT NULL,
    change_type     NVARCHAR(50)        NOT NULL,
    old_value       NVARCHAR(MAX)       NULL,
    new_value       NVARCHAR(MAX)       NULL,
    changed_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_audit_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id),
    CONSTRAINT FK_audit_user  FOREIGN KEY (changed_by) REFERENCES users(id)
);
GO

-- =============================================
-- 3. ANNOUNCEMENTS
-- =============================================

CREATE TABLE announcements (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    title           NVARCHAR(300)       NOT NULL,
    summary         NVARCHAR(500)       NULL,
    body            NVARCHAR(MAX)       NULL,
    image_url       NVARCHAR(500)       NULL,
    status          NVARCHAR(20)        NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','PUBLISHED','UNPUBLISHED')),
    is_featured     BIT                 NOT NULL DEFAULT 0,
    published_at    DATETIME2           NULL,
    created_by      UNIQUEIDENTIFIER    NOT NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_announce_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE,
    CONSTRAINT FK_announce_user   FOREIGN KEY (created_by) REFERENCES users(id)
);
GO

-- =============================================
-- 4. EVENTS
-- =============================================

CREATE TABLE events (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    title           NVARCHAR(300)       NOT NULL,
    description     NVARCHAR(MAX)       NULL,
    [date]          DATE                NOT NULL,
    [time]          TIME                NULL,
    end_time        TIME                NULL,
    location        NVARCHAR(300)       NULL,
    speaker         NVARCHAR(200)       NULL,
    event_type      NVARCHAR(30)        NOT NULL DEFAULT 'GENERAL'
                        CHECK (event_type IN ('GENERAL','MAWLID','DHIKR','CLASS','JUMUAH','OTHER')),
    is_recurring    BIT                 NOT NULL DEFAULT 0,
    status          NVARCHAR(20)        NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','CANCELLED','COMPLETED')),
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_events_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 5. MADRASSAH
-- =============================================

CREATE TABLE students (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    full_name       NVARCHAR(200)       NOT NULL,
    dob             DATE                NULL,
    gender          NVARCHAR(10)        NULL
                        CHECK (gender IN ('MALE','FEMALE','OTHER')),
    user_id         UNIQUEIDENTIFIER    NULL,
    is_active       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_students_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id),
    CONSTRAINT FK_students_user   FOREIGN KEY (user_id)   REFERENCES users(id)
);
GO

CREATE TABLE guardians (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    student_id      UNIQUEIDENTIFIER    NOT NULL,
    relationship    NVARCHAR(50)        NOT NULL DEFAULT 'PARENT',
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_guardians_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    CONSTRAINT FK_guardians_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT UQ_guardian_student  UNIQUE (user_id, student_id)
);
GO

CREATE TABLE classes (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    name            NVARCHAR(200)       NOT NULL,
    teacher_id      UNIQUEIDENTIFIER    NULL,
    schedule        NVARCHAR(300)       NULL,
    is_active       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_classes_mosque  FOREIGN KEY (mosque_id)  REFERENCES mosques(id) ON DELETE CASCADE,
    CONSTRAINT FK_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);
GO

CREATE TABLE enrolments (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    student_id      UNIQUEIDENTIFIER    NOT NULL,
    class_id        UNIQUEIDENTIFIER    NOT NULL,
    enrolled_at     DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    status          NVARCHAR(20)        NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','INACTIVE','COMPLETED')),
    CONSTRAINT FK_enrol_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT FK_enrol_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
    CONSTRAINT UQ_enrolment     UNIQUE (student_id, class_id)
);
GO

CREATE TABLE attendance_sessions (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    class_id        UNIQUEIDENTIFIER    NOT NULL,
    [date]          DATE                NOT NULL,
    notes           NVARCHAR(500)       NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
GO

CREATE TABLE attendance_records (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    session_id      UNIQUEIDENTIFIER    NOT NULL,
    student_id      UNIQUEIDENTIFIER    NOT NULL,
    status          NVARCHAR(10)        NOT NULL DEFAULT 'PRESENT'
                        CHECK (status IN ('PRESENT','ABSENT','LATE')),
    CONSTRAINT FK_att_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    CONSTRAINT FK_att_student FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT UQ_att_record  UNIQUE (session_id, student_id)
);
GO

CREATE TABLE fees (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    student_id      UNIQUEIDENTIFIER    NOT NULL,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    amount          DECIMAL(10,2)       NOT NULL,
    due_date        DATE                NOT NULL,
    paid_at         DATETIME2           NULL,
    status          NVARCHAR(20)        NOT NULL DEFAULT 'UNPAID'
                        CHECK (status IN ('UNPAID','PAID','WAIVED')),
    notes           NVARCHAR(300)       NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_fees_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT FK_fees_mosque  FOREIGN KEY (mosque_id)  REFERENCES mosques(id)
);
GO

CREATE TABLE progress_notes (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    student_id      UNIQUEIDENTIFIER    NOT NULL,
    class_id        UNIQUEIDENTIFIER    NOT NULL,
    note            NVARCHAR(MAX)       NOT NULL,
    created_by      UNIQUEIDENTIFIER    NOT NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_notes_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT FK_notes_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
    CONSTRAINT FK_notes_user    FOREIGN KEY (created_by) REFERENCES users(id)
);
GO

-- =============================================
-- 6. COMMUNITIES
-- =============================================

CREATE TABLE communities (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NULL,
    name            NVARCHAR(200)       NOT NULL,
    [type]          NVARCHAR(50)        NOT NULL DEFAULT 'GENERAL'
                        CHECK ([type] IN ('TARIQA','CLASS','YOUTH','SISTERS','STUDY_CIRCLE','MADRASSAH','GENERAL')),
    description     NVARCHAR(MAX)       NULL,
    is_public       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_comm_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id)
);
GO

CREATE TABLE community_members (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    community_id    UNIQUEIDENTIFIER    NOT NULL,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    role            NVARCHAR(20)        NOT NULL DEFAULT 'MEMBER'
                        CHECK (role IN ('ADMIN','TEACHER','MEMBER')),
    joined_at       DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_cm_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    CONSTRAINT FK_cm_user      FOREIGN KEY (user_id)      REFERENCES users(id),
    CONSTRAINT UQ_cm           UNIQUE (community_id, user_id)
);
GO

CREATE TABLE community_posts (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    community_id    UNIQUEIDENTIFIER    NOT NULL,
    author_id       UNIQUEIDENTIFIER    NOT NULL,
    content         NVARCHAR(MAX)       NOT NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_cp_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
    CONSTRAINT FK_cp_author    FOREIGN KEY (author_id)    REFERENCES users(id)
);
GO

CREATE TABLE community_resources (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    community_id    UNIQUEIDENTIFIER    NOT NULL,
    title           NVARCHAR(300)       NOT NULL,
    url             NVARCHAR(500)       NULL,
    resource_type   NVARCHAR(50)        NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_cr_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 7. AWRAD & WIRD
-- =============================================

CREATE TABLE content_items (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    title               NVARCHAR(300)       NOT NULL,
    arabic_text         NVARCHAR(MAX)       NULL,
    transliteration     NVARCHAR(MAX)       NULL,
    translation         NVARCHAR(MAX)       NULL,
    repeat_count        INT                 NOT NULL DEFAULT 1,
    audio_url           NVARCHAR(500)       NULL,
    source_ref          NVARCHAR(300)       NULL,
    item_type           NVARCHAR(30)        NOT NULL DEFAULT 'DHIKR'
                            CHECK (item_type IN ('DHIKR','DUA','SALAWAT','QURAN','NASHEED','OTHER')),
    created_at          DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE wird_collections (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    name                NVARCHAR(300)       NOT NULL,
    tariqa              NVARCHAR(20)        NOT NULL DEFAULT 'GENERAL'
                            CHECK (tariqa IN ('BA_ALAWI','SHADHILI','GENERAL')),
    collection_type     NVARCHAR(20)        NOT NULL DEFAULT 'DAILY'
                            CHECK (collection_type IN ('DAILY','WEEKLY','EVENT')),
    recommended_time    NVARCHAR(50)        NULL,
    description         NVARCHAR(MAX)       NULL,
    created_at          DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE wird_steps (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    collection_id       UNIQUEIDENTIFIER    NOT NULL,
    content_item_id     UNIQUEIDENTIFIER    NOT NULL,
    order_index         INT                 NOT NULL,
    custom_instructions NVARCHAR(MAX)       NULL,
    CONSTRAINT FK_ws_collection   FOREIGN KEY (collection_id)   REFERENCES wird_collections(id) ON DELETE CASCADE,
    CONSTRAINT FK_ws_content_item FOREIGN KEY (content_item_id) REFERENCES content_items(id),
    CONSTRAINT UQ_ws_order        UNIQUE (collection_id, order_index)
);
GO

CREATE TABLE user_wird_schedules (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    prayer_slot     NVARCHAR(30)        NOT NULL
                        CHECK (prayer_slot IN ('BEFORE_FAJR','AFTER_FAJR','AFTER_DHUHR','AFTER_ASR','AFTER_MAGHRIB','AFTER_ISHA','THURSDAY_NIGHT','FRIDAY')),
    collection_id   UNIQUEIDENTIFIER    NOT NULL,
    mode            NVARCHAR(10)        NOT NULL DEFAULT 'FULL'
                        CHECK (mode IN ('FULL','QUICK')),
    CONSTRAINT FK_uws_user       FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_uws_collection FOREIGN KEY (collection_id) REFERENCES wird_collections(id),
    CONSTRAINT UQ_uws            UNIQUE (user_id, prayer_slot, collection_id)
);
GO

CREATE TABLE user_wird_progress (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    collection_id       UNIQUEIDENTIFIER    NOT NULL,
    completed           BIT                 NOT NULL DEFAULT 0,
    last_completed_at   DATETIME2           NULL,
    CONSTRAINT FK_uwp_user       FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_uwp_collection FOREIGN KEY (collection_id) REFERENCES wird_collections(id),
    CONSTRAINT UQ_uwp            UNIQUE (user_id, collection_id)
);
GO

-- =============================================
-- 8. ADHKAR
-- =============================================

CREATE TABLE adhkar_items (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    title               NVARCHAR(300)       NOT NULL,
    arabic_text         NVARCHAR(MAX)       NULL,
    transliteration     NVARCHAR(MAX)       NULL,
    translation         NVARCHAR(MAX)       NULL,
    default_count       INT                 NOT NULL DEFAULT 1,
    category            NVARCHAR(50)        NULL,
    created_at          DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE user_adhkar (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    adhkar_item_id  UNIQUEIDENTIFIER    NULL,
    custom_title    NVARCHAR(300)       NULL,
    target_count    INT                 NOT NULL DEFAULT 33,
    prayer_slot     NVARCHAR(30)        NULL,
    occasion        NVARCHAR(30)        NOT NULL DEFAULT 'ALWAYS'
                        CHECK (occasion IN ('ALWAYS','FRIDAY','RAMADAN','SPECIAL')),
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_ua_user   FOREIGN KEY (user_id)        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_ua_adhkar FOREIGN KEY (adhkar_item_id) REFERENCES adhkar_items(id)
);
GO

CREATE TABLE user_adhkar_log (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_adhkar_id  UNIQUEIDENTIFIER    NOT NULL,
    log_date        DATE                NOT NULL,
    count_completed INT                 NOT NULL DEFAULT 0,
    CONSTRAINT FK_ual_user_adhkar FOREIGN KEY (user_adhkar_id) REFERENCES user_adhkar(id) ON DELETE CASCADE,
    CONSTRAINT UQ_ual            UNIQUE (user_adhkar_id, log_date)
);
GO

-- =============================================
-- 9. DUAS LIBRARY
-- =============================================

CREATE TABLE duas (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    title               NVARCHAR(300)       NOT NULL,
    arabic_text         NVARCHAR(MAX)       NULL,
    transliteration     NVARCHAR(MAX)       NULL,
    translation         NVARCHAR(MAX)       NULL,
    source_name         NVARCHAR(200)       NULL,
    source_ref          NVARCHAR(200)       NULL,
    category            NVARCHAR(50)        NOT NULL DEFAULT 'GENERAL'
                            CHECK (category IN ('MORNING','WUDU','AFTER_PRAYER','MOSQUE','GENERAL','FOOD','SLEEP','TRAVEL')),
    tags                NVARCHAR(MAX)       NULL,   -- JSON array
    tradition           NVARCHAR(50)        NULL,
    audio_url           NVARCHAR(500)       NULL,
    created_at          DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE dua_collections (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    name        NVARCHAR(300)       NOT NULL,
    description NVARCHAR(MAX)       NULL,
    coll_type   NVARCHAR(50)        NULL,
    created_at  DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE dua_collection_items (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    collection_id   UNIQUEIDENTIFIER    NOT NULL,
    dua_id          UNIQUEIDENTIFIER    NOT NULL,
    order_index     INT                 NOT NULL,
    CONSTRAINT FK_dci_collection FOREIGN KEY (collection_id) REFERENCES dua_collections(id) ON DELETE CASCADE,
    CONSTRAINT FK_dci_dua        FOREIGN KEY (dua_id)        REFERENCES duas(id),
    CONSTRAINT UQ_dci            UNIQUE (collection_id, dua_id)
);
GO

-- =============================================
-- 10. RITUAL GUIDES
-- =============================================

CREATE TABLE ritual_guides (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    title       NVARCHAR(300)       NOT NULL,
    guide_type  NVARCHAR(20)        NOT NULL
                    CHECK (guide_type IN ('WUDU','GHUSL','SALAH','OTHER')),
    created_at  DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE ritual_steps (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    guide_id    UNIQUEIDENTIFIER    NOT NULL,
    order_index INT                 NOT NULL,
    title       NVARCHAR(300)       NOT NULL,
    description NVARCHAR(MAX)       NULL,
    image_url   NVARCHAR(500)       NULL,
    dua_id      UNIQUEIDENTIFIER    NULL,
    CONSTRAINT FK_rs_guide FOREIGN KEY (guide_id) REFERENCES ritual_guides(id) ON DELETE CASCADE,
    CONSTRAINT FK_rs_dua   FOREIGN KEY (dua_id)   REFERENCES duas(id),
    CONSTRAINT UQ_rs_order UNIQUE (guide_id, order_index)
);
GO

-- =============================================
-- 11. QUR'AN READING
-- =============================================

CREATE TABLE quran_plans (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    user_id     UNIQUEIDENTIFIER    NOT NULL,
    plan_type   NVARCHAR(20)        NOT NULL DEFAULT '30_DAY'
                    CHECK (plan_type IN ('30_DAY','CUSTOM')),
    start_date  DATE                NOT NULL,
    is_active   BIT                 NOT NULL DEFAULT 1,
    created_at  DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_qp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

CREATE TABLE quran_progress (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    plan_id         UNIQUEIDENTIFIER    NOT NULL,
    para_number     INT                 NOT NULL CHECK (para_number BETWEEN 1 AND 30),
    completed       BIT                 NOT NULL DEFAULT 0,
    completed_at    DATETIME2           NULL,
    CONSTRAINT FK_qprog_plan FOREIGN KEY (plan_id) REFERENCES quran_plans(id) ON DELETE CASCADE,
    CONSTRAINT UQ_qprog      UNIQUE (plan_id, para_number)
);
GO

-- =============================================
-- 12. JANAZA ANNOUNCEMENTS
-- =============================================

CREATE TABLE janaza_announcements (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    [name]          NVARCHAR(200)       NOT NULL,
    date_of_death   DATE                NULL,
    janaza_date     DATE                NULL,
    janaza_time     TIME                NULL,
    location        NVARCHAR(300)       NULL,
    burial_location NVARCHAR(300)       NULL,
    notes           NVARCHAR(MAX)       NULL,
    mosque_site_url NVARCHAR(500)       NULL,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_janaza_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE
);
GO

-- =============================================
-- 13. DEATH READINGS / READING CAMPAIGNS
-- =============================================

CREATE TABLE reading_campaigns (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id       UNIQUEIDENTIFIER    NOT NULL,
    deceased_name   NVARCHAR(200)       NOT NULL,
    created_by      UNIQUEIDENTIFIER    NOT NULL,
    is_active       BIT                 NOT NULL DEFAULT 1,
    created_at      DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_rc_mosque FOREIGN KEY (mosque_id)  REFERENCES mosques(id),
    CONSTRAINT FK_rc_user   FOREIGN KEY (created_by) REFERENCES users(id)
);
GO

CREATE TABLE reading_allocations (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    campaign_id     UNIQUEIDENTIFIER    NOT NULL,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    alloc_type      NVARCHAR(20)        NOT NULL
                        CHECK (alloc_type IN ('YASEEN','PARA','DUA','ADHKAR')),
    description     NVARCHAR(300)       NULL,
    status          NVARCHAR(20)        NOT NULL DEFAULT 'ASSIGNED'
                        CHECK (status IN ('ASSIGNED','COMPLETED')),
    completed_at    DATETIME2           NULL,
    CONSTRAINT FK_ra_campaign FOREIGN KEY (campaign_id) REFERENCES reading_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT FK_ra_user     FOREIGN KEY (user_id)     REFERENCES users(id)
);
GO

-- =============================================
-- 14. COMMUNITY PARTICIPATION
-- =============================================

CREATE TABLE participation_opportunities (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    mosque_id   UNIQUEIDENTIFIER    NOT NULL,
    title       NVARCHAR(300)       NOT NULL,
    opp_type    NVARCHAR(30)        NOT NULL
                    CHECK (opp_type IN ('CLASS','VOLUNTEERING','PROJECT','EVENT','PRAYER')),
    description NVARCHAR(MAX)       NULL,
    [date]      DATE                NULL,
    is_active   BIT                 NOT NULL DEFAULT 1,
    created_at  DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_po_mosque FOREIGN KEY (mosque_id) REFERENCES mosques(id) ON DELETE CASCADE
);
GO

CREATE TABLE participation_registrations (
    id              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    opportunity_id  UNIQUEIDENTIFIER    NOT NULL,
    user_id         UNIQUEIDENTIFIER    NOT NULL,
    registered_at   DATETIME2           NOT NULL DEFAULT GETUTCDATE(),
    status          NVARCHAR(20)        NOT NULL DEFAULT 'REGISTERED'
                        CHECK (status IN ('REGISTERED','CANCELLED','ATTENDED')),
    CONSTRAINT FK_pr_opportunity FOREIGN KEY (opportunity_id) REFERENCES participation_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT FK_pr_user        FOREIGN KEY (user_id)        REFERENCES users(id),
    CONSTRAINT UQ_pr             UNIQUE (opportunity_id, user_id)
);
GO

-- =============================================
-- 15. UMRAH & HAJJ GUIDES
-- =============================================

CREATE TABLE journey_guides (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    guide_type  NVARCHAR(10)        NOT NULL CHECK (guide_type IN ('UMRAH','HAJJ')),
    title       NVARCHAR(300)       NOT NULL,
    created_at  DATETIME2           NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE TABLE journey_stages (
    id          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    guide_id    UNIQUEIDENTIFIER    NOT NULL,
    order_index INT                 NOT NULL,
    title       NVARCHAR(300)       NOT NULL,
    description NVARCHAR(MAX)       NULL,
    duas_json   NVARCHAR(MAX)       NULL,   -- JSON array of dua IDs
    notes       NVARCHAR(MAX)       NULL,
    CONSTRAINT FK_js_guide FOREIGN KEY (guide_id) REFERENCES journey_guides(id) ON DELETE CASCADE,
    CONSTRAINT UQ_js_order UNIQUE (guide_id, order_index)
);
GO

-- =============================================
-- USEFUL INDEXES
-- =============================================

CREATE INDEX IX_prayer_mosque_date    ON prayer_times_daily (mosque_id, [date]);
CREATE INDEX IX_announce_mosque       ON announcements (mosque_id, status);
CREATE INDEX IX_events_mosque_date    ON events (mosque_id, [date]);
CREATE INDEX IX_students_mosque       ON students (mosque_id);
CREATE INDEX IX_enrolments_class      ON enrolments (class_id);
CREATE INDEX IX_att_session           ON attendance_records (session_id);
CREATE INDEX IX_fees_student_status   ON fees (student_id, status);
CREATE INDEX IX_wird_progress_user    ON user_wird_progress (user_id);
CREATE INDEX IX_adhkar_log_date       ON user_adhkar_log (user_adhkar_id, log_date);
CREATE INDEX IX_janaza_mosque         ON janaza_announcements (mosque_id);
CREATE INDEX IX_campaigns_mosque      ON reading_campaigns (mosque_id);
GO

PRINT 'mos_db — all tables created successfully.';
GO
