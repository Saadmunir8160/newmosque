import { NavItem } from './nav.config';

export interface OwnerNavSection {
  title: string;
  items: NavItem[];
}

/** Mosque Owner sidebar — mosque profile area. */
export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    title: 'Mosques',
    items: [
      { section: 'Mosque Owner', label: 'Dashboard', route: '/dashboard/owner', icon: 'dashboard' },
      { section: 'Mosque Owner', label: 'Mosque profile', route: '/dashboard/owner/profile', icon: 'mosque' },
      { section: 'Mosque Owner', label: 'My claims', route: '/dashboard/owner/my-claims', icon: 'claims' },
      { section: 'Mosque Owner', label: 'Mosque listings', route: '/dashboard/owner/mosque-listings', icon: 'listings' },
      { section: 'Mosque Owner', label: 'Module settings', route: '/dashboard/owner/settings', icon: 'settings' },
      { section: 'Mosque Owner', label: 'Admin management', route: '/dashboard/owner/staff', icon: 'staff' },
    ],
  },
];

export function ownerNavItems(): NavItem[] {
  return OWNER_NAV_SECTIONS.flatMap(s => s.items);
}

export const OWNER_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  mosque: '⌂',
  claims: '📋',
  listings: '🕌',
  settings: '⚙',
  staff: '👥',
};
