import { NavItem } from './nav.config';

export interface ParentNavSection {
  title: string;
  items: NavItem[];
}

/** Parent sidebar — Module 3.5 portal + personal worship (3.7–3.15). */
export const PARENT_NAV_SECTIONS: ParentNavSection[] = [
  {
    title: 'Family',
    items: [
      { section: 'Parent', label: 'Today', route: '/dashboard', icon: 'today' },
      { section: 'Parent', label: 'My children', route: '/dashboard/parent', icon: 'children' },
    ],
  },
  {
    title: 'Mosque',
    items: [
      { section: 'Parent', label: 'Prayer times', route: '/dashboard/prayer-times', icon: 'clock' },
      { section: 'Parent', label: 'Announcements', route: '/dashboard/announcements', icon: 'speaker' },
      { section: 'Parent', label: 'Events', route: '/dashboard/events', icon: 'calendar' },
      { section: 'Parent', label: 'Participation', route: '/dashboard/participation', icon: 'hand' },
    ],
  },
  {
    title: 'My worship',
    items: [
      { section: 'Parent', label: 'My wird', route: '/dashboard/member/wird', icon: 'wird' },
      { section: 'Parent', label: 'My adhkar', route: '/dashboard/member/adhkar', icon: 'adhkar' },
      { section: 'Parent', label: 'Duas library', route: '/dashboard/member/duas', icon: 'prayer' },
      { section: 'Parent', label: "Qur'an reading", route: '/dashboard/member/quran', icon: 'quran' },
      { section: 'Parent', label: 'Ritual guides', route: '/dashboard/member/ritual-guides', icon: 'route' },
      { section: 'Parent', label: 'Profile', route: '/dashboard/member/profile', icon: 'profile' },
    ],
  },
];

export function parentNavItems(): NavItem[] {
  return PARENT_NAV_SECTIONS.flatMap(s => s.items);
}

export const PARENT_NAV_ICONS: Record<string, string> = {
  today: '📅',
  children: '👨‍👩‍👧',
  clock: '⏰',
  speaker: '📢',
  calendar: '📆',
  hand: '✋',
  wird: '📿',
  adhkar: '🔢',
  prayer: '🤲',
  quran: '📖',
  route: '💧',
  profile: '👤',
};
