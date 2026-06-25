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
  { section: 'Browse', label: 'Home', route: '/dashboard/guest' },
  { section: 'Browse', label: 'Prayer times', route: '/dashboard/guest/prayer-times' },
  { section: 'Browse', label: 'Announcements', route: '/dashboard/guest/announcements' },
  { section: 'Browse', label: 'Events', route: '/dashboard/guest/events' },
  { section: 'Browse', label: 'Janaza notices', route: '/dashboard/guest/janaza' },
  { section: 'Browse', label: 'Communities', route: '/dashboard/guest/communities' },
  { section: 'Content', label: 'Duas library', route: '/dashboard/guest/duas' },
  { section: 'Content', label: 'Adhkar library', route: '/dashboard/guest/adhkar' },
  { section: 'Content', label: 'Ritual guides', route: '/dashboard/guest/ritual-guides' },
  { section: 'Content', label: 'Umrah & Hajj guides', route: '/dashboard/guest/journey-guides' },
  { section: 'Account', label: 'Login', route: '/auth/login' },
  { section: 'Account', label: 'Register', route: '/register' },
];



export const NAV_ITEMS: NavItem[] = [

  // —— Main (Member, Parent, Mosque staff) ——

  { section: 'Main', label: 'Today screen', route: '/dashboard', roles: MAIN_ACCESS },

  { section: 'Main', label: 'Prayer times', route: '/dashboard/prayer-times', roles: [...MAIN_ACCESS, ROLES.PrayerTimesEditor] },

  { section: 'Main', label: 'Announcements', route: '/dashboard/announcements', roles: MAIN_ACCESS },

  { section: 'Main', label: 'Events', route: '/dashboard/events', roles: MAIN_ACCESS },



  // —— Prayer Times Editor (dedicated) ——

  { section: 'Prayer Times', label: 'Dashboard', route: '/dashboard/prayer-editor', roles: [ROLES.PrayerTimesEditor] },
  { section: 'Prayer Times', label: 'Daily timetable', route: '/dashboard/prayer-editor/daily', roles: [ROLES.PrayerTimesEditor] },
  { section: 'Prayer Times', label: 'Monthly view', route: '/dashboard/prayer-editor/monthly', roles: [ROLES.PrayerTimesEditor] },
  { section: 'Prayer Times', label: 'Jumuah times', route: '/dashboard/prayer-editor/jumuah', roles: [ROLES.PrayerTimesEditor] },



  // —— Super Admin (fallback nav only — dedicated sidebar uses super-admin-nav.config) ——

  { section: 'Super Admin', label: 'Platform Control', route: '/dashboard/super', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Mosque listings', route: '/dashboard/super/mosques', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Claim management', route: '/dashboard/super/claims', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Mosque data', route: '/dashboard/super/mosque-data', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'Module flags', route: '/dashboard/super/features', roles: [ROLES.SuperAdmin] },

  { section: 'Super Admin', label: 'User Management', route: '/dashboard/super/users', roles: [ROLES.SuperAdmin] },



  // —— Mosque Owner (fallback nav only — dedicated sidebar uses owner-nav.config) ——

  { section: 'Mosque Owner', label: 'Owner Dashboard', route: '/dashboard/owner', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'Mosque profile', route: '/dashboard/owner/profile', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'My claims', route: '/dashboard/owner/my-claims', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'Mosque listings', route: '/dashboard/owner/mosque-listings', roles: [ROLES.MosqueOwner] },

  { section: 'Mosque Owner', label: 'Module settings', route: '/dashboard/owner/settings', roles: [ROLES.MosqueOwner] },
  { section: 'Mosque Owner', label: 'Admin management', route: '/dashboard/owner/staff', roles: [ROLES.MosqueOwner] },



  // —— Mosque Admin (fallback nav only — dedicated sidebar uses mosque-admin-nav.config) ——

  { section: 'Mosque Admin', label: 'Overview', route: '/dashboard/mosque', roles: [ROLES.MosqueAdmin] },

  { section: 'Mosque Admin', label: 'Mosque profile', route: '/dashboard/mosque/profile', roles: [ROLES.MosqueAdmin] },

  { section: 'Mosque Admin', label: 'Module settings', route: '/dashboard/mosque/settings', roles: [ROLES.MosqueAdmin] },

  // —— Mosque Management (Module 3.1 only) ——

  { section: 'Mosque Management', label: 'Mosque Profile', route: '/dashboard/admin/mosque', roles: ADMINS },

  { section: 'Mosque Management', label: 'Module Settings', route: '/dashboard/admin/settings', roles: ADMINS },



  // —— Teacher (Madrassah only) ——

  { section: 'Madrassah', label: 'Dashboard', route: '/dashboard/teacher', roles: [ROLES.Teacher] },
  { section: 'Madrassah', label: 'My classes', route: '/dashboard/teacher/classes', roles: [ROLES.Teacher] },
  { section: 'Madrassah', label: 'Attendance', route: '/dashboard/teacher/attendance', roles: [ROLES.Teacher] },
  { section: 'Madrassah', label: 'Progress notes', route: '/dashboard/teacher/progress-notes', roles: [ROLES.Teacher] },
  { section: 'Madrassah', label: 'Class reports', route: '/dashboard/teacher/reports', roles: [ROLES.Teacher] },



  // —— Muqaddam ——

  { section: 'Muqaddam', label: 'Dashboard', route: '/dashboard/muqaddam', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },
  { section: 'Muqaddam', label: 'Murid summaries', route: '/dashboard/muqaddam', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },
  { section: 'Muqaddam', label: 'My communities', route: '/dashboard/member/communities', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },
  { section: 'Muqaddam', label: 'My wird & adhkar', route: '/dashboard/member/wird', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },
  { section: 'Muqaddam', label: 'Death readings', route: '/dashboard/muqaddam/readings', roles: [ROLES.Muqaddam, ROLES.SuperAdmin] },



  // —— Content Editor ——

  { section: 'Content', label: 'Dashboard', route: '/dashboard/content', roles: [ROLES.ContentEditor, ...ADMINS] },
  { section: 'Content', label: 'Awrad', route: '/dashboard/content/awrad', roles: [ROLES.ContentEditor, ...ADMINS] },
  { section: 'Content', label: 'Duas', route: '/dashboard/content/duas', roles: [ROLES.ContentEditor, ...ADMINS] },
  { section: 'Content', label: 'Adhkar', route: '/dashboard/content/adhkar', roles: [ROLES.ContentEditor, ...ADMINS] },
  { section: 'Content', label: 'Library', route: '/dashboard/content/library', roles: [ROLES.ContentEditor, ...ADMINS] },
  { section: 'Content', label: 'Content Reviews', route: '/dashboard/content/reviews', roles: [ROLES.ContentEditor, ...ADMINS] },



  // —— Parent ——

  { section: 'Parent', label: 'Today screen', route: '/dashboard', roles: [ROLES.Parent] },
  { section: 'Parent', label: 'My children', route: '/dashboard/parent', roles: [ROLES.Parent] },
  { section: 'Parent', label: 'My wird & adhkar', route: '/dashboard/member/wird', roles: [ROLES.Parent] },
  { section: 'Parent', label: 'Participation', route: '/dashboard/participation', roles: [ROLES.Parent] },



  // —— Member personal worship ——

  { section: 'My Worship', label: 'My wird', route: '/dashboard/member/wird', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'My adhkar', route: '/dashboard/member/adhkar', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Duas library', route: '/dashboard/member/duas', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Qur\'an reading', route: '/dashboard/member/quran', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Communities', route: '/dashboard/member/communities', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },
  { section: 'My Worship', label: 'Participation', route: '/dashboard/participation', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },
  { section: 'My Worship', label: 'Ritual guides', route: '/dashboard/member/ritual-guides', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },
  { section: 'My Worship', label: 'Umrah & Hajj guides', route: '/dashboard/member/journey-guides', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },
  { section: 'My Worship', label: 'Janaza', route: '/dashboard/member/janaza', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

  { section: 'My Worship', label: 'Death readings', route: '/dashboard/member/readings', roles: [ROLES.Member, ROLES.Parent, ...ADMINS] },

  { section: 'My Worship', label: 'My preferences', route: '/dashboard/member/preferences', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },
  { section: 'My Worship', label: 'Profile', route: '/dashboard/member/profile', roles: [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...ADMINS] },

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

  if (userRoles.includes(ROLES.MosqueAdmin) && !userRoles.includes(ROLES.MosqueOwner)) return '/dashboard/mosque';

  if (userRoles.includes(ROLES.MosqueAdmin)) return '/dashboard/admin';

  if (userRoles.includes(ROLES.PrayerTimesEditor)) return '/dashboard/prayer-editor';

  if (userRoles.includes(ROLES.Teacher)) return '/dashboard/teacher';

  if (userRoles.includes(ROLES.ContentEditor)) return '/dashboard/content';

  if (userRoles.includes(ROLES.Muqaddam)) return '/dashboard/muqaddam';

  if (userRoles.includes(ROLES.Parent)) return '/dashboard';

  if (userRoles.includes(ROLES.Member)) return '/dashboard';

  return '/dashboard';

}



export function navForGuest(): NavItem[] {
  return GUEST_NAV_ITEMS;
}

export function navIsSuperAdmin(userRoles: string[]): boolean {
  return userRoles.includes(ROLES.SuperAdmin);
}

export function navIsMosqueOwner(userRoles: string[]): boolean {
  return userRoles.includes(ROLES.MosqueOwner) && !userRoles.includes(ROLES.SuperAdmin);
}

/** Dedicated mosque-admin sidebar (not super admin / owner). */
export function navIsMosqueAdmin(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.MosqueAdmin)) return false;
  if (navIsSuperAdmin(userRoles) || navIsMosqueOwner(userRoles)) return false;
  return true;
}

/** Dedicated prayer-editor sidebar (not mosque admin / super admin). */
export function navIsPrayerEditor(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.PrayerTimesEditor)) return false;
  if (navIsSuperAdmin(userRoles) || navIsMosqueOwner(userRoles)) return false;
  if (hasAny(userRoles, ADMINS)) return false;
  return true;
}

