import { NavItem } from './nav.config';

export interface SuperNavSection {
  title: string;
  items: NavItem[];
}

/** Top-level sidebar link — shown directly without a section heading. */
export const SUPER_ADMIN_TOP_ITEMS: NavItem[] = [
  { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/super', icon: 'dashboard' },
];

/** Super Admin sidebar — mosque profile area. */
export const SUPER_ADMIN_NAV_SECTIONS: SuperNavSection[] = [
  {
    title: 'Mosques',
    items: [
      { section: 'Mosques', label: 'Mosque List', route: '/dashboard/super/mosques', icon: 'mosque' },
      { section: 'Mosques', label: 'Add Mosque', route: '/dashboard/super/mosques/add', icon: 'add' },
      { section: 'Mosques', label: 'Claim management', route: '/dashboard/super/claims', icon: 'stamp' },
      { section: 'Mosques', label: 'Registrations', route: '/dashboard/super/registrations', icon: 'add' },
      { section: 'Mosques', label: 'Invitations', route: '/dashboard/super/invitations', icon: 'mail' },
      { section: 'Mosques', label: 'Mosque data', route: '/dashboard/super/mosque-data', icon: 'database' },
      { section: 'Mosques', label: 'Module flags', route: '/dashboard/super/features', icon: 'toggle' },
    ],
  },
  {
    title: 'Access',
    items: [
      { section: 'Access', label: 'Users & roles', route: '/dashboard/super/users', icon: 'users' },
    ],
  },
  {
    title: 'Oversight',
    items: [
      { section: 'Oversight', label: 'Janaza oversight', route: '/dashboard/super/oversight/janaza', icon: 'flower' },
      { section: 'Oversight', label: 'Prayer times oversight', route: '/dashboard/super/oversight/prayer-times', icon: 'clock' },
      { section: 'Oversight', label: 'Announcements oversight', route: '/dashboard/super/oversight/announcements', icon: 'speaker' },
    ],
  },
  {
    title: 'System',
    items: [
      { section: 'System', label: 'Audit logs', route: '/dashboard/super/audit', icon: 'history' },
      { section: 'System', label: 'Reports', route: '/dashboard/super/reports', icon: 'chart' },
      { section: 'System', label: 'Platform settings', route: '/dashboard/super/settings', icon: 'settings' },
    ],
  },
];

export function superAdminNavItems(): NavItem[] {
  return [...SUPER_ADMIN_TOP_ITEMS, ...SUPER_ADMIN_NAV_SECTIONS.flatMap(s => s.items)];
}

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
