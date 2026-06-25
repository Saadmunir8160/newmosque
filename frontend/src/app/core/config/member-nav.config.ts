import { NavItem } from './nav.config';

export interface MemberNavSection {
  title: string;
  items: NavItem[];
}

/** Member sidebar — spec-aligned structure. */
export const MEMBER_NAV_SECTIONS: MemberNavSection[] = [
  {
    title: 'Main',
    items: [
      { section: 'Main', label: 'Today Screen', route: '/dashboard', icon: 'today' },
      { section: 'Main', label: 'Prayer Times', route: '/dashboard/prayer-times', icon: 'clock' },
      { section: 'Main', label: 'Announcements', route: '/dashboard/announcements', icon: 'speaker' },
      { section: 'Main', label: 'Events', route: '/dashboard/events', icon: 'calendar' },
    ],
  },
  {
    title: 'My Worship',
    items: [
      { section: 'My Worship', label: 'My Wird', route: '/dashboard/member/wird', icon: 'wird' },
      { section: 'My Worship', label: 'My Adhkar', route: '/dashboard/member/adhkar', icon: 'adhkar' },
      { section: 'My Worship', label: 'Duas Library', route: '/dashboard/member/duas', icon: 'prayer' },
      { section: 'My Worship', label: 'Quran Reading', route: '/dashboard/member/quran', icon: 'quran' },
      { section: 'My Worship', label: 'Communities', route: '/dashboard/member/communities', icon: 'community' },
      { section: 'My Worship', label: 'Participation', route: '/dashboard/participation', icon: 'hand' },
      { section: 'My Worship', label: 'Ritual Guides', route: '/dashboard/member/ritual-guides', icon: 'route' },
      { section: 'My Worship', label: 'Umrah & Hajj Guides', route: '/dashboard/member/journey-guides', icon: 'journey' },
      { section: 'My Worship', label: 'Janaza', route: '/dashboard/member/janaza', icon: 'flower' },
      { section: 'My Worship', label: 'Death Readings', route: '/dashboard/member/readings', icon: 'readings' },
      { section: 'My Worship', label: 'My Preferences', route: '/dashboard/member/preferences', icon: 'settings' },
      { section: 'My Worship', label: 'Profile', route: '/dashboard/member/profile', icon: 'profile' },
    ],
  },
];

export function memberNavItems(): NavItem[] {
  return MEMBER_NAV_SECTIONS.flatMap(s => s.items);
}

export const MEMBER_NAV_ICONS: Record<string, string> = {
  today: '📅',
  clock: '⏰',
  speaker: '📢',
  calendar: '📆',
  wird: '📿',
  adhkar: '🔢',
  prayer: '🤲',
  quran: '📖',
  community: '🤝',
  hand: '✋',
  route: '💧',
  journey: '✈️',
  flower: '🕊️',
  readings: '📖',
  settings: '⚙️',
  profile: '👤',
};
