import { NavItem } from './nav.config';

export interface MosqueAdminNavSection {
  title: string;
  items: NavItem[];
}

/**
 * Mosque Admin sidebar — Modules 3.1–3.14 own-mosque ops.
 * Routes match `admin.routes.ts` and Docs/MosqueAdminModule.md.
 */
export const MOSQUE_ADMIN_NAV_SECTIONS: MosqueAdminNavSection[] = [
  {
    title: 'Mosque',
    items: [
      { section: 'Mosque', label: 'Dashboard', route: '/dashboard/admin', icon: 'dashboard' },
      { section: 'Mosque', label: 'Mosque profile', route: '/dashboard/admin/mosque', icon: 'mosque' },
      { section: 'Mosque', label: 'Module settings', route: '/dashboard/admin/modules', icon: 'settings' },
    ],
  },
  {
    title: 'Worship & content',
    items: [
      { section: 'Prayer', label: 'Prayer times', route: '/dashboard/admin/prayer-times', icon: 'prayer' },
      { section: 'Prayer', label: 'Jamaah templates', route: '/dashboard/admin/prayer-times/templates', icon: 'templates' },
      { section: 'Announcements', label: 'Announcements', route: '/dashboard/admin/announcements', icon: 'announcements' },
      { section: 'Events', label: 'Events', route: '/dashboard/admin/events', icon: 'events' },
      { section: 'Janaza', label: 'Janaza', route: '/dashboard/admin/janaza', icon: 'janaza' },
      { section: 'Death Readings', label: 'Death readings', route: '/dashboard/admin/death-readings', icon: 'readings' },
    ],
  },
  {
    title: 'Community & education',
    items: [
      { section: 'Communities', label: 'Communities', route: '/dashboard/admin/communities', icon: 'communities' },
      { section: 'Participation', label: 'Participation', route: '/dashboard/admin/participation', icon: 'participation' },
      { section: 'Madrassah', label: 'Madrassah', route: '/dashboard/admin/madrassah', icon: 'madrassah' },
    ],
  },
  {
    title: 'People & reports',
    items: [
      { section: 'Users', label: 'Members', route: '/dashboard/admin/users/members', icon: 'users' },
      { section: 'Users', label: 'Teachers', route: '/dashboard/admin/users/teachers', icon: 'users' },
      { section: 'Users', label: 'Parents', route: '/dashboard/admin/users/parents', icon: 'users' },
      { section: 'Reports', label: 'Reports', route: '/dashboard/admin/reports', icon: 'reports' },
      { section: 'Settings', label: 'Contact settings', route: '/dashboard/admin/settings/contact', icon: 'settings' },
    ],
  },
];

export function mosqueAdminNavItems(): NavItem[] {
  return MOSQUE_ADMIN_NAV_SECTIONS.flatMap(s => s.items);
}

export const MOSQUE_ADMIN_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  mosque: '⌂',
  settings: '⚙',
  prayer: '🕰',
  templates: '⧉',
  announcements: '📢',
  events: '📅',
  janaza: '🕊️',
  readings: '📖',
  communities: '👥',
  participation: '🤝',
  madrassah: '🎓',
  users: '👤',
  reports: '📊',
};
