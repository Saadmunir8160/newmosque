using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MosqueOS.Domain;
using MosqueOS.Domain.Constants;
using MosqueOS.Domain.Entities;
using System.Text.Json;

namespace MosqueOS.Infrastructure
{
    /// <summary>Seeds roles, demo users, and MVP demo data (spec section 11). Idempotent.</summary>
    public static class DataSeeder
    {
        public static async Task SeedAsync(
            ApplicationDbContext db,
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager)
        {
            await db.Database.MigrateAsync();

            // ---- Roles ----
            foreach (var role in Roles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // ---- Users ----
            var superAdmin = await EnsureUser(userManager, "admin", "admin@mosqueos.uk", "Super Admin", "Admin@123", Roles.SuperAdmin);
            var mosqueAdmin = await EnsureUser(userManager, "mosqueadmin", "mosqueadmin@mosqueos.uk", "Mosque Admin", "Admin@123", Roles.MosqueAdmin);
            var owner = await EnsureUser(userManager, "owner", "owner@mosqueos.uk", "Br. Hamid (Owner)", "Owner@123", Roles.MosqueOwner);
            var prayerEditor = await EnsureUser(userManager, "prayereditor", "prayer@mosqueos.uk", "Br. Salim", "Prayer@123", Roles.PrayerTimesEditor);
            var teacher = await EnsureUser(userManager, "teacher", "teacher@mosqueos.uk", "Ustadh Yusuf", "Teacher@123", Roles.Teacher);
            var muqaddam = await EnsureUser(userManager, "muqaddam", "muqaddam@mosqueos.uk", "Habib Ali", "Muqaddam@123", Roles.Muqaddam, Roles.Member);
            await EnsureUser(userManager, "editor", "editor@mosqueos.uk", "Sr. Fatima", "Editor@123", Roles.ContentEditor);
            var parent = await EnsureUser(userManager, "parent", "parent@mosqueos.uk", "Br. Ahmed Khan", "Parent@123", Roles.Parent, Roles.Member);
            var member = await EnsureUser(userManager, "member", "member@mosqueos.uk", "Br. Bilal Hussain", "Member@123", Roles.Member);
            var zayd = await EnsureUser(userManager, "zayd", "zayd@mosqueos.uk", "Zayd Ahmed", "Member@123", Roles.Member);
            var fatima = await EnsureUser(userManager, "fatima", "fatima@mosqueos.uk", "Fatima Khan", "Member@123", Roles.Member);
            var omar = await EnsureUser(userManager, "omar", "omar@mosqueos.uk", "Omar Farooq", "Member@123", Roles.Member);
            var aisha = await EnsureUser(userManager, "aisha", "aisha@mosqueos.uk", "Aisha Malik", "Member@123", Roles.Member);
            var muhammadC = await EnsureUser(userManager, "mchishti", "m.chishti@mosqueos.uk", "Muhammad Chishti", "Member@123", Roles.Member);
            await EnsureUser(userManager, "google_user", "google.user@mosqueos.uk", "Google Member", "Google@123", Roles.Member);
            await EnsureUser(userManager, "facebook_user", "facebook.user@mosqueos.uk", "Facebook Member", "Facebook@123", Roles.Member);

            await RepairDemoUserRolesAsync(userManager);
            await RepairAdhkarLibraryAsync(db);
            await EnterpriseSeeder.SeedAsync(db, roleManager);
            await SeedContentEditorDemoAsync(db);
            await EnsurePlatformConfigAsync(db);

            // Idempotent: ensure demo owner is linked to the Bradford mosque
            var existingDemo = await db.Mosques.FirstOrDefaultAsync(m => m.Slug == "masjid-al-noor-bradford");
            if (existingDemo != null)
            {
                if (string.IsNullOrEmpty(existingDemo.OwnerId))
                {
                    existingDemo.OwnerId = owner.Id;
                    existingDemo.Status = MosqueStatus.Active;
                }
                if (owner.HomeMosqueId != existingDemo.Id)
                {
                    owner.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(owner);
                }
                if (mosqueAdmin.HomeMosqueId != existingDemo.Id)
                {
                    mosqueAdmin.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(mosqueAdmin);
                }
                if (member.HomeMosqueId != existingDemo.Id)
                {
                    member.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(member);
                }
                if (prayerEditor.HomeMosqueId != existingDemo.Id)
                {
                    prayerEditor.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(prayerEditor);
                }
                if (teacher.HomeMosqueId != existingDemo.Id)
                {
                    teacher.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(teacher);
                }
                if (muqaddam.HomeMosqueId != existingDemo.Id)
                {
                    muqaddam.HomeMosqueId = existingDemo.Id;
                    await userManager.UpdateAsync(muqaddam);
                }
                await EnrichPublicProfileDemoAsync(db, existingDemo);
                await db.SaveChangesAsync();
            }

            var unclaimedLeeds = await db.Mosques.FirstOrDefaultAsync(m => m.Slug == "masjid-al-huda-leeds");
            if (unclaimedLeeds != null)
            {
                await EnrichPublicProfileDemoAsync(db, unclaimedLeeds, includeDonations: false);
                await db.SaveChangesAsync();
            }

            // Idempotent: ensure at least one unclaimed listing exists for claim flow testing
            if (!await db.Mosques.AnyAsync(m => m.Status == MosqueStatus.Unclaimed))
            {
                db.Mosques.Add(new Mosque
                {
                    Name = "Masjid Al-Huda Leeds",
                    Slug = "masjid-al-huda-leeds",
                    Address = "45 Roundhay Road",
                    City = "Leeds",
                    Postcode = "LS8 5AN",
                    Country = "United Kingdom",
                    Description = "Community mosque in Leeds — awaiting an owner to claim this listing.",
                    Status = MosqueStatus.Unclaimed
                });
                await db.SaveChangesAsync();
            }

            if (await db.Mosques.AnyAsync()) return; // demo data already seeded

            // ---- 3.1 Sample mosque (Bradford) ----
            var mosque = new Mosque
            {
                Name = "Masjid Al-Noor Bradford",
                Slug = "masjid-al-noor-bradford",
                Address = "12 Manningham Lane",
                City = "Bradford",
                Postcode = "BD1 3EA",
                Country = "United Kingdom",
                Phone = "+44 1274 555000",
                Email = "info@alnoorbradford.org.uk",
                Website = "https://alnoorbradford.org.uk",
                Description = "A community mosque in the heart of Bradford serving daily prayers, madrassah classes, and weekly gatherings of dhikr.",
                Status = MosqueStatus.Active,
                OwnerId = owner.Id
            };
            db.Mosques.Add(mosque);
            await db.SaveChangesAsync();

            owner.HomeMosqueId = mosque.Id;
            await userManager.UpdateAsync(owner);
            member.HomeMosqueId = mosque.Id;
            await userManager.UpdateAsync(member);
            prayerEditor.HomeMosqueId = mosque.Id;
            await userManager.UpdateAsync(prayerEditor);
            teacher.HomeMosqueId = mosque.Id;
            await userManager.UpdateAsync(teacher);
            muqaddam.HomeMosqueId = mosque.Id;
            await userManager.UpdateAsync(muqaddam);

            // Unclaimed listing for owner claim flow demos
            db.Mosques.Add(new Mosque
            {
                Name = "Masjid Al-Huda Leeds",
                Slug = "masjid-al-huda-leeds",
                Address = "45 Roundhay Road",
                City = "Leeds",
                Postcode = "LS8 5AN",
                Country = "United Kingdom",
                Description = "Community mosque in Leeds — awaiting an owner to claim this listing.",
                Status = MosqueStatus.Unclaimed
            });
            await db.SaveChangesAsync();

            // Module feature flags
            var modules = new[]
            {
                "PrayerTimes", "Announcements", "Events", "Madrassah", "Communities",
                "Awrad", "Adhkar", "Duas", "Quran", "RitualGuides", "Janaza",
                "DeathReadings", "Participation", "JourneyGuides"
            };
            db.MosqueSettings.AddRange(modules.Select(m => new MosqueSetting
            {
                MosqueId = mosque.Id, ModuleKey = m, IsEnabled = true
            }));

            // ---- 3.2 30 days of prayer times ----
            var start = DateOnly.FromDateTime(DateTime.UtcNow);
            for (var i = 0; i < 30; i++)
            {
                var date = start.AddDays(i);
                // Gentle daily drift to simulate a real timetable
                var drift = i / 3;
                db.PrayerTimesDaily.Add(new PrayerTimesDaily
                {
                    MosqueId = mosque.Id,
                    Date = date,
                    FajrStart = new TimeOnly(3, 30).AddMinutes(-drift),
                    FajrJamaat = new TimeOnly(4, 15).AddMinutes(-drift),
                    DhuhrStart = new TimeOnly(13, 5),
                    DhuhrJamaat = new TimeOnly(13, 30),
                    AsrStart = new TimeOnly(17, 25).AddMinutes(drift / 2),
                    AsrJamaat = new TimeOnly(18, 0).AddMinutes(drift / 2),
                    MaghribStart = new TimeOnly(21, 20).AddMinutes(drift / 2),
                    MaghribJamaat = new TimeOnly(21, 25).AddMinutes(drift / 2),
                    IshaStart = new TimeOnly(22, 45),
                    IshaJamaat = new TimeOnly(23, 0)
                });
            }

            db.JumuahTimes.AddRange(
                new JumuahTime { MosqueId = mosque.Id, SlotNumber = 1, KhutbahTime = new TimeOnly(13, 0), JamaatTime = new TimeOnly(13, 30) },
                new JumuahTime { MosqueId = mosque.Id, SlotNumber = 2, KhutbahTime = new TimeOnly(14, 0), JamaatTime = new TimeOnly(14, 30) });

            // ---- 3.3 Announcements ----
            db.Announcements.AddRange(
                new Announcement
                {
                    MosqueId = mosque.Id,
                    Title = "Ramadan Timetable Released",
                    Summary = "The full Ramadan prayer and iftar timetable is now available.",
                    Body = "Alhamdulillah, the Ramadan timetable for this year has been finalised. Printed copies are available at the mosque entrance, and the full timetable is on the prayer times page.",
                    Status = PublishStatus.Published,
                    IsFeatured = true,
                    PublishedAt = DateTime.UtcNow.AddDays(-2),
                    CreatedById = mosqueAdmin.Id
                },
                new Announcement
                {
                    MosqueId = mosque.Id,
                    Title = "Weekly Tafsir Class Resumes",
                    Summary = "Sunday tafsir class with Ustadh Yusuf resumes this week after Maghrib.",
                    Body = "The weekly tafsir circle resumes this Sunday after Maghrib prayer. All brothers and sisters welcome. No prior knowledge required.",
                    Status = PublishStatus.Published,
                    PublishedAt = DateTime.UtcNow.AddDays(-1),
                    CreatedById = mosqueAdmin.Id
                },
                new Announcement
                {
                    MosqueId = mosque.Id,
                    Title = "Car Park Resurfacing (Draft)",
                    Summary = "Car park will be closed next week for resurfacing works.",
                    Body = "Details to be confirmed with the contractor.",
                    Status = PublishStatus.Draft,
                    CreatedById = mosqueAdmin.Id
                });

            // ---- 3.7 Content items + Khulasa Wird ----
            var fatiha = new ContentItem { Title = "Surah al-Fatiha", ArabicText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ * الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", Transliteration = "Bismillahir-Rahmanir-Raheem. Alhamdu lillahi Rabbil-'alameen", Translation = "In the name of Allah, the Most Gracious, the Most Merciful. All praise is for Allah, Lord of the worlds.", RepeatCount = 1, Type = ContentItemType.Quran, SourceRef = "Qur'an 1" };
            var istighfar = new ContentItem { Title = "Istighfar", ArabicText = "أَسْتَغْفِرُ اللهَ", Transliteration = "Astaghfirullah", Translation = "I seek the forgiveness of Allah.", RepeatCount = 100, Type = ContentItemType.Dhikr };
            var salawat = new ContentItem { Title = "Salawat upon the Prophet ﷺ", ArabicText = "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلِّمْ", Transliteration = "Allahumma salli 'ala sayyidina Muhammadin wa 'ala alihi wa sahbihi wa sallim", Translation = "O Allah, send blessings upon our master Muhammad and upon his family and companions, and grant them peace.", RepeatCount = 100, Type = ContentItemType.Salawat };
            var tahlil = new ContentItem { Title = "Tahlil", ArabicText = "لَا إِلَهَ إِلَّا اللهُ", Transliteration = "La ilaha illallah", Translation = "There is no god but Allah.", RepeatCount = 100, Type = ContentItemType.Dhikr };
            var ikhlas = new ContentItem { Title = "Surah al-Ikhlas", ArabicText = "قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", Transliteration = "Qul huwallahu ahad. Allahus-samad. Lam yalid wa lam yulad. Wa lam yakul-lahu kufuwan ahad", Translation = "Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there any equivalent to Him.", RepeatCount = 3, Type = ContentItemType.Quran, SourceRef = "Qur'an 112" };
            var mawlidOpening = new ContentItem { Title = "Mawlid Opening — Praise", ArabicText = "الْحَمْدُ لِلَّهِ الَّذِي هَدَانَا لِهَذَا", Transliteration = "Alhamdu lillahil-ladhi hadana li-hadha", Translation = "Praise be to Allah who guided us to this.", RepeatCount = 1, Type = ContentItemType.Other };
            var burdah = new ContentItem { Title = "Qasida Burdah (Opening)", ArabicText = "مَوْلَايَ صَلِّ وَسَلِّمْ دَائِمًا أَبَدًا * عَلَى حَبِيبِكَ خَيْرِ الْخَلْقِ كُلِّهِمِ", Transliteration = "Mawlaya salli wa sallim da'iman abadan 'ala habibika khayril-khalqi kullihimi", Translation = "My Lord, send blessings and peace always and forever upon Your beloved, the best of all creation.", RepeatCount = 3, Type = ContentItemType.Poem, SourceRef = "Imam al-Busiri, Qasida Burdah" };

            db.ContentItems.AddRange(fatiha, istighfar, salawat, tahlil, ikhlas, mawlidOpening, burdah);
            await db.SaveChangesAsync();

            var khulasa = new WirdCollection
            {
                Name = "Khulasa Wird (Morning)",
                Tariqa = Tariqa.BaAlawi,
                Type = WirdCollectionType.Daily,
                RecommendedTime = "After Fajr",
                Description = "The daily morning wird of the Ba'alawi path, from Khulasat al-Madad al-Nabawi."
            };
            db.WirdCollections.Add(khulasa);
            await db.SaveChangesAsync();

            db.WirdSteps.AddRange(
                new WirdStep { CollectionId = khulasa.Id, ContentItemId = fatiha.Id, OrderIndex = 1 },
                new WirdStep { CollectionId = khulasa.Id, ContentItemId = istighfar.Id, OrderIndex = 2 },
                new WirdStep { CollectionId = khulasa.Id, ContentItemId = salawat.Id, OrderIndex = 3 },
                new WirdStep { CollectionId = khulasa.Id, ContentItemId = tahlil.Id, OrderIndex = 4 },
                new WirdStep { CollectionId = khulasa.Id, ContentItemId = ikhlas.Id, OrderIndex = 5 });

            // Mawlid reading sequence — 7 steps
            var mawlidSequence = new WirdCollection
            {
                Name = "Mawlid Night Reading",
                Tariqa = Tariqa.BaAlawi,
                Type = WirdCollectionType.Event,
                RecommendedTime = "Thursday night",
                Description = "Guided reading sequence for the Mawlid gathering."
            };
            db.WirdCollections.Add(mawlidSequence);
            await db.SaveChangesAsync();

            db.WirdSteps.AddRange(
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = mawlidOpening.Id, OrderIndex = 1, CustomInstructions = "Recited by the leader" },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = fatiha.Id, OrderIndex = 2 },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = salawat.Id, OrderIndex = 3, CustomInstructions = "Recited together" },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = burdah.Id, OrderIndex = 4, CustomInstructions = "Standing, in unison" },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = tahlil.Id, OrderIndex = 5 },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = ikhlas.Id, OrderIndex = 6 },
                new WirdStep { CollectionId = mawlidSequence.Id, ContentItemId = salawat.Id, OrderIndex = 7, CustomInstructions = "Closing salawat and dua" });
            await db.SaveChangesAsync();

            // ---- 3.4 Events (incl. Mawlid linked to the reading sequence) ----
            db.Events.AddRange(
                new Event
                {
                    MosqueId = mosque.Id,
                    Title = "Mawlid Night",
                    Description = "Monthly mawlid gathering with qasidas, salawat, and a short talk, followed by refreshments.",
                    Date = start.AddDays(3),
                    StartTime = new TimeOnly(19, 30),
                    EndTime = new TimeOnly(21, 30),
                    Location = "Main Hall",
                    Speaker = "Habib Kadhim (recorded address)",
                    EventType = EventType.Mawlid,
                    WirdCollectionId = mawlidSequence.Id
                },
                new Event
                {
                    MosqueId = mosque.Id,
                    Title = "Sunday Tafsir Circle",
                    Description = "Weekly tafsir of Surah al-Kahf with Ustadh Yusuf.",
                    Date = start.AddDays(5),
                    StartTime = new TimeOnly(20, 0),
                    Location = "Library Room",
                    Speaker = "Ustadh Yusuf",
                    EventType = EventType.Class,
                    IsRecurring = true
                },
                new Event
                {
                    MosqueId = mosque.Id,
                    Title = "Community Dhikr Majlis",
                    Description = "Evening of collective dhikr following the Ba'alawi tradition.",
                    Date = start.AddDays(10),
                    StartTime = new TimeOnly(19, 0),
                    Location = "Main Hall",
                    EventType = EventType.Dhikr
                });

            // ---- 3.5 Madrassah: 1 class, 5 students, 3 attendance sessions ----
            var madrassahClass = new MadrassahClass
            {
                MosqueId = mosque.Id,
                Name = "Qur'an Level 1 (Boys)",
                TeacherId = teacher.Id,
                Schedule = "Mon-Thu 17:00-18:30"
            };
            db.MadrassahClasses.Add(madrassahClass);

            var students = new[]
            {
                new Student { Name = "Ibrahim Khan", DateOfBirth = new DateOnly(2016, 4, 12), Gender = "M" },
                new Student { Name = "Zayd Ali", DateOfBirth = new DateOnly(2015, 9, 3), Gender = "M" },
                new Student { Name = "Musa Rahman", DateOfBirth = new DateOnly(2016, 1, 22), Gender = "M" },
                new Student { Name = "Hamza Patel", DateOfBirth = new DateOnly(2015, 6, 30), Gender = "M" },
                new Student { Name = "Yahya Hussain", DateOfBirth = new DateOnly(2016, 11, 8), Gender = "M" }
            };
            db.Students.AddRange(students);
            await db.SaveChangesAsync();

            // Parent account is guardian of the first student
            db.Guardians.Add(new Guardian { UserId = parent.Id, StudentId = students[0].Id, Relationship = "Father" });

            db.Enrolments.AddRange(students.Select(s => new Enrolment
            {
                StudentId = s.Id, ClassId = madrassahClass.Id
            }));

            for (var i = 0; i < 3; i++)
            {
                var session = new AttendanceSession
                {
                    ClassId = madrassahClass.Id,
                    Date = start.AddDays(-(7 - i * 2)),
                    Notes = i == 1 ? "Revision of last week's surahs" : null
                };
                db.AttendanceSessions.Add(session);
                await db.SaveChangesAsync();

                for (var s = 0; s < students.Length; s++)
                {
                    db.AttendanceRecords.Add(new AttendanceRecord
                    {
                        SessionId = session.Id,
                        StudentId = students[s].Id,
                        Status = (i + s) % 5 == 4 ? AttendanceStatus.Absent
                               : (i + s) % 5 == 3 ? AttendanceStatus.Late
                               : AttendanceStatus.Present
                    });
                }
            }

            db.Fees.AddRange(students.Select((s, i) => new Fee
            {
                StudentId = s.Id,
                Amount = 20.00m,
                DueDate = start.AddDays(7),
                Status = i < 2 ? FeeStatus.Paid : FeeStatus.Unpaid,
                PaidAt = i < 2 ? DateTime.UtcNow.AddDays(-3) : null
            }));

            db.ProgressNotes.Add(new ProgressNote
            {
                StudentId = students[0].Id,
                ClassId = madrassahClass.Id,
                Note = "Ibrahim has memorised Surah al-Fil this week, mashallah. Working on tajweed of heavy letters.",
                CreatedById = teacher.Id
            });

            db.StudentProgressRecords.AddRange(
                new StudentProgressRecord
                {
                    StudentId = students[0].Id,
                    ClassId = madrassahClass.Id,
                    ProgressType = StudentProgressType.Quran,
                    Title = "Surah al-Fil",
                    SurahOrTopic = "Surah al-Fil",
                    Detail = "Completed with good tajweed",
                    RecordDate = start.AddDays(-2),
                    CreatedById = teacher.Id
                },
                new StudentProgressRecord
                {
                    StudentId = students[1].Id,
                    ClassId = madrassahClass.Id,
                    ProgressType = StudentProgressType.Memorization,
                    Title = "Juz Amma — Surah an-Nas",
                    SurahOrTopic = "an-Nas",
                    Detail = "Memorised, needs revision",
                    RecordDate = start.AddDays(-1),
                    CreatedById = teacher.Id
                },
                new StudentProgressRecord
                {
                    StudentId = students[2].Id,
                    ClassId = madrassahClass.Id,
                    ProgressType = StudentProgressType.Exam,
                    Title = "Term 1 Tajweed Test",
                    Score = 78,
                    Detail = "Good effort on makhraj",
                    RecordDate = start.AddDays(-5),
                    CreatedById = teacher.Id
                });

            var homework = new ClassAssignment
            {
                ClassId = madrassahClass.Id,
                Title = "Revise Surah al-Fil",
                Description = "Practice recitation with tajweed rules for heavy letters.",
                DueDate = start.AddDays(3),
                ResourceUrl = "https://example.com/surah-al-fil.pdf",
                ResourceFileName = "surah-al-fil.pdf",
                CreatedById = teacher.Id
            };
            db.ClassAssignments.Add(homework);
            await db.SaveChangesAsync();

            foreach (var student in students)
            {
                db.AssignmentGrades.Add(new AssignmentGrade
                {
                    AssignmentId = homework.Id,
                    StudentId = student.Id,
                    Status = student.Id == students[0].Id ? AssignmentGradeStatus.Graded : AssignmentGradeStatus.Pending,
                    Grade = student.Id == students[0].Id ? "A" : null,
                    Feedback = student.Id == students[0].Id ? "Excellent revision" : null,
                    GradedById = student.Id == students[0].Id ? teacher.Id : null
                });
            }

            // ---- 3.6 Community: Ba'alawi tariqa circle ----
            var circle = new Community
            {
                MosqueId = mosque.Id,
                Name = "Ba'alawi Dhikr Circle",
                Type = CommunityType.Tariqa,
                Description = "Weekly circle following the Ba'alawi path: rawhah readings, dhikr, and qasidas.",
                IsPublic = true
            };
            db.Communities.Add(circle);
            await db.SaveChangesAsync();

            db.CommunityMembers.AddRange(
                new CommunityMember { CommunityId = circle.Id, UserId = mosqueAdmin.Id, Role = CommunityRole.Admin },
                new CommunityMember { CommunityId = circle.Id, UserId = muqaddam.Id, Role = CommunityRole.Muqaddam },
                new CommunityMember { CommunityId = circle.Id, UserId = member.Id, Role = CommunityRole.Member });

            db.CommunityPosts.Add(new CommunityPost
            {
                CommunityId = circle.Id,
                AuthorId = mosqueAdmin.Id,
                Content = "This week's rawhah will cover the chapter on gratitude from Imam al-Haddad's Book of Assistance. All welcome after Maghrib on Wednesday."
            });

            var dhikrGathering = new CommunityGathering
            {
                CommunityId = circle.Id,
                Title = "Thursday Dhikr Majlis",
                Description = "Weekly collective dhikr following the Ba'alawi tradition.",
                GatheringType = CommunityGatheringType.DhikrGathering,
                Date = start.AddDays(3),
                StartTime = new TimeOnly(19, 30),
                Location = "Main Hall",
                CreatedById = muqaddam.Id
            };
            db.CommunityGatherings.Add(dhikrGathering);
            await db.SaveChangesAsync();

            db.GatheringAttendances.Add(new GatheringAttendance
            {
                GatheringId = dhikrGathering.Id,
                UserId = member.Id,
                Status = AttendanceStatus.Present
            });

            db.GuidanceNotes.AddRange(
                new GuidanceNote
                {
                    CommunityId = circle.Id,
                    MuridUserId = member.Id,
                    Type = GuidanceNoteType.Note,
                    Content = "Encourage consistent morning wird — member shows good effort in dhikr circle.",
                    CreatedById = muqaddam.Id
                },
                new GuidanceNote
                {
                    CommunityId = circle.Id,
                    MuridUserId = member.Id,
                    Type = GuidanceNoteType.FollowUp,
                    Content = "Follow up on Qur'an reading plan progress next week.",
                    FollowUpDate = start.AddDays(7),
                    CreatedById = muqaddam.Id
                },
                new GuidanceNote
                {
                    CommunityId = circle.Id,
                    MuridUserId = member.Id,
                    Type = GuidanceNoteType.Recommendation,
                    Content = "Recommend attending the Ba'alawi rawhah readings on Wednesday evenings.",
                    CreatedById = muqaddam.Id
                });

            // ---- 3.9 Duas: Ghazali Supplications (morning, wudu, prayer) ----
            var duaMorning = new Dua { Title = "Upon Waking", ArabicText = "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", Transliteration = "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur", Translation = "Praise be to Allah who gave us life after causing us to die, and to Him is the resurrection.", SourceName = "Imam al-Ghazali", SourceRef = "Ihya 'Ulum al-Din, Book of Invocations", Category = "morning", Tradition = "Ghazali" };
            var duaWuduStart = new Dua { Title = "Beginning Wudu", ArabicText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", Transliteration = "Bismillahir-Rahmanir-Raheem", Translation = "In the name of Allah, the Most Gracious, the Most Merciful.", SourceName = "Imam al-Ghazali", SourceRef = "Ihya 'Ulum al-Din", Category = "wudu", Tradition = "Ghazali" };
            var duaWuduFace = new Dua { Title = "Washing the Face", ArabicText = "اللَّهُمَّ بَيِّضْ وَجْهِي يَوْمَ تَبْيَضُّ وُجُوهٌ وَتَسْوَدُّ وُجُوهٌ", Transliteration = "Allahumma bayyid wajhi yawma tabyaddu wujuhun wa taswaddu wujuh", Translation = "O Allah, brighten my face on the Day when faces are brightened and faces are darkened.", SourceName = "Imam al-Ghazali", SourceRef = "Ihya 'Ulum al-Din", Category = "wudu", Tradition = "Ghazali" };
            var duaWuduEnd = new Dua { Title = "Completing Wudu", ArabicText = "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", Transliteration = "Ashhadu an la ilaha illallahu wahdahu la sharika lah, wa ashhadu anna Muhammadan 'abduhu wa rasuluh", Translation = "I bear witness that there is no god but Allah alone, without partner, and I bear witness that Muhammad is His servant and messenger.", SourceName = "Hadith", SourceRef = "Sahih Muslim", Category = "wudu", Tradition = "Ghazali" };
            var duaAfterPrayer = new Dua { Title = "After the Prescribed Prayer", ArabicText = "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", Transliteration = "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik", Translation = "O Allah, help me to remember You, thank You, and worship You in the best manner.", SourceName = "Hadith", SourceRef = "Sunan Abi Dawud", Category = "after_prayer", Tradition = "Ghazali" };
            var duaSleep = new Dua { Title = "Before Sleep", ArabicText = "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", Transliteration = "Bismika Allahumma amutu wa ahya", Translation = "In Your name, O Allah, I die and I live.", SourceName = "Hadith", SourceRef = "Sahih al-Bukhari", Category = "sleep", Tradition = "Ghazali" };
            var duaGeneral = new Dua { Title = "Comprehensive Good", ArabicText = "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", Transliteration = "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar", Translation = "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.", SourceName = "Qur'an", SourceRef = "2:201", Category = "general" };

            db.Duas.AddRange(duaMorning, duaWuduStart, duaWuduFace, duaWuduEnd, duaAfterPrayer, duaSleep, duaGeneral);
            await db.SaveChangesAsync();

            var ghazaliCollection = new DuaCollection
            {
                Name = "Ghazali Supplications",
                Description = "Supplications for the daily routine drawn from Imam al-Ghazali's Ihya 'Ulum al-Din: morning, wudu, and prayer.",
                Type = "Curated"
            };
            db.DuaCollections.Add(ghazaliCollection);
            await db.SaveChangesAsync();

            db.DuaCollectionItems.AddRange(
                new DuaCollectionItem { CollectionId = ghazaliCollection.Id, DuaId = duaMorning.Id, OrderIndex = 1 },
                new DuaCollectionItem { CollectionId = ghazaliCollection.Id, DuaId = duaWuduStart.Id, OrderIndex = 2 },
                new DuaCollectionItem { CollectionId = ghazaliCollection.Id, DuaId = duaWuduFace.Id, OrderIndex = 3 },
                new DuaCollectionItem { CollectionId = ghazaliCollection.Id, DuaId = duaWuduEnd.Id, OrderIndex = 4 },
                new DuaCollectionItem { CollectionId = ghazaliCollection.Id, DuaId = duaAfterPrayer.Id, OrderIndex = 5 });

            // ---- 3.11 Ritual guides with review workflow ----
            var wuduGuide = new RitualGuide
            {
                Title = "Performing Wudu",
                Type = RitualGuideType.Wudu,
                Status = ContentPublishStatus.InReview,
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            };
            db.RitualGuides.Add(wuduGuide);

            var ghuslGuide = new RitualGuide
            {
                Title = "How to Perform Ghusl",
                Type = RitualGuideType.Ghusl,
                Status = ContentPublishStatus.InReview,
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            };
            db.RitualGuides.Add(ghuslGuide);

            var fajrGuide = new RitualGuide
            {
                Title = "Fajr Prayer Guide",
                Type = RitualGuideType.Salah,
                Status = ContentPublishStatus.InReview
            };
            db.RitualGuides.Add(fajrGuide);

            var approvedGuide = new RitualGuide
            {
                Title = "How to Perform Wudu",
                Type = RitualGuideType.Wudu,
                Status = ContentPublishStatus.Approved
            };
            db.RitualGuides.Add(approvedGuide);

            var draftGuide = new RitualGuide
            {
                Title = "Isha Prayer Guide",
                Type = RitualGuideType.Salah,
                Status = ContentPublishStatus.Draft
            };
            db.RitualGuides.Add(draftGuide);

            await db.SaveChangesAsync();

            db.RitualSteps.AddRange(
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 1, Title = "Intention and Bismillah", Description = "Make the intention (niyyah) in your heart to perform wudu for the sake of Allah, then say Bismillah.", DuaId = duaWuduStart.Id },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 2, Title = "Wash the Hands", Description = "Wash both hands up to the wrists three times, beginning with the right." },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 3, Title = "Rinse the Mouth and Nose", Description = "Rinse the mouth three times, then gently sniff water into the nostrils and blow it out, three times." },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 4, Title = "Wash the Face", Description = "Wash the whole face three times, from hairline to chin and ear to ear.", DuaId = duaWuduFace.Id },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 5, Title = "Wash the Arms", Description = "Wash the right arm up to and including the elbow three times, then the left." },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 6, Title = "Wipe the Head and Ears", Description = "With wet hands, wipe over the head once, then wipe the inside and outside of the ears." },
                new RitualStep { GuideId = wuduGuide.Id, OrderIndex = 7, Title = "Wash the Feet", Description = "Wash the right foot up to and including the ankle three times, then the left.", DuaId = duaWuduEnd.Id });

            db.RitualSteps.AddRange(
                new RitualStep { GuideId = ghuslGuide.Id, OrderIndex = 1, Title = "Intention", Description = "Make the intention for ghusl in your heart." },
                new RitualStep { GuideId = ghuslGuide.Id, OrderIndex = 2, Title = "Wash Hands", Description = "Wash both hands thoroughly." },
                new RitualStep { GuideId = ghuslGuide.Id, OrderIndex = 3, Title = "Rinse Mouth and Nose", Description = "Rinse the mouth and nose." },
                new RitualStep { GuideId = ghuslGuide.Id, OrderIndex = 4, Title = "Wash Entire Body", Description = "Pour water over the entire body, ensuring no dry spot remains." },
                new RitualStep { GuideId = ghuslGuide.Id, OrderIndex = 5, Title = "Complete", Description = "Say the shahada and perform wudu if needed for prayer." });

            db.RitualSteps.AddRange(
                new RitualStep { GuideId = fajrGuide.Id, OrderIndex = 1, Title = "Make Wudu", Description = "Perform ablution before prayer." },
                new RitualStep { GuideId = fajrGuide.Id, OrderIndex = 2, Title = "Face Qiblah", Description = "Stand facing the Ka'bah." },
                new RitualStep { GuideId = fajrGuide.Id, OrderIndex = 3, Title = "Two Rak'ahs", Description = "Pray two rak'ahs of Fajr with recitation." },
                new RitualStep { GuideId = fajrGuide.Id, OrderIndex = 4, Title = "Taslim", Description = "End the prayer with salam to the right and left." },
                new RitualStep { GuideId = fajrGuide.Id, OrderIndex = 5, Title = "Morning Adhkar", Description = "Recite morning remembrances after the prayer." });

            // ---- 3.8 Adhkar library ----
            db.AdhkarItems.AddRange(
                new AdhkarItem { Title = "SubhanAllah", ArabicText = "سُبْحَانَ اللهِ", Transliteration = "SubhanAllah", Translation = "Glory be to Allah.", DefaultCount = 33, Category = "after_prayer" },
                new AdhkarItem { Title = "Alhamdulillah", ArabicText = "الْحَمْدُ لِلَّهِ", Transliteration = "Alhamdulillah", Translation = "All praise is for Allah.", DefaultCount = 33, Category = "after_prayer" },
                new AdhkarItem { Title = "Allahu Akbar", ArabicText = "اللهُ أَكْبَرُ", Transliteration = "Allahu Akbar", Translation = "Allah is the Greatest.", DefaultCount = 34, Category = "after_prayer" },
                new AdhkarItem { Title = "Salawat", ArabicText = "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ", Transliteration = "Allahumma salli 'ala sayyidina Muhammad", Translation = "O Allah, send blessings upon our master Muhammad.", DefaultCount = 100, Category = "friday" },
                new AdhkarItem { Title = "Istighfar", ArabicText = "أَسْتَغْفِرُ اللهَ الْعَظِيمَ", Transliteration = "Astaghfirullahal-'Adheem", Translation = "I seek forgiveness from Allah, the Mighty.", DefaultCount = 100, Category = "general" });

            // ---- 3.12 Sample janaza announcement ----
            db.JanazaAnnouncements.Add(new JanazaAnnouncement
            {
                MosqueId = mosque.Id,
                Name = "Hajji Abdul Rahim Sahib",
                DateOfDeath = start.AddDays(-1),
                JanazaDate = start.AddDays(1),
                JanazaTime = new TimeOnly(13, 45),
                Location = "Masjid Al-Noor Bradford — after Dhuhr jamaah",
                BurialLocation = "Scholemoor Cemetery, Bradford",
                Notes = "Inna lillahi wa inna ilayhi raji'un. Please keep the family in your duas.",
                Status = PublishStatus.Published,
                CreatedById = mosqueAdmin.Id,
                PublishedAt = DateTime.UtcNow.AddDays(-5)
            });

            db.JanazaAnnouncements.AddRange(
                new JanazaAnnouncement
                {
                    MosqueId = mosque.Id,
                    Name = "Muhammad Yusuf Khan",
                    DateOfDeath = start.AddDays(-3),
                    JanazaDate = start.AddDays(2),
                    JanazaTime = new TimeOnly(14, 0),
                    Location = "Masjid Al-Noor Bradford",
                    BurialLocation = "Local City Cemetery",
                    Status = PublishStatus.Draft,
                    CreatedById = mosqueAdmin.Id
                },
                new JanazaAnnouncement
                {
                    MosqueId = mosque.Id,
                    Name = "Fatima Begum",
                    DateOfDeath = start.AddDays(-2),
                    JanazaDate = start.AddDays(3),
                    JanazaTime = new TimeOnly(10, 30),
                    Location = "Masjid Al-Noor — Main Hall",
                    BurialLocation = "Scholemoor Cemetery, Bradford",
                    Status = PublishStatus.Published,
                    CreatedById = mosqueAdmin.Id,
                    PublishedAt = DateTime.UtcNow.AddDays(-1)
                });

            // Reading campaign for the deceased
            var campaign = new ReadingCampaign
            {
                MosqueId = mosque.Id,
                DeceasedName = "Hajji Abdul Rahim Sahib",
                Title = "Global Esaal-e-Sawab Campaign",
                CreatedById = mosqueAdmin.Id,
                IsActive = true,
                TargetReadings = 100_000
            };
            db.ReadingCampaigns.Add(campaign);
            await db.SaveChangesAsync();

            db.ReadingAllocations.AddRange(
                new ReadingAllocation { CampaignId = campaign.Id, UserId = zayd.Id, Type = ReadingAllocationType.Para, Description = "Para 18", ReadingCount = 4250, Region = "North America", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddMinutes(-2) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = fatima.Id, Type = ReadingAllocationType.Para, Description = "Para 12", ReadingCount = 3890, Region = "UK", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddHours(-1) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = omar.Id, Type = ReadingAllocationType.Yaseen, Description = "Surah Yaseen x1", ReadingCount = 3200, Region = "UK", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddHours(-3) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = aisha.Id, Type = ReadingAllocationType.Para, Description = "Para 5", ReadingCount = 2950, Region = "SE Asia", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddHours(-5) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = muhammadC.Id, Type = ReadingAllocationType.Adhkar, Description = "Tahlil x150", ReadingCount = 150, Region = "North America", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddMinutes(-2) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = member.Id, Type = ReadingAllocationType.Para, Description = "Para 1 (Alif Lam Meem)", ReadingCount = 1, Region = "UK", Status = ReadingAllocationStatus.Completed },
                new ReadingAllocation { CampaignId = campaign.Id, Type = ReadingAllocationType.Yaseen, Description = "Surah Yaseen x1", ReadingCount = 1, Region = "North America" },
                new ReadingAllocation { CampaignId = campaign.Id, Type = ReadingAllocationType.Para, Description = "Para 2", ReadingCount = 1, Region = "UK" },
                new ReadingAllocation { CampaignId = campaign.Id, Type = ReadingAllocationType.Adhkar, Description = "Tahlil x1000", ReadingCount = 1000, Region = "SE Asia" },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = zayd.Id, Type = ReadingAllocationType.Para, Description = "Para 20", ReadingCount = 62000, Region = "North America", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddDays(-2) },
                new ReadingAllocation { CampaignId = campaign.Id, UserId = fatima.Id, Type = ReadingAllocationType.Para, Description = "Para 22", ReadingCount = 5991, Region = "UK", Status = ReadingAllocationStatus.Completed, UpdatedAt = DateTime.UtcNow.AddDays(-1) });

            // ---- 3.14 Participation opportunities ----
            db.ParticipationOpportunities.AddRange(
                new ParticipationOpportunity { MosqueId = mosque.Id, Title = "Saturday Mosque Cleaning", Type = ParticipationType.Volunteering, Description = "Help keep the house of Allah clean. Meet at 10am, refreshments provided.", Date = start.AddDays(4) },
                new ParticipationOpportunity { MosqueId = mosque.Id, Title = "New Muslims Support Circle", Type = ParticipationType.Class, Description = "Weekly support and basics class for new Muslims and those returning to practice.", Date = start.AddDays(6) });

            // ---- 3.15 Umrah guide ----
            var umrahGuide = new JourneyGuide { Type = JourneyType.Umrah, Title = "Umrah Step by Step" };
            db.JourneyGuides.Add(umrahGuide);
            await db.SaveChangesAsync();

            db.JourneyStages.AddRange(
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 1, Title = "Pre-Departure", Description = "Settle debts, seek forgiveness from family and friends, write a will, and learn the rites. Make sincere tawbah before travelling.", Duas = "Dua of travel: Subhanal-ladhi sakkhara lana hadha..." },
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 2, Title = "Ihram", Description = "At or before the miqat: perform ghusl, wear the two cloths (men), pray two rak'ahs, and make the intention for Umrah. Begin the talbiyah.", Duas = "Labbayk Allahumma labbayk, labbayka la sharika laka labbayk..." },
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 3, Title = "Tawaf", Description = "Seven circuits of the Ka'bah beginning at the Black Stone. Men uncover the right shoulder (idtiba) and walk briskly in the first three circuits (raml).", Duas = "Between the Yemeni corner and the Black Stone: Rabbana atina fid-dunya hasanah..." },
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 4, Title = "Sa'i", Description = "Seven laps between Safa and Marwah, beginning at Safa. Recite 'Innas-Safa wal-Marwata min sha'a'irillah' when first approaching Safa.", Duas = "On Safa and Marwah: face the Ka'bah, raise hands, and make dua." },
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 5, Title = "Halq or Taqsir", Description = "Men shave the head (halq, preferred) or shorten the hair; women trim a fingertip's length. The Umrah is now complete.", Duas = "Allahummaghfir lil-muhalliqin — O Allah, forgive those who shave their heads." },
                new JourneyStage { GuideId = umrahGuide.Id, OrderIndex = 6, Title = "Completion", Description = "Exit ihram. Spend your remaining time in Makkah in prayer, tawaf, and recitation. Drink Zamzam with the intention of cure and good.", Duas = "Dua upon drinking Zamzam: Allahumma inni as'aluka 'ilman nafi'an..." });

            await db.SaveChangesAsync();
        }

        private static async Task SeedContentEditorDemoAsync(ApplicationDbContext db)
        {
            if (await db.ContentArticles.AnyAsync()) return;

            db.ContentArticles.AddRange(
                new ContentArticle
                {
                    Title = "The Virtues of Morning Dhikr",
                    Summary = "An introduction to the spiritual benefits of post-Fajr remembrance.",
                    Body = "The morning adhkar are among the most beloved acts to Allah when performed consistently after Fajr...",
                    ItemType = LibraryItemType.Article,
                    Status = ContentPublishStatus.InReview
                },
                new ContentArticle
                {
                    Title = "Ba'alawi Wird — PDF Reference",
                    Summary = "Scanned reference booklet for murids.",
                    Body = "Download the official Khulasa reference PDF for community study circles.",
                    ItemType = LibraryItemType.Pdf,
                    ResourceUrl = "/uploads/documents/khulasa-reference.pdf",
                    Status = ContentPublishStatus.Draft
                },
                new ContentArticle
                {
                    Title = "Forty Hadith on Good Character",
                    Summary = "Curated hadith collection for madrassah reading.",
                    Body = "A structured reading plan across forty narrations on akhlaq.",
                    ItemType = LibraryItemType.Book,
                    Status = ContentPublishStatus.Approved
                });

            await db.SaveChangesAsync();
        }

        /// <summary>Remove broken adhkar library rows (empty title) that break the member counter UI.</summary>
        private static async Task RepairAdhkarLibraryAsync(ApplicationDbContext db)
        {
            var broken = await db.AdhkarItems
                .Where(a => string.IsNullOrWhiteSpace(a.Title))
                .ToListAsync();
            if (broken.Count == 0) return;

            var brokenIds = broken.Select(b => b.Id).ToList();
            var linked = await db.UserAdhkar
                .Where(u => u.AdhkarItemId != null && brokenIds.Contains(u.AdhkarItemId.Value))
                .ToListAsync();
            if (linked.Count > 0)
            {
                var linkedIds = linked.Select(l => l.Id).ToList();
                var logs = await db.UserAdhkarLogs.Where(l => linkedIds.Contains(l.UserAdhkarId)).ToListAsync();
                db.UserAdhkarLogs.RemoveRange(logs);
                db.UserAdhkar.RemoveRange(linked);
            }

            db.AdhkarItems.RemoveRange(broken);
            await db.SaveChangesAsync();
        }

        /// <summary>Re-apply demo staff roles on every startup (idempotent).</summary>
        private static async Task RepairDemoUserRolesAsync(UserManager<ApplicationUser> userManager)
        {
            var demoRoles = new (string Username, string[] Roles)[]
            {
                ("admin", [Roles.SuperAdmin]),
                ("mosqueadmin", [Roles.MosqueAdmin]),
                ("owner", [Roles.MosqueOwner]),
                ("prayereditor", [Roles.PrayerTimesEditor]),
                ("teacher", [Roles.Teacher]),
                ("muqaddam", [Roles.Muqaddam, Roles.Member]),
                ("editor", [Roles.ContentEditor]),
                ("parent", [Roles.Parent, Roles.Member]),
                ("member", [Roles.Member]),
            };

            foreach (var (username, roles) in demoRoles)
            {
                var user = await userManager.FindByNameAsync(username);
                if (user == null) continue;
                foreach (var role in roles)
                {
                    if (!await userManager.IsInRoleAsync(user, role))
                        await userManager.AddToRoleAsync(user, role);
                }
            }
        }

        private static async Task<ApplicationUser> EnsureUser(
            UserManager<ApplicationUser> userManager,
            string username, string email, string fullName, string password,
            params string[] roles)
        {
            var user = await userManager.FindByNameAsync(username);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = username,
                    Email = email,
                    FullName = fullName,
                    EmailConfirmed = true,
                    SecurityStamp = Guid.NewGuid().ToString()
                };
                await userManager.CreateAsync(user, password);
            }
            else
            {
                if (user.FullName != fullName)
                    user.FullName = fullName;
                if (!user.EmailConfirmed)
                    user.EmailConfirmed = true;
                if (user.Email != email)
                    user.Email = email;

                await userManager.UpdateAsync(user);

                var token = await userManager.GeneratePasswordResetTokenAsync(user);
                await userManager.ResetPasswordAsync(user, token, password);
            }

            var currentRoles = await userManager.GetRolesAsync(user);
            foreach (var role in currentRoles.Where(r => !roles.Contains(r)))
                await userManager.RemoveFromRoleAsync(user, role);

            foreach (var role in roles)
            {
                if (!await userManager.IsInRoleAsync(user, role))
                    await userManager.AddToRoleAsync(user, role);
            }

            return user;
        }

        private static async Task EnsurePlatformConfigAsync(ApplicationDbContext db)
        {
            var defaults = new Dictionary<string, string>
            {
                [PlatformConfigKeys.TariqaBaAlawi] = "Khulasa Wird (Morning)",
                [PlatformConfigKeys.TariqaShadhili] = "Hizb al-Bahr",
                [PlatformConfigKeys.GlobalBanner] = string.Empty,
                [PlatformConfigKeys.AllowMultiMosqueOwnership] = "false",
            };

            foreach (var (key, value) in defaults)
            {
                if (await db.PlatformConfigs.AnyAsync(c => c.Key == key)) continue;
                db.PlatformConfigs.Add(new PlatformConfig { Key = key, Value = value });
            }
            await db.SaveChangesAsync();
        }

        /// <summary>Migrate legacy Claimed mosques to ClaimPending and ensure claim records exist.</summary>
        private static async Task EnrichPublicProfileDemoAsync(ApplicationDbContext db, Mosque mosque, bool includeDonations = true)
        {
            if (mosque.EstablishedYear == null)
            {
                mosque.EstablishedYear = mosque.Slug.Contains("leeds") ? 1998 : 1987;
                mosque.Capacity = mosque.Slug.Contains("leeds") ? 400 : 850;
                mosque.Vision = "A vibrant centre of worship, learning, and community service for generations to come.";
                mosque.History = "Founded by local families, our mosque has grown into a hub for daily prayers, madrassah education, and community outreach.";
                mosque.ParkingInfo = "Free on-street parking on Manningham Lane; accessible bays near the main entrance.";
                mosque.ShortDescription = "Serving Bradford with daily prayers, education, and community programmes.";
                mosque.FacilitiesJson = JsonSerializer.Serialize(new[] { "Parking", "WuduArea", "WomensPrayerArea", "WheelchairAccess", "Madrasah", "CommunityHall" });
                mosque.ServicesJson = JsonSerializer.Serialize(new[] { "DailyPrayers", "Jumuah", "QuranClasses", "ArabicClasses", "Youth", "Nikah" });
                mosque.GalleryJson = JsonSerializer.Serialize(new[]
                {
                    "/uploads/mosques/demo-banner.png",
                    "/uploads/mosques/demo-logo.png",
                    "/uploads/mosques/demo-banner.png"
                });
                mosque.ProfileJson = JsonSerializer.Serialize(new
                {
                    leadership = new[]
                    {
                        new { name = "Imam Abdullah Rahman", role = "Head Imam", bio = "Hafiz & graduate of Islamic studies with 15 years community leadership.", photoUrl = "/uploads/mosques/demo-logo.png" },
                        new { name = "Sr. Fatima Khan", role = "Education Director", bio = "Oversees madrassah curriculum and sisters programmes.", photoUrl = (string?)null },
                        new { name = "Br. Yusuf Ahmed", role = "Chair of Trustees", bio = "Coordinates governance and community partnerships.", photoUrl = (string?)null }
                    },
                    stats = new { members = 1240, weeklyAttendance = 680, eventsHosted = 96, yearsOfService = mosque.EstablishedYear.HasValue ? DateTime.UtcNow.Year - mosque.EstablishedYear.Value : 35 }
                });
                if (mosque.Latitude == null)
                {
                    mosque.Latitude = 53.796;
                    mosque.Longitude = -1.759;
                }
                if (string.IsNullOrEmpty(mosque.BannerUrl))
                    mosque.BannerUrl = "/uploads/mosques/demo-banner.png";
                if (string.IsNullOrEmpty(mosque.LogoUrl))
                    mosque.LogoUrl = "/uploads/mosques/demo-logo.png";
            }

            foreach (var key in new[] { "Donations", "Madrassah", "Events", "Announcements" })
            {
                var setting = await db.MosqueSettings.FirstOrDefaultAsync(s => s.MosqueId == mosque.Id && s.ModuleKey == key);
                if (setting == null)
                    db.MosqueSettings.Add(new MosqueSetting { MosqueId = mosque.Id, ModuleKey = key, IsEnabled = true });
                else
                    setting.IsEnabled = true;
            }

            if (includeDonations && !await db.DonationFunds.AnyAsync(f => f.MosqueId == mosque.Id))
            {
                db.DonationFunds.AddRange(
                    new DonationFund { MosqueId = mosque.Id, Name = "General Fund", FundType = "General", Description = "Support daily operations and utilities.", ExternalUrl = "https://example.org/donate", SortOrder = 0 },
                    new DonationFund { MosqueId = mosque.Id, Name = "Zakat Fund", FundType = "Zakat", Description = "Distributed to eligible recipients in our community.", ExternalUrl = "https://example.org/zakat", SortOrder = 1 },
                    new DonationFund { MosqueId = mosque.Id, Name = "Building Appeal", FundType = "Building", Description = "Expansion and refurbishment of prayer halls.", ExternalUrl = "https://example.org/building", SortOrder = 2 }
                );
            }
        }
    }
}
