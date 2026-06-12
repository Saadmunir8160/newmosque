/** Mirrors backend MosqueOS.Domain.Constants.Roles */
export const ROLES = {
  SuperAdmin: 'Super Admin',
  MosqueOwner: 'Mosque Owner',
  MosqueAdmin: 'Mosque Admin',
  PrayerTimesEditor: 'Prayer Times Editor',
  Teacher: 'Teacher',
  Muqaddam: 'Muqaddam',
  ContentEditor: 'Content Editor',
  Parent: 'Parent',
  Member: 'Member'
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
