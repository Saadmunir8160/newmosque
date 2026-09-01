import { NavItem } from './nav.config';

export interface GuestNavSection {
  title: string;
  items: NavItem[];
}

/** Guest sidebar — Module 3.1–3.3 public browse; other modules under Extended. */
export const GUEST_NAV_SECTIONS: GuestNavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { section: 'Browse', label: 'Home', route: '/dashboard/guest', icon: 'home' },
      { section: 'Browse', label: 'Prayer Times', route: '/dashboard/guest/prayer-times', icon: 'prayer' },
      { section: 'Browse', label: 'Announcements', route: '/dashboard/guest/announcements', icon: 'announcements' },
    ],
  },
  {
    title: 'Extended',
    items: [
      { section: 'Browse', label: 'Events', route: '/dashboard/guest/events', icon: 'events' },
      { section: 'Browse', label: 'Janaza Notices', route: '/dashboard/guest/janaza', icon: 'janaza' },
      { section: 'Browse', label: 'Communities', route: '/dashboard/guest/communities', icon: 'communities' },
      { section: 'Content', label: 'Duas Library', route: '/dashboard/guest/duas', icon: 'duas' },
      { section: 'Content', label: 'Adhkar Library', route: '/dashboard/guest/adhkar', icon: 'adhkar' },
      { section: 'Content', label: 'Ritual Guides', route: '/dashboard/guest/ritual-guides', icon: 'ritual' },
      { section: 'Content', label: 'Umrah & Hajj Guides', route: '/dashboard/guest/journey-guides', icon: 'journey' },
    ],
  },
  {
    title: 'Account',
    items: [
      { section: 'Account', label: 'Login', route: '/login', icon: 'login' },
      { section: 'Account', label: 'Register', route: '/register', icon: 'register' },
    ],
  },
];

export function guestNavItems(): NavItem[] {
  return GUEST_NAV_SECTIONS.flatMap(s => s.items);
}

export const GUEST_NAV_ICONS: Record<string, string> = {
  home: '🏠',
  prayer: '🕌',
  announcements: '📢',
  events: '📆',
  janaza: '🌙',
  communities: '🤝',
  duas: '🤲',
  adhkar: '🔢',
  ritual: '💧',
  journey: '✈️',
  login: '🔑',
  register: '✍️',
};