/** Dedicated teacher sidebar (not admin roles). */
export function navIsTeacher(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.Teacher)) return false;
  if (navIsSuperAdmin(userRoles) || navIsMosqueOwner(userRoles) || navIsMosqueAdmin(userRoles)) return false;
  if (hasAny(userRoles, ADMINS)) return false;
  return true;
}

/** Dedicated muqaddam sidebar (muqaddam-only users). */
export function navIsMuqaddam(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.Muqaddam)) return false;
  if (navIsSuperAdmin(userRoles)) return false;
  if (hasAny(userRoles, ADMINS)) return false;
  return isSinglePurpose(userRoles, ROLES.Muqaddam, ADMINS);
}

/** Dedicated content-editor sidebar (content-editor-only users). */
export function navIsContentEditor(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.ContentEditor)) return false;
  if (navIsSuperAdmin(userRoles) || navIsMosqueOwner(userRoles) || navIsMosqueAdmin(userRoles)) return false;
  return isSinglePurpose(userRoles, ROLES.ContentEditor, ADMINS);
}

/** Dedicated member sidebar (not admin / editor / teacher / content / muqaddam-only). */
export function navIsMember(userRoles: string[]): boolean {
  if (!userRoles.includes(ROLES.Member)) return false;
  if (navIsSuperAdmin(userRoles) || navIsMosqueOwner(userRoles) || navIsMosqueAdmin(userRoles)) return false;
  if (navIsPrayerEditor(userRoles)) return false;
  if (navIsTeacher(userRoles)) return false;
  if (navIsMuqaddam(userRoles)) return false;
  if (isSinglePurpose(userRoles, ROLES.ContentEditor, ADMINS)) return false;
  return true;
}

