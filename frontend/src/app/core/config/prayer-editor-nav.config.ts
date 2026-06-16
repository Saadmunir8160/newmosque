import { NavItem } from './nav.config';

export interface PrayerEditorNavSection {
  title: string;
  items: NavItem[];
}

/** Prayer Times Editor sidebar — dedicated timetable tools. */
export const PRAYER_EDITOR_NAV_SECTIONS: PrayerEditorNavSection[] = [
  {
    title: 'Prayer Times',
    items: [
      { section: 'Prayer Times', label: 'Dashboard', route: '/dashboard/prayer-editor', icon: 'dashboard' },
      { section: 'Prayer Times', label: 'Daily timetable', route: '/dashboard/prayer-editor/daily', icon: 'daily' },
      { section: 'Prayer Times', label: 'Monthly view', route: '/dashboard/prayer-editor/monthly', icon: 'monthly' },
      { section: 'Prayer Times', label: 'Jumuah times', route: '/dashboard/prayer-editor/jumuah', icon: 'jumuah' },
    ],
  },
  {
    title: 'Browse',
    items: [
      { section: 'Browse', label: 'Public timetable', route: '/dashboard/prayer-times', icon: 'public' },
    ],
  },
];

export function prayerEditorNavItems(): NavItem[] {
  return PRAYER_EDITOR_NAV_SECTIONS.flatMap(s => s.items);
}

export const PRAYER_EDITOR_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  daily: '⏰',
  monthly: '🗓️',
  jumuah: '🕌',
  public: '👁️',
};
