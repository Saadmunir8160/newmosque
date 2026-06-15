import { NavItem } from './nav.config';

export interface OwnerNavSection {
  title: string;
  items: NavItem[];
}

/** Mosque Owner sidebar — claim, profile, verification, staff. */
export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    title: 'Mosque Owner',
    items: [
      { section: 'Mosque Owner', label: 'Dashboard', route: '/dashboard/owner', icon: 'dashboard' },
      { section: 'Mosque Owner', label: 'Mosque profile', route: '/dashboard/owner/profile', icon: 'mosque' },
      { section: 'Mosque Owner', label: 'Verification', route: '/dashboard/owner/verification', icon: 'stamp' },
      { section: 'Mosque Owner', label: 'Admin management', route: '/dashboard/owner/staff', icon: 'users' },
    ],
  },
];

export function ownerNavItems(): NavItem[] {
  return OWNER_NAV_SECTIONS.flatMap(s => s.items);
}

export const OWNER_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  mosque: '⌂',
  stamp: '✓',
  users: '👥',
};
