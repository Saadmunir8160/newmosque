import {
  Announcement, JumuahTime, Mosque, MosqueEvent, PrayerTimesDaily
} from '../../../core/models';

/** Offline demo content — mirrors backend DataSeeder for Masjid Al-Noor Bradford */
export const DEMO_FALLBACK_MOSQUE: Mosque = {
  id: 1,
  name: 'Masjid Al-Noor Bradford',
  slug: 'masjid-al-noor-bradford',
  address: '12 Manningham Lane',
  city: 'Bradford',
  postcode: 'BD1 3EA',
  country: 'United Kingdom',
  phone: '+44 1274 555000',
  email: 'info@alnoorbradford.org.uk',
  website: 'https://alnoorbradford.org.uk',
  description: 'A community mosque in the heart of Bradford serving daily prayers, madrassah classes, and weekly gatherings of dhikr.',
  timezone: 'Europe/London',
  status: 'Active',
};

export function demoFallbackPrayerTimes(): PrayerTimesDaily {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: 1,
    mosqueId: 1,
    date: today,
    fajrStart: '03:30:00',
    fajrJamaat: '04:15:00',
    dhuhrStart: '13:05:00',
    dhuhrJamaat: '13:30:00',
    asrStart: '17:25:00',
    asrJamaat: '18:00:00',
    maghribStart: '21:20:00',
    maghribJamaat: '21:25:00',
    ishaStart: '22:45:00',
    ishaJamaat: '23:00:00',
  };
}

export const DEMO_FALLBACK_JUMUAH: JumuahTime[] = [
  { id: 1, mosqueId: 1, slotNumber: 1, khutbahTime: '13:00:00', jamaatTime: '13:30:00' },
  { id: 2, mosqueId: 1, slotNumber: 2, khutbahTime: '14:00:00', jamaatTime: '14:30:00' },
];

export const DEMO_FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    mosqueId: 1,
    title: 'Ramadan Timetable Released',
    summary: 'The full Ramadan prayer and iftar timetable is now available.',
    body: '',
    status: 'Published',
    isFeatured: true,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    mosqueId: 1,
    title: 'Weekly Tafsir Class Resumes',
    summary: 'Sunday tafsir class with Ustadh Yusuf resumes this week after Maghrib.',
    body: '',
    status: 'Published',
    isFeatured: false,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    mosqueId: 1,
    title: 'New Madrassah Term Enrolment',
    summary: 'Registration open for the spring term — ages 5 to 16.',
    body: '',
    status: 'Published',
    isFeatured: false,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export function demoFallbackEvents(): MosqueEvent[] {
  const d = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() + offset);
    return x.toISOString().slice(0, 10);
  };
  return [
    {
      id: 1,
      mosqueId: 1,
      title: 'Mawlid Night',
      description: 'Monthly mawlid gathering with qasidas, salawat, and refreshments.',
      date: d(3),
      startTime: '19:30:00',
      endTime: '21:30:00',
      location: 'Main Hall',
      speaker: 'Community gathering',
      eventType: 'Mawlid',
      status: 'Published',
    },
    {
      id: 2,
      mosqueId: 1,
      title: 'Sunday Tafsir Circle',
      description: 'Weekly tafsir of Surah al-Kahf with Ustadh Yusuf.',
      date: d(5),
      startTime: '20:00:00',
      location: 'Library Room',
      speaker: 'Ustadh Yusuf',
      eventType: 'Class',
      status: 'Published',
    },
  ];
}

export const DEMO_FALLBACK_DUA = {
  title: 'Dua for entering the mosque',
  arabicText: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
  translation: 'O Allah, open for me the doors of Your mercy.',
};

export const DEMO_FALLBACK_WIRD = 'Khulasa Wird (Morning)';
export const DEMO_FALLBACK_QURAN = 'Para 12 of 30';
