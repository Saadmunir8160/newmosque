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
      { section: 'Mosques', label: 'Mosque listings', route: '/dashboard/super/mosques', icon: 'mosque' },
      { section: 'Mosques', label: 'Claim management', route: '/dashboard/super/claims', icon: 'stamp' },
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
];

export function superAdminNavItems(): NavItem[] {
  return [...SUPER_ADMIN_TOP_ITEMS, ...SUPER_ADMIN_NAV_SECTIONS.flatMap(s => s.items)];
}

export const SUPER_ADMIN_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  mosque: '🕌',
  stamp: '✓',
  database: '🗄',
  users: '👥',
  toggle: '◎',
};
