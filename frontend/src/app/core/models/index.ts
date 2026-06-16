export interface LoginResponse {
  token: string;
  expiration: string;
  username: string;
  fullName: string;
  roles: string[];
}

export interface UserProfile {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  tariqa: string;
  level: string;
  displayPreference: string;
  wirdMode: string;
  homeMosqueId: number | null;
  searchRadiusKm: number;
  interests: string | null;
  roles: string[];
}

export interface MosqueSetting {
  id: number;
  mosqueId: number;
  moduleKey: string;
  isEnabled: boolean;
}

export interface MosqueStaffMember {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Mosque {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  mapLocation?: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  status: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: MosqueSetting[];
}

export interface PrayerTimesDaily {
  id: number;
  mosqueId: number;
  date: string;
  fajrStart: string;
  fajrJamaat: string;
  dhuhrStart: string;
  dhuhrJamaat: string;
  asrStart: string;
  asrJamaat: string;
  maghribStart: string;
  maghribJamaat: string;
  ishaStart: string;
  ishaJamaat: string;
}

export interface JumuahTime {
  id: number;
  mosqueId: number;
  slotNumber: number;
  khutbahTime: string;
  jamaatTime: string;
}

export interface NextPrayer {
  name: string;
  start: string;
  jamaat: string;
}

export interface Announcement {
  id: number;
  mosqueId: number;
  title: string;
  summary: string;
  body: string;
  imageUrl?: string;
  status: string;
  isFeatured: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface MosqueEvent {
  id: number;
  mosqueId: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  speaker?: string;
  eventType: string;
  status: string;
}

export interface JanazaAnnouncement {
  id: number;
  mosqueId: number;
  name: string;
  dateOfDeath: string;
  janazaDate: string;
  janazaTime: string;
  location: string;
  burialLocation?: string;
  notes?: string;
}

export interface ReadingCampaign {
  id: number;
  mosqueId: number;
  deceasedName: string;
  isActive: boolean;
}

export interface Dua {
  id: number;
  title: string;
  arabicText: string;
  transliteration?: string;
  translation?: string;
  category: string;
}

export interface WirdCollection {
  id: number;
  name: string;
  tariqa: string;
  type: string;
  recommendedTime?: string;
  description?: string;
}

export interface ParticipationOpportunity {
  id: number;
  mosqueId: number;
  title: string;
  type: string;
  description?: string;
  date?: string;
  isActive: boolean;
}

export interface QuranCard {
  todaysPara: number;
  completedParas: number;
  totalParas: number;
}

export interface TodayResponse {
  date: string;
  dayOfWeek: string;
  isFriday: boolean;
  mosqueId: number;
  prayerTimes: PrayerTimesDaily | null;
  nextPrayer: NextPrayer | null;
  tonightEvent: MosqueEvent | null;
  recommendedWird: WirdCollection | null;
  recommendedDua: Dua | null;
  quranCard: QuranCard | null;
  announcements: Announcement[];
  participationPrompt: ParticipationOpportunity | null;
}
