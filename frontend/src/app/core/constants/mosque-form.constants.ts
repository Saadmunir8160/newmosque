export const MODULE_LABELS: Record<string, string> = {
  prayer_times: 'Prayer Times',
  PrayerTimes: 'Prayer Times',
  announcements: 'Announcements',
  Announcements: 'Announcements',
  events: 'Events',
  Events: 'Events',
  madrassah: 'Madrassah',
  Madrassah: 'Madrassah',
  communities: 'Communities',
  Communities: 'Communities',
  participation: 'Participation',
  Participation: 'Participation',
  janaza: 'Janaza',
  Janaza: 'Janaza',
  donations: 'Donations',
  Courses: 'Courses',
  VolunteerManagement: 'Volunteers',
  Volunteers: 'Volunteers',
  Nikah: 'Nikah',
  Funeral: 'Funeral',
  Library: 'Library',
  Quran: 'Library',
  Duas: 'Duas',
};

export const FACILITY_LABELS: Record<string, string> = {
  Parking: 'Parking',
  WuduArea: 'Wudu area',
  WomensPrayerArea: "Women's prayer area",
  WheelchairAccess: 'Wheelchair access',
  Madrasah: 'Madrasah',
  CommunityHall: 'Community hall',
};

export function resolveModuleKey(key: string): string {
  const normalized = key.trim();
  const entry = Object.entries(MODULE_LABELS).find(([k]) => k.toLowerCase() === normalized.toLowerCase());
  return entry?.[0] ?? normalized;
}

export function isModuleFlagEnabled(
  flags: { moduleKey: string; isEnabled: boolean }[] | Record<string, boolean> | undefined,
  key: string
): boolean {
  if (!flags) return true;
  if (Array.isArray(flags)) {
    const canonical = resolveModuleKey(key);
    const row = flags.find(f => resolveModuleKey(f.moduleKey) === canonical || f.moduleKey === key);
    return row ? row.isEnabled : true;
  }
  const canonical = resolveModuleKey(key);
  const match = Object.entries(flags).find(([k]) => resolveModuleKey(k) === canonical || k === key);
  return match ? match[1] : true;
}
