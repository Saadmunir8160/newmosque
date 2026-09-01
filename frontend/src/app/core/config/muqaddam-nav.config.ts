import { NavItem } from './nav.config';

export interface MuqaddamNavSection {
  title: string;
  items: NavItem[];
}

/** Muqaddam sidebar — spec-aligned structure. */
export const MUQADDAM_NAV_SECTIONS: MuqaddamNavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/muqaddam', icon: 'dashboard' },
    ],
  },
  {
    title: 'Spiritual Circles',
    items: [
      { section: 'Spiritual Circles', label: 'Awrad builder', route: '/dashboard/content/awrad', icon: 'awrad' },
      { section: 'Spiritual Circles', label: 'Murid Management', route: '/dashboard/muqaddam/murids', icon: 'murids' },
      { section: 'Spiritual Circles', label: 'Communities', route: '/dashboard/muqaddam/communities', icon: 'communities' },
      { section: 'Spiritual Circles', label: 'Guidance Notes', route: '/dashboard/muqaddam/guidance', icon: 'guidance' },
      { section: 'Spiritual Circles', label: 'Events', route: '/dashboard/muqaddam/events', icon: 'events' },
      { section: 'Spiritual Circles', label: 'Death Readings', route: '/dashboard/muqaddam/readings', icon: 'readings' },
      { section: 'Spiritual Circles', label: 'Reports', route: '/dashboard/muqaddam/reports', icon: 'reports' },
    ],
  },
];

export function muqaddamNavItems(): NavItem[] {
  return MUQADDAM_NAV_SECTIONS.flatMap(s => s.items);
}

export const MUQADDAM_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  awrad: '📿',
  murids: '👥',
  communities: '🤝',
  guidance: '📝',
  events: '📿',
  readings: '📜',
  reports: '📊',
};
