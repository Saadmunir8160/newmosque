import { ROLES } from '../constants/roles';



export interface NavItem {

  label: string;

  route: string;

  section: string;

  roles?: string[];

  icon?: string;

}



const ADMINS = [ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];

const MAIN_ACCESS = [...ADMINS, ROLES.Member, ROLES.Parent];

export const GUEST_NAV_ITEMS: NavItem[] = [
  { section: 'Browse', label: 'Today', route: '/dashboard' },
  { section: 'Browse', label: 'Prayer Times', route: '/dashboard/prayer-times' },
  { section: 'Browse', label: 'Announcements', route: '/dashboard/announcements' },
  { section: 'Browse', label: 'Events', route: '/dashboard/events' },
  { section: 'Browse', label: 'Demo Mosque', route: '/demo' },
];



export const NAV_ITEMS: NavItem[] = [

  // —— Main (Member, Parent, Mosque staff) ——

  { section: 'Main', label: 'Today', route: '/dashboard', roles: MAIN_ACCESS },

  { section: 'Main', label: 'Prayer Times', route: '/dashboard/prayer-times', roles: [...MAIN_ACCESS, ROLES.PrayerTimesEditor] },

  { section: 'Main', label: 'Announcements', route: '/dashboard/announcements', roles: MAIN_ACCESS },

  { section: 'Main', label: 'Events', route: '/dashboard/events', roles: MAIN_ACCESS },



  // —— Prayer Times Editor (dedicated) ——

  { section: 'Prayer Times', label: 'View Timetable', route: '/dashboard/prayer-times', roles: [ROLES.PrayerTimesEditor] },

  { section: 'Prayer Times', label: 'Edit Timetable', route: '/dashboard/admin/prayer-times', roles: [ROLES.PrayerTimesEditor] },



  // —— Super Admin ——

  { section: 'Super Admin', label: 'Platform Control', route: '/dashboard/super', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Mosque Listings', route: '/dashboard/super/mosques', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Verify Claims', route: '/dashboard/super/claims', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'User Management', route: '/dashboard/super/users', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Mosque Data', route: '/dashboard/super/mosque-data', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Feature Flags', route: '/dashboard/super/features', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Audit Logs', route: '/dashboard/super/audit', roles: [ROLES.SuperAdmin] },



  // —— Mosque Owner ——

  { section: 'Mosque Owner', label: 'Owner Dashboard', route: '/dashboard/owner', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'Claim Mosque', route: '/dashboard/owner/claim', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'Appoint Staff', route: '/dashboard/owner/staff', roles: [ROLES.MosqueOwner] },



  // —— Mosque Management ——

  { section: 'Mosque Management', label: 'Mosque Profile', route: '/dashboard/admin/mosque', roles: ADMINS },

  { section: 'Mosque Management', label: 'Edit Prayer Times', route: '/dashboard/admin/prayer-times', roles: [ROLES.SuperAdmin, ROLES.MosqueAdmin, ROLES.PrayerTimesEditor] },

  { section: 'Mosque Management', label: 'Manage Announcements', route: '/dashboard/admin/announcements', roles: ADMINS },

  { section: 'Mosque Management', label: 'Manage Events', route: '/dashboard/admin/events', roles: ADMINS },

  { section: 'Mosque Management', label: 'Janaza', route: '/dashboard/admin/janaza', roles: ADMINS },

  { section: 'Mosque Management', label: 'Communities', route: '/dashboard/admin/communities', roles: ADMINS },

  { section: 'Mosque Management', label: 'Participation', route: '/dashboard/admin/participation', roles: ADMINS },

  { section: 'Mosque Management', label: 'Module Settings', route: '/dashboard/admin/settings', roles: ADMINS },

  { section: 'Mosque Management', label: 'Madrassah Overview', route: '/dashboard/admin/madrassah', roles: ADMINS },



  // —— Teacher (Madrassah only) ——

  { section: 'Madrassah', label: 'Teacher Dashboard', route: '/dashboard/teacher', roles: [ROLES.Teacher] },

  { section: 'Madrassah', label: 'My Classes', route: '/dashboard/teacher/classes', roles: [ROLES.Teacher] },

  { section: 'Madrassah', label: 'Record Attendance', route: '/dashboard/teacher/attendance', roles: [ROLES.Teacher] },



  // —— Muqaddam ——

  { section: 'Muqaddam', label: 'Murid Summary', route: '/dashboard/muqaddam', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },

  { section: 'Muqaddam', label: 'Death Readings', route: '/dashboard/muqaddam/readings', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },



  // —— Content Editor ——

  { section: 'Content', label: 'Awrad & Wird', route: '/dashboard/content/awrad', roles: [ROLES.ContentEditor, ...ADMINS] },

  { section: 'Content', label: 'Duas Library', route: '/dashboard/content/duas', roles: [ROLES.ContentEditor, ...ADMINS] },

  { section: 'Content', label: 'Adhkar Items', route: '/dashboard/content/adhkar', roles: [ROLES.ContentEditor, ...ADMINS] },

  { section: 'Content', label: 'Ritual Guides', route: '/dashboard/content/ritual-guides', roles: [ROLES.ContentEditor, ...ADMINS] },



  // —— Parent ——

  { section: 'Parent', label: 'My Children', route: '/dashboard/parent', roles: [ROLES.Parent] },



  // —— Member personal worship ——

  { section: 'My Worship', label: 'My Wird', route: '/dashboard/member/wird', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Adhkar Counter', route: '/dashboard/member/adhkar', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Qur\'an Plan', route: '/dashboard/member/quran', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Duas', route: '/dashboard/member/duas', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Communities', route: '/dashboard/member/communities', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Death Readings', route: '/dashboard/member/readings', roles: [ROLES.Member, ROLES.Parent, ...ADMINS] },

  { section: 'My Worship', label: 'Preferences', route: '/dashboard/member/preferences', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

];



function hasAny(userRoles: string[], allowed: string[]): boolean {

  return allowed.some(r => userRoles.includes(r));

}



function isSinglePurpose(userRoles: string[], role: string, management: string[]): boolean {

  return userRoles.includes(role) && !hasAny(userRoles, management);

}



export function homeRouteForRoles(userRoles: string[]): string {

  if (userRoles.includes(ROLES.SuperAdmin)) return '/dashboard/super';

  if (userRoles.includes(ROLES.MosqueOwner)) return '/dashboard/owner';

  if (userRoles.includes(ROLES.MosqueAdmin)) return '/dashboard/admin/mosque';

  if (userRoles.includes(ROLES.PrayerTimesEditor)) return '/dashboard/admin/prayer-times';

  if (userRoles.includes(ROLES.Teacher)) return '/dashboard/teacher';

  if (userRoles.includes(ROLES.ContentEditor)) return '/dashboard/content/awrad';

  if (userRoles.includes(ROLES.Muqaddam)) return '/dashboard/muqaddam';

  if (userRoles.includes(ROLES.Parent)) return '/dashboard/parent';

  if (userRoles.includes(ROLES.Member)) return '/dashboard';

  return '/dashboard';

}



export function navForGuest(): NavItem[] {
  return GUEST_NAV_ITEMS;
}

export function navIsSuperAdmin(userRoles: string[]): boolean {
  return userRoles.includes(ROLES.SuperAdmin);
}

export function navForRoles(userRoles: string[]): NavItem[] {

  if (navIsSuperAdmin(userRoles)) return [];



  const editorOnly = isSinglePurpose(userRoles, ROLES.PrayerTimesEditor, ADMINS);

  const teacherOnly = isSinglePurpose(userRoles, ROLES.Teacher, ADMINS);

  const contentOnly = isSinglePurpose(userRoles, ROLES.ContentEditor, ADMINS);

  const muqaddamOnly = isSinglePurpose(userRoles, ROLES.Muqaddam, ADMINS);



  return NAV_ITEMS.filter(item => {

    if (!item.roles?.length) return false;

    if (!item.roles.some(r => userRoles.includes(r))) return false;



    if (editorOnly) {

      return item.section === 'Prayer Times' ||

        (item.section === 'Mosque Management' && item.route === '/dashboard/admin/prayer-times');

    }

    if (teacherOnly) return item.section === 'Madrassah';

    if (contentOnly) return item.section === 'Content';

    if (muqaddamOnly) return item.section === 'Muqaddam' || item.section === 'My Worship';



    // Hide duplicate Prayer Times section for editors who also have admin

    if (item.section === 'Prayer Times' && hasAny(userRoles, ADMINS)) return false;



    return true;

  });

}



export function navSections(items: NavItem[]): { section: string; items: NavItem[] }[] {

  const seen = new Set<string>();

  const sections: { section: string; items: NavItem[] }[] = [];

  for (const item of items) {

    if (!seen.has(item.section)) {

      seen.add(item.section);

      sections.push({ section: item.section, items: [] });

    }

    sections.find(s => s.section === item.section)!.items.push(item);

  }

  return sections;

}



const NAV_ICONS: Record<string, string> = {

  '/dashboard': '📅',

  '/dashboard/prayer-times': '🕌',

  '/dashboard/announcements': '📢',

  '/dashboard/events': '📆',

  '/dashboard/super': '⚙️',

  '/dashboard/super/mosques': '🕌',

  '/dashboard/super/claims': '✅',

  '/dashboard/super/users': '👥',

  '/dashboard/super/mosque-data': '📊',

  '/dashboard/super/features': '🔧',

  '/dashboard/super/audit': '📋',

  '/dashboard/owner': '🏛️',

  '/dashboard/owner/claim': '📝',

  '/dashboard/owner/staff': '👤',

  '/dashboard/admin/mosque': '🏠',

  '/dashboard/admin/prayer-times': '⏰',

  '/dashboard/admin/announcements': '📢',

  '/dashboard/admin/events': '📆',

  '/dashboard/admin/janaza': '🕊️',

  '/dashboard/admin/communities': '🤝',

  '/dashboard/admin/participation': '✋',

  '/dashboard/admin/settings': '🔧',

  '/dashboard/admin/madrassah': '📚',

  '/dashboard/teacher': '👨‍🏫',

  '/dashboard/teacher/classes': '📖',

  '/dashboard/teacher/attendance': '✓',

  '/dashboard/muqaddam': '📿',

  '/dashboard/muqaddam/readings': '📖',

  '/dashboard/content/awrad': '📿',

  '/dashboard/content/duas': '🤲',

  '/dashboard/content/adhkar': '📿',

  '/dashboard/content/ritual-guides': '📖',

  '/dashboard/parent': '👨‍👩‍👧',

  '/dashboard/member/wird': '📿',

  '/dashboard/member/adhkar': '🔢',

  '/dashboard/member/quran': '📖',

  '/dashboard/member/duas': '🤲',

  '/dashboard/member/communities': '🤝',

  '/dashboard/member/readings': '📖',

  '/dashboard/member/preferences': '⚙️',

  '/demo': '🕌',

};



export function navIcon(item: NavItem): string {

  return item.icon ?? NAV_ICONS[item.route] ?? '▪';

}


