import { NavItem } from './nav.config';

export interface ContentEditorNavSection {
  title: string;
  items: NavItem[];
}

/** Content Editor sidebar — manage Islamic content workflow. */
export const CONTENT_EDITOR_NAV_SECTIONS: ContentEditorNavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/content', icon: 'dashboard' },
    ],
  },
  {
    title: 'Content',
    items: [
      { section: 'Content', label: 'Awrad', route: '/dashboard/content/awrad', icon: 'awrad' },
      { section: 'Content', label: 'Duas', route: '/dashboard/content/duas', icon: 'duas' },
      { section: 'Content', label: 'Adhkar', route: '/dashboard/content/adhkar', icon: 'adhkar' },
      { section: 'Content', label: 'Ritual Guides', route: '/dashboard/content/ritual-guides', icon: 'ritual' },
      { section: 'Content', label: 'Umrah & Hajj Guides', route: '/dashboard/content/journey-guides', icon: 'journey' },
      { section: 'Content', label: 'Library', route: '/dashboard/content/library', icon: 'library' },
      { section: 'Content', label: 'Media Uploads', route: '/dashboard/content/media', icon: 'media' },
      { section: 'Content', label: 'Content Reviews', route: '/dashboard/content/reviews', icon: 'reviews' },
    ],
  },
];

export function contentEditorNavItems(): NavItem[] {
  return CONTENT_EDITOR_NAV_SECTIONS.flatMap(s => s.items);
}

export const CONTENT_EDITOR_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  awrad: '📿',
  duas: '🤲',
  adhkar: '🔢',
  ritual: '📖',
  journey: '✈️',
  library: '📚',
  media: '🎵',
  reviews: '✅',
};