export function navForRoles(userRoles: string[]): NavItem[] {

  if (navIsSuperAdmin(userRoles)) return [];

  if (navIsMosqueOwner(userRoles)) return [];

  if (navIsMosqueAdmin(userRoles)) return [];

  if (navIsTeacher(userRoles)) return [];

  if (navIsMuqaddam(userRoles)) return [];

  if (navIsContentEditor(userRoles)) return [];

  if (navIsMember(userRoles)) return [];

  const roles = userRoles?.length ? userRoles : [ROLES.Member];

  const editorOnly = isSinglePurpose(roles, ROLES.PrayerTimesEditor, ADMINS);

  const teacherOnly = isSinglePurpose(roles, ROLES.Teacher, ADMINS);

  const contentOnly = isSinglePurpose(roles, ROLES.ContentEditor, ADMINS);

  const muqaddamOnly = isSinglePurpose(roles, ROLES.Muqaddam, ADMINS);

  const parentOnly = isSinglePurpose(roles, ROLES.Parent, ADMINS);



  return NAV_ITEMS.filter(item => {

    if (!item.roles?.length) return false;

    if (!item.roles.some(r => roles.includes(r))) return false;



    if (editorOnly) {

      return item.section === 'Prayer Times' ||

        item.route === '/dashboard/prayer-editor' ||
        item.route === '/dashboard/prayer-editor/daily' ||
        item.route === '/dashboard/prayer-editor/monthly' ||
        item.route === '/dashboard/prayer-editor/jumuah';

    }

    if (teacherOnly) return item.section === 'Madrassah';

    if (contentOnly) return item.section === 'Content';

    if (muqaddamOnly) return item.section === 'Muqaddam';

    if (parentOnly) return item.section === 'Parent';



    // Hide duplicate Prayer Times section for editors who also have admin

    if (item.section === 'Prayer Times' && hasAny(roles, ADMINS)) return false;



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
  '/dashboard/mosque': '🕌',

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
  '/dashboard/teacher/progress-notes': '📝',
  '/dashboard/teacher/reports': '📊',
  '/dashboard/prayer-editor': '▦',
  '/dashboard/prayer-editor/daily': '⏰',
  '/dashboard/prayer-editor/monthly': '🗓️',
  '/dashboard/prayer-editor/jumuah': '🕌',

  '/dashboard/muqaddam': '📿',

  '/dashboard/muqaddam/readings': '📖',

  '/dashboard/content/awrad': '📿',
  '/dashboard/content': '▦',
  '/dashboard/content/library': '📚',
  '/dashboard/content/reviews': '✅',

  '/dashboard/content/duas': '🤲',

  '/dashboard/content/adhkar': '📿',

  '/dashboard/content/ritual-guides': '📖',

  '/dashboard/parent': '👨‍👩‍👧',

  '/dashboard/member/wird': '📿',

  '/dashboard/member/adhkar': '🔢',

  '/dashboard/member/quran': '📖',

  '/dashboard/member/duas': '🤲',

  '/dashboard/member/communities': '🤝',
  '/dashboard/member/ritual-guides': '💧',
  '/dashboard/member/journey-guides': '✈️',
  '/dashboard/member/janaza': '🌙',
  '/dashboard/participation': '✋',

  '/dashboard/member/readings': '📖',

  '/dashboard/member/preferences': '⚙️',
  '/dashboard/member/profile': '👤',

  '/demo': '🕌',
  '/dashboard/guest/updates': '📣',
  '/dashboard/guest/janaza': '🌙',

};



export function navIcon(item: NavItem): string {

  return item.icon ?? NAV_ICONS[item.route] ?? '▪';

}


