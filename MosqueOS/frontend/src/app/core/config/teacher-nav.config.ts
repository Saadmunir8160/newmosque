import { NavItem } from './nav.config';

export interface TeacherNavSection {
  title: string;
  items: NavItem[];
}

/** Teacher sidebar — spec-aligned structure. */
export const TEACHER_NAV_SECTIONS: TeacherNavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { section: 'Dashboard', label: 'Dashboard', route: '/dashboard/teacher', icon: 'dashboard' },
    ],
  },
  {
    title: 'Teaching',
    items: [
      { section: 'Teaching', label: 'My Classes', route: '/dashboard/teacher/classes', icon: 'classes' },
      { section: 'Teaching', label: 'Attendance', route: '/dashboard/teacher/attendance', icon: 'attendance' },
      { section: 'Teaching', label: 'Student Progress', route: '/dashboard/teacher/progress', icon: 'progress' },
      { section: 'Teaching', label: 'Assignments', route: '/dashboard/teacher/assignments', icon: 'assignments' },
      { section: 'Teaching', label: 'Reports', route: '/dashboard/teacher/reports', icon: 'reports' },
    ],
  },
];

export function teacherNavItems(): NavItem[] {
  return TEACHER_NAV_SECTIONS.flatMap(s => s.items);
}

export const TEACHER_NAV_ICONS: Record<string, string> = {
  dashboard: '▦',
  classes: '📖',
  attendance: '✓',
  progress: '📈',
  assignments: '📝',
  reports: '📊',
};
