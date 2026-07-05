import { NavItem } from './nav.config';

export interface OwnerNavSection {
  title: string;
  items: NavItem[];
}

/** Mosque Owner sidebar - mosque profile area. */
export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    title: 'My Mosque',
    items: [
      { section: 'Mosque Owner', label: 'Dashboard', route: '/dashboard/owner', icon: 'dashboard' },
      { section: 'Mosque Owner', label: 'Overview', route: '/dashboard/owner/overview', icon: 'overview' },
      { section: 'Mosque Owner', label: 'My Mosque', route: '/dashboard/owner/my-mosque', icon: 'mosque' },
      { section: 'Mosque Owner', label: 'Edit Profile', route: '/dashboard/owner/my-mosque/edit-profile', icon: 'edit' },
      { section: 'Mosque Owner', label: 'Upload Logo', route: '/dashboard/owner/my-mosque/upload-logo', icon: 'logo' },
      { section: 'Mosque Owner', label: 'Upload Banner', route: '/dashboard/owner/my-mosque/upload-banner', icon: 'banner' },
      { section: 'Mosque Owner', label: 'Verify', route: '/dashboard/owner/verification', icon: 'verify' },
      { section: 'Mosque Owner', label: 'Modules', route: '/dashboard/owner/modules', icon: 'modules' },
      { section: 'Mosque Owner', label: 'My claims', route: '/dashboard/owner/my-claims', icon: 'claims' },
      { section: 'Mosque Owner', label: 'Mosque listings', route: '/dashboard/owner/mosque-listings', icon: 'listings' },
      { section: 'Mosque Owner', label: 'Admin management', route: '/dashboard/owner/staff', icon: 'staff' },
    ],
  },
];

export function ownerNavItems(): NavItem[] {
  return OWNER_NAV_SECTIONS.flatMap(s => s.items);
}

export const OWNER_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  overview: '📊',
  mosque: '⌂',
  edit: '✏️',
  logo: '🖼️',
  banner: '🏳️',
  verify: '✅',
  modules: '🔧',
  claims: '📝',
  listings: '📋',
  settings: '⚙️',
  staff: '👤',
};
