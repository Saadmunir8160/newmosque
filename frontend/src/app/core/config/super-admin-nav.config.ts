import { NavItem } from './nav.config';

export interface SuperNavSection {
  title: string;
  items: NavItem[];
}

export const SUPER_ADMIN_NAV_SECTIONS: SuperNavSection[] = [
  {
    title: 'Super Admin',
    items: [
      { section: 'Super Admin', label: 'Dashboard', route: '/dashboard/super', icon: 'dashboard' },
      { section: 'Super Admin', label: 'Mosques', route: '/dashboard/super/mosques', icon: 'mosque' },
      { section: 'Super Admin', label: 'Claims', route: '/dashboard/super/claims', icon: 'stamp' },
      { section: 'Super Admin', label: 'Users & roles', route: '/dashboard/super/users', icon: 'users' },
      { section: 'Super Admin', label: 'Module flags', route: '/dashboard/super/features', icon: 'toggle' },
      { section: 'Super Admin', label: 'Content library', route: '/dashboard/content/awrad', icon: 'book' },
      { section: 'Super Admin', label: 'Adhkar library', route: '/dashboard/content/adhkar', icon: 'dot' },
      { section: 'Super Admin', label: 'Duas library', route: '/dashboard/content/duas', icon: 'prayer' },
      { section: 'Super Admin', label: 'Ritual guides', route: '/dashboard/content/ritual-guides', icon: 'route' },
      { section: 'Super Admin', label: 'Umrah & Hajj guides', route: '/dashboard/member/preferences', icon: 'journey' },
      { section: 'Super Admin', label: 'Janaza oversight', route: '/dashboard/admin/janaza', icon: 'flower' },
      { section: 'Super Admin', label: 'Death readings', route: '/dashboard/muqaddam/readings', icon: 'readings' },
      { section: 'Super Admin', label: 'Audit logs', route: '/dashboard/super/audit', icon: 'history' },
      { section: 'Super Admin', label: 'Platform settings', route: '/dashboard/super/settings', icon: 'settings' },
      { section: 'Super Admin', label: 'Reports', route: '/dashboard/super/reports', icon: 'chart' },
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
  dot: '◉',
  prayer: '🤲',
  route: '↗',
  journey: '✈',
  clock: '⏰',
  speaker: '📢',
  flower: '✿',
  readings: '📚',
  history: '↺',
  settings: '⚙',
  campaigns: '📿',
};
