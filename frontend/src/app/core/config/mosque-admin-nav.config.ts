import { NavItem } from './nav.config';

export interface MosqueAdminNavSection {
  title: string;
  items: NavItem[];
}

/** Mosque Admin sidebar — aligned with Module 3.1 (profile + modules + operations). */
export const MOSQUE_ADMIN_NAV_SECTIONS: MosqueAdminNavSection[] = [
  {
    title: 'Mosque',
    items: [
      { section: 'Mosque', label: 'Dashboard', route: '/dashboard/admin', icon: 'dashboard' },
      { section: 'Mosque', label: 'Mosque profile', route: '/dashboard/admin/mosque', icon: 'mosque' },
      { section: 'Mosque', label: 'Module settings', route: '/dashboard/admin/modules', icon: 'settings' },
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
};
