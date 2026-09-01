import { NavItem } from './nav.config';

export interface OwnerNavSection {
  title: string;
  items: NavItem[];
}

/**
 * Mosque Owner sidebar — Module 3.1 ownership + own-mosque ops (3.2–3.14).
 * Ops screens reuse `/dashboard/admin/*` (Owner is in adminRoles).
 */
export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    title: 'Ownership',
    items: [
      { section: 'Mosque Owner', label: 'Dashboard', route: '/dashboard/owner', icon: 'dashboard' },
      { section: 'Mosque Owner', label: 'Mosque profile', route: '/dashboard/owner/my-mosque', icon: 'mosque' },
      { section: 'Mosque Owner', label: 'Module settings', route: '/dashboard/owner/modules', icon: 'modules' },
      { section: 'Mosque Owner', label: 'Verify ownership', route: '/dashboard/owner/verification', icon: 'verify' },
      { section: 'Mosque Owner', label: 'My claims', route: '/dashboard/owner/my-claims', icon: 'claims' },
      { section: 'Mosque Owner', label: 'Staff', route: '/dashboard/owner/staff', icon: 'staff' },
    ],
  },
  {
    title: 'Worship & content',
    items: [
      { section: 'Ops', label: 'Prayer times', route: '/dashboard/admin/prayer-times', icon: 'prayer' },
      { section: 'Ops', label: 'Jamaah templates', route: '/dashboard/admin/prayer-times/templates', icon: 'templates' },
      { section: 'Ops', label: 'Announcements', route: '/dashboard/admin/announcements', icon: 'announcements' },
      { section: 'Ops', label: 'Events', route: '/dashboard/admin/events', icon: 'events' },
      { section: 'Ops', label: 'Janaza', route: '/dashboard/admin/janaza', icon: 'janaza' },
      { section: 'Ops', label: 'Death readings', route: '/dashboard/admin/death-readings', icon: 'readings' },
    ],
  },
  {
    title: 'Community & education',
    items: [
      { section: 'Ops', label: 'Communities', route: '/dashboard/admin/communities', icon: 'communities' },
      { section: 'Ops', label: 'Participation', route: '/dashboard/admin/participation', icon: 'participation' },
      { section: 'Ops', label: 'Madrassah', route: '/dashboard/admin/madrassah', icon: 'madrassah' },
      { section: 'Ops', label: 'Reports', route: '/dashboard/admin/reports', icon: 'reports' },
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
  history: '📜',
  settings: '⚙️',
  staff: '👤',
  prayer: '🕰',
  templates: '⧉',
  announcements: '📢',
  events: '📅',
  janaza: '🕊️',
  readings: '📖',
  communities: '👥',
  participation: '🤝',
  madrassah: '🎓',
  reports: '📊',
};
