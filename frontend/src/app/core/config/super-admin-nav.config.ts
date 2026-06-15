import { NavItem } from './nav.config';

export interface SuperNavSection {
  title: string;
  items: NavItem[];
}

export const SUPER_ADMIN_NAV_SECTIONS: SuperNavSection[] = [
  {
    title: 'Overview',
    items: [
      { section: 'Overview', label: 'Dashboard / stats', route: '/dashboard/super', icon: 'dashboard' },
      { section: 'Overview', label: 'Platform analytics', route: '/dashboard/super/reports', icon: 'chart' },
    ],
  },
  {
    title: 'Mosques',
    items: [
      { section: 'Mosques', label: 'All mosques', route: '/dashboard/super/mosques', icon: 'mosque' },
      { section: 'Mosques', label: 'Seed new mosque', route: '/dashboard/super/mosques', icon: 'plus' },
      { section: 'Mosques', label: 'Claim requests', route: '/dashboard/super/claims', icon: 'stamp' },
    ],
  },
  {
    title: 'Access',
    items: [
      { section: 'Access', label: 'Users & roles', route: '/dashboard/super/users', icon: 'users' },
      { section: 'Access', label: 'Module feature flags', route: '/dashboard/super/features', icon: 'toggle' },
    ],
  },
  {
    title: 'Content library',
    items: [
      { section: 'Content library', label: 'Awrad & Wird', route: '/dashboard/content/awrad', icon: 'book' },
      { section: 'Content library', label: 'Duas & Adhkar', route: '/dashboard/content/duas', icon: 'prayer' },
      { section: 'Content library', label: 'Ritual / Umrah / Hajj guides', route: '/dashboard/content/ritual-guides', icon: 'route' },
    ],
  },
  {
    title: 'Oversight',
    items: [
      { section: 'Oversight', label: 'Prayer times (all)', route: '/dashboard/admin/prayer-times', icon: 'clock' },
      { section: 'Oversight', label: 'Announcements / events', route: '/dashboard/admin/announcements', icon: 'speaker' },
      { section: 'Oversight', label: 'Janaza & readings', route: '/dashboard/admin/janaza', icon: 'flower' },
    ],
  },
  {
    title: 'System',
    items: [
      { section: 'System', label: 'Audit logs', route: '/dashboard/super/audit', icon: 'history' },
      { section: 'System', label: 'Platform settings', route: '/dashboard/super/settings', icon: 'settings' },
    ],
  },
];

export function superAdminNavItems(): NavItem[] {
  return SUPER_ADMIN_NAV_SECTIONS.flatMap(s => s.items);
}

export const SUPER_ADMIN_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  chart: '📊',
  mosque: '⌂',
  plus: '+',
  stamp: '✓',
  users: '👥',
  toggle: '◎',
  book: '📖',
  prayer: '🤲',
  route: '↗',
  clock: '⏰',
  speaker: '📢',
  flower: '✿',
  history: '↺',
  settings: '⚙',
  campaigns: '📿',
};
