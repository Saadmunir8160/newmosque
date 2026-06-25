import { NavItem } from './nav.config';

export interface PrayerEditorNavSection {
  title: string;
  items: NavItem[];
}

/** Prayer Times Editor sidebar — spec-aligned. */
export const PRAYER_EDITOR_NAV_SECTIONS: PrayerEditorNavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/prayer-editor', icon: 'dashboard' },
    ],
  },
  {
    title: 'Prayer Times',
    items: [
      { section: 'Prayer Times', label: 'Daily Prayers', route: '/dashboard/prayer-editor/daily', icon: 'daily' },
      { section: 'Prayer Times', label: 'Jumuah', route: '/dashboard/prayer-editor/jumuah', icon: 'jumuah' },
      { section: 'Prayer Times', label: 'Ramadan', route: '/dashboard/prayer-editor/ramadan', icon: 'ramadan' },
      { section: 'Prayer Times', label: 'Monthly Preview', route: '/dashboard/prayer-editor/monthly', icon: 'monthly' },
      { section: 'Prayer Times', label: 'Audit Log', route: '/dashboard/prayer-editor/audit', icon: 'audit' },
    ],
  },
];

export function prayerEditorNavItems(): NavItem[] {
  return PRAYER_EDITOR_NAV_SECTIONS.flatMap(s => s.items);
}

export const PRAYER_EDITOR_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  daily: '⏰',
  jumuah: '🕌',
  ramadan: '🌙',
  monthly: '📅',
  audit: '📋',
};
