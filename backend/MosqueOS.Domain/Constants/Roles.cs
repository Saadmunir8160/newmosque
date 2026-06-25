namespace MosqueOS.Domain.Constants
{
    public static class Roles
    {
        public const string SuperAdmin = "Super Admin";
        public const string MosqueOwner = "Mosque Owner";
        public const string MosqueAdmin = "Mosque Admin";
        public const string PrayerTimesEditor = "Prayer Times Editor";
        public const string Teacher = "Teacher";
        public const string Muqaddam = "Muqaddam";
        public const string ContentEditor = "Content Editor";
        public const string Parent = "Parent";
        public const string Member = "Member";
        public const string Guest = "Guest";

        public static readonly string[] All =
        {
            SuperAdmin, MosqueOwner, MosqueAdmin, PrayerTimesEditor,
            Teacher, Muqaddam, ContentEditor, Parent, Member, Guest
        };

        // Composite role lists for [Authorize(Roles = ...)] (spec section 6.2)
        public const string Admins = SuperAdmin + "," + MosqueOwner + "," + MosqueAdmin;
        public const string PrayerTimesManagers = SuperAdmin + "," + MosqueOwner + "," + MosqueAdmin + "," + PrayerTimesEditor;
        public const string MadrassahManagers = SuperAdmin + "," + MosqueOwner + "," + MosqueAdmin + "," + Teacher;
        public const string ContentManagers = SuperAdmin + "," + MosqueOwner + "," + MosqueAdmin + "," + ContentEditor;
        public const string MuridSummaryViewers = SuperAdmin + "," + Muqaddam;
        public const string MosqueManagers = SuperAdmin + "," + MosqueOwner + "," + MosqueAdmin;
    }
}
