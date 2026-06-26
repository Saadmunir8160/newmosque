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
  Member: 'Member',
  Guest: 'Guest'
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

/** Priority order matching homeRouteForRoles in nav.config.ts */
export const ROLE_PRIORITY: AppRole[] = [
  ROLES.SuperAdmin,
  ROLES.MosqueOwner,
  ROLES.MosqueAdmin,
  ROLES.PrayerTimesEditor,
  ROLES.Teacher,
  ROLES.ContentEditor,
  ROLES.Muqaddam,
  ROLES.Parent,
  ROLES.Member,
];

/** Highest-priority role the user holds (their default home dashboard role). */
export function primaryRole(userRoles: string[]): AppRole | null {
  for (const role of ROLE_PRIORITY) {
    if (userRoles.includes(role)) return role;
  }
  return null;
}

/** Human-readable label for the user's primary role. */
export function roleDisplayName(userRoles: string[]): string {
  if (!userRoles?.length) return '';
  return primaryRole(userRoles) ?? ROLES.Member;
}
