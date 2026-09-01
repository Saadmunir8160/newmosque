namespace MosqueOS.Domain
{
    /// <summary>
    /// Module 3.1 mosque status (requirements): Unclaimed | Claimed | Active.
    /// Other values are legacy / adjacent flows (registration, invite) — do not use ClaimPending for new claim submits.
    /// Pending verification is OwnershipClaimStatus.Pending while mosque stays Unclaimed.
    /// </summary>
    public enum MosqueStatus
    {
        Unclaimed = 0,
        PendingVerification = 1,
        Claimed = 2,
        Active = 3,
        Rejected = 4
    }

    public enum InvitationStatus
    {
        Pending = 0,
        Accepted = 1,
        Revoked = 2,
        Expired = 3,
    }

    public enum OwnershipClaimStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2,
    }

    public enum MosqueRegistrationStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2,
    }

    public enum PublishStatus { Draft, Published, Unpublished }

    public enum ContentPublishStatus { Draft, InReview, Approved, Published, Unpublished }

    public enum LibraryItemType { Article, Pdf, Book }

    public enum MediaAssetType { Audio, Image, Video }

    public enum EventType { General, Mawlid, Dhikr, Class, Jumuah, Other }

    public enum EventStatus { Scheduled, Cancelled, Completed }

    public enum AttendanceStatus { Present, Absent, Late }

    public enum FeeStatus { Unpaid, Paid, Overdue }

    public enum EnrolmentStatus { Active, Completed, Withdrawn }

    public enum CommunityType { Tariqa, Class, YouthGroup, SistersGroup, StudyCircle, MadrassahGroup }

    public enum CommunityRole { Admin, Teacher, Member, Muqaddam }

    public enum GuidanceNoteType { Note, FollowUp, Recommendation }

    public enum CommunityGatheringType { DhikrGathering, SpiritualProgram }

    public enum Tariqa { General, BaAlawi, Shadhili }

    public enum UserLevel { Beginner, Regular, Advanced }

    public enum WirdCollectionType { Daily, Weekly, Event }

    public enum WirdMode { Full, Quick }

    public enum PrayerSlot
    {
        BeforeFajr, AfterFajr, AfterDhuhr, AfterAsr, AfterMaghrib, AfterIsha,
        MorningAdhkar, EveningAdhkar, BeforeSleep, ThursdayNight, FridayReading
    }

    public enum AdhkarOccasion { Always, Friday, Ramadan, SpecialEvent }

    public enum ContentItemType { Dhikr, Salawat, Quran, Dua, Poem, Other }

    public enum QuranPlanType { ThirtyDay, Custom }

    public enum RitualGuideType { Wudu, Ghusl, Salah, Other }

    public enum ReadingAllocationType { Yaseen, Para, Dua, Adhkar }

    public enum ReadingAllocationStatus { Assigned, Completed }

    public enum ParticipationType { Class, Volunteering, Project, Event, Prayer }

    public enum RegistrationStatus { Registered, Confirmed, Cancelled }

    public enum JourneyType { Umrah, Hajj }

    public enum DisplayPreference { ArabicOnly, ArabicTransliteration, ArabicTranslation }

    public enum StudentProgressType { Quran, Memorization, Exam, TeacherNote }

    public enum AssignmentGradeStatus { Pending, Submitted, Graded }

    /// <summary>Season / special period for jamaah timetable templates.</summary>
    public enum JamaahTemplateType
    {
        Custom = 0,
        Winter = 1,
        Spring = 2,
        Summer = 3,
        Autumn = 4,
        Ramadan = 5,
    }
}
