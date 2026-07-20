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
  permissions?: string[];
  emailConfirmed?: boolean;
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

export interface MosqueLeadership {
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
}

export interface MosqueSocialLink {
  platform: string;
  label?: string;
  url: string;
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
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  /** Preferred social links (JSON). Falls back to legacy *Url fields when empty. */
  socialLinks?: MosqueSocialLink[];
  shortDescription?: string;
  description?: string;
  facilities?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  establishedYear?: number;
  capacity?: number;
  vision?: string;
  history?: string;
  parkingInfo?: string;
  gallery?: string[];
  services?: string[];
  leadership?: MosqueLeadership[];
  statsOverride?: { members?: number; weeklyAttendance?: number; eventsHosted?: number; yearsOfService?: number };
  mapLocation?: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  status: string;
  ownerId?: string;
  allowClaimRequests?: boolean;
  requireManualApproval?: boolean;
  publicProfileEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  settings?: MosqueSetting[];
}

export interface ClaimSubmissionDetails {
  claimId: number;
  claimReference: string;
  reviewStatus: string;
  submittedAt: string;
  expectedReviewTime: string;
}

export interface MyClaimListItem {
  claimId: number;
  claimReference: string;
  mosqueId: number;
  mosqueName: string;
  mosqueSlug?: string;
  status: string;
  reviewStatus: string;
  submittedDate: string;
  lastUpdated?: string;
  rejectionReason?: string;
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
  status?: string;
  publishedAt?: string;
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

export type JanazaStatus = 'Draft' | 'Published' | 'Unpublished';

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
  status?: JanazaStatus;
  postedByName?: string;
  postedByInitials?: string;
  createdAt?: string;
  publishedAt?: string;
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
  status?: string;
  sourceName?: string;
  sourceRef?: string;
}

export interface WirdCollection {
  id: number;
  name: string;
  tariqa: string;
  type: string;
  recommendedTime?: string;
  description?: string;
  status?: string;
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
