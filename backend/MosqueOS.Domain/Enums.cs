namespace MosqueOS.Domain
{
    public enum MosqueStatus
    {
        Unclaimed = 0,
        Claimed = 1,
        Active = 2,
        PendingReview = 3,
        Suspended = 4,
        Archived = 5,
        /// <summary>Ownership claim submitted — awaiting super admin approval.</summary>
        ClaimPending = 6,
    }

    public enum OwnershipClaimStatus
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
}
