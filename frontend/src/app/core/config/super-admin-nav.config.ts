import { NavItem } from './nav.config';

export interface SuperNavItem extends NavItem {
  /** Material Symbols Outlined ligature name */
  matIcon: string;
  /** Live badge count key (loaded by sidebar) */
  badgeKey?: 'claims' | 'registrations';
  /** Match route exactly for active state */
  exact?: boolean;
}

export interface SuperNavSection {
  id: string;
  title: string;
  matIcon: string;
  /** Open by default on first visit */
  defaultOpen?: boolean;
  items: SuperNavItem[];
}

/** Top-level Dashboard link (outside accordion). */
export const SUPER_ADMIN_TOP_ITEMS: SuperNavItem[] = [
  {
    section: 'Dashboard',
    label: 'Dashboard',
    route: '/dashboard/super',
    icon: 'dashboard',
    matIcon: 'dashboard',
    exact: true,
  },
];

/**
 * Super Admin MOS sidebar hierarchy — each item has its own unique route
 * so navigation never lands on the same page for different labels.
 */
export const SUPER_ADMIN_NAV_SECTIONS: SuperNavSection[] = [
  {
    id: 'mosques',
    title: 'Mosque Management',
    matIcon: 'apartment',
    defaultOpen: true,
    items: [
      { section: 'Mosques', label: 'All Mosques', route: '/dashboard/super/mosques', icon: 'mosque', matIcon: 'domain', exact: true },
      { section: 'Mosques', label: 'Add Mosque', route: '/dashboard/super/mosques/add', icon: 'add', matIcon: 'add_business' },
      { section: 'Mosques', label: 'Mosque Claims', route: '/dashboard/super/claims', icon: 'stamp', matIcon: 'verified_user', badgeKey: 'claims' },
      { section: 'Mosques', label: 'Registration Requests', route: '/dashboard/super/registrations', icon: 'add', matIcon: 'how_to_reg', badgeKey: 'registrations' },
      { section: 'Mosques', label: 'Invitations', route: '/dashboard/super/invitations', icon: 'mail', matIcon: 'mail' },
    ],
  },
  {
    id: 'modules',
    title: 'Modules',
    matIcon: 'widgets',
    defaultOpen: false,
    items: [
      { section: 'Modules', label: 'Prayer Times', route: '/dashboard/super/oversight/prayer-times', icon: 'clock', matIcon: 'schedule' },
      { section: 'Modules', label: 'Announcements', route: '/dashboard/super/oversight/announcements', icon: 'speaker', matIcon: 'campaign' },
      { section: 'Modules', label: 'Events', route: '/dashboard/super/modules/events', icon: 'toggle', matIcon: 'event' },
      { section: 'Modules', label: 'Madrassah', route: '/dashboard/super/modules/madrassah', icon: 'toggle', matIcon: 'school' },
      { section: 'Modules', label: 'Communities', route: '/dashboard/super/modules/communities', icon: 'toggle', matIcon: 'groups' },
      { section: 'Modules', label: 'Awrad & Wird', route: '/dashboard/super/modules/awrad', icon: 'toggle', matIcon: 'auto_stories' },
      { section: 'Modules', label: 'Daily Adhkar', route: '/dashboard/super/modules/adhkar', icon: 'toggle', matIcon: 'wb_twilight' },
      { section: 'Modules', label: 'Duas Library', route: '/dashboard/super/modules/duas', icon: 'toggle', matIcon: 'menu_book' },
      { section: 'Modules', label: "Qur'an Reading", route: '/dashboard/super/modules/quran', icon: 'toggle', matIcon: 'import_contacts' },
      { section: 'Modules', label: 'Ritual Guides', route: '/dashboard/super/modules/ritual-guides', icon: 'toggle', matIcon: 'water_drop' },
      { section: 'Modules', label: 'Janaza', route: '/dashboard/super/oversight/janaza', icon: 'flower', matIcon: 'spa' },
      { section: 'Modules', label: 'Death Readings', route: '/dashboard/super/modules/death-readings', icon: 'toggle', matIcon: 'volunteer_activism' },
      { section: 'Modules', label: 'Community Participation', route: '/dashboard/super/modules/participation', icon: 'toggle', matIcon: 'handshake' },
      { section: 'Modules', label: 'Umrah & Hajj', route: '/dashboard/super/modules/umrah-hajj', icon: 'toggle', matIcon: 'flight_takeoff' },
    ],
  },
  {
    id: 'users',
    title: 'User Management',
    matIcon: 'group',
    defaultOpen: false,
    items: [
      { section: 'Access', label: 'Users', route: '/dashboard/super/users', icon: 'users', matIcon: 'person_search', exact: true },
      { section: 'Access', label: 'Roles & Permissions', route: '/dashboard/super/users/roles', icon: 'users', matIcon: 'admin_panel_settings' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    matIcon: 'analytics',
    defaultOpen: false,
    items: [
      { section: 'System', label: 'Platform Reports', route: '/dashboard/super/reports', icon: 'chart', matIcon: 'assessment', exact: true },
      { section: 'System', label: 'Activity Reports', route: '/dashboard/super/reports/activity', icon: 'history', matIcon: 'monitoring' },
      { section: 'System', label: 'Usage Statistics', route: '/dashboard/super/reports/usage', icon: 'chart', matIcon: 'insights' },
    ],
  },
  {
    id: 'audit',
    title: 'Audit & Monitoring',
    matIcon: 'policy',
    defaultOpen: false,
    items: [
      { section: 'System', label: 'Audit Logs', route: '/dashboard/super/audit', icon: 'history', matIcon: 'receipt_long', exact: true },
      { section: 'System', label: 'System Activity', route: '/dashboard/super/audit/system', icon: 'chart', matIcon: 'timeline' },
    ],
  },
  {
    id: 'settings',
    title: 'Platform Settings',
    matIcon: 'settings',
    defaultOpen: false,
    items: [
      { section: 'System', label: 'Feature Flags', route: '/dashboard/super/features', icon: 'toggle', matIcon: 'toggle_on' },
      { section: 'System', label: 'Global Settings', route: '/dashboard/super/settings', icon: 'settings', matIcon: 'tune', exact: true },
      { section: 'System', label: 'Email Templates', route: '/dashboard/super/settings/email', icon: 'mail', matIcon: 'email' },
      { section: 'System', label: 'System Configuration', route: '/dashboard/super/settings/system', icon: 'settings', matIcon: 'dns' },
    ],
  },
];

export const SUPER_ADMIN_PROFILE_ITEM: SuperNavItem = {
  section: 'Account',
  label: 'My Profile',
  route: '/dashboard/super/settings',
  icon: 'users',
  matIcon: 'account_circle',
  exact: true,
};

/** Flat list for search / collapsed icon rail. */
export function superAdminNavItems(): SuperNavItem[] {
  return [
    ...SUPER_ADMIN_TOP_ITEMS,
    ...SUPER_ADMIN_NAV_SECTIONS.flatMap(s => s.items),
    SUPER_ADMIN_PROFILE_ITEM,
  ];
}

/** Deduped flat items by route+label for search results. */
export function superAdminSearchableItems(): SuperNavItem[] {
  const seen = new Set<string>();
  const out: SuperNavItem[] = [];
  for (const item of superAdminNavItems()) {
    const key = `${item.route}::${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Legacy emoji map kept for dashboard quick-nav cards. */
export const SUPER_ADMIN_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  mosque: '🕌',
  add: '+',
  stamp: '✓',
  mail: '✉',
  database: '🗄',
  flower: '🕊️',
  clock: '🕐',
  speaker: '📢',
  users: '👥',
  toggle: '◎',
  history: '📜',
  chart: '📊',
  settings: '⚙',
};
