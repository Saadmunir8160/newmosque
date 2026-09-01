import { NavItem } from './nav.config';

export interface PrayerEditorNavSection {
  title: string;
  items: NavItem[];
}

/** Module 3.2 Prayer Times Editor sidebar. */
export const PRAYER_EDITOR_NAV_SECTIONS: PrayerEditorNavSection[] = [
  {
    title: 'Module 3.2 · Overview',
    items: [
      { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/prayer-editor', icon: 'dashboard' },
    ],
  },
  {
    title: 'Module 3.2 · Core',
    items: [
      { section: 'Prayer Times', label: 'Daily Prayers', route: '/dashboard/prayer-editor/daily', icon: 'daily' },
      { section: 'Prayer Times', label: 'Monthly', route: '/dashboard/prayer-editor/monthly', icon: 'monthly' },
      { section: 'Prayer Times', label: 'Jumuah', route: '/dashboard/prayer-editor/jumuah', icon: 'jumuah' },
      { section: 'Prayer Times', label: 'Exceptions', route: '/dashboard/prayer-editor/exceptions', icon: 'exceptions' },
      // Templates + generate are Admin/Owner only (Module 3.2) — see /dashboard/admin/prayer-times/templates
      { section: 'Prayer Times', label: 'Audit Log', route: '/dashboard/prayer-editor/audit', icon: 'audit' },
    ],
  },
  {
    title: 'Extended',
    items: [
      { section: 'Prayer Times', label: 'Ramadan & special', route: '/dashboard/prayer-editor/ramadan', icon: 'ramadan' },
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
  exceptions: '⚠',
  templates: '⧉',
  ramadan: '🌙',
  monthly: '📅',
  audit: '📋',
};
