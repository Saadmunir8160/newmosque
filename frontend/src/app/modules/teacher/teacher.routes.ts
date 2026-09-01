import { Routes } from '@angular/router';
import { ROLES } from '../../core/constants/roles';

const teacherRoles = [ROLES.Teacher, ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];

export const TEACHER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./teacher-dashboard.component').then(m => m.TeacherDashboardComponent) },
  { path: 'classes', loadComponent: () => import('./teacher-classes.component').then(m => m.TeacherClassesComponent) },
  { path: 'attendance', loadComponent: () => import('./teacher-attendance.component').then(m => m.TeacherAttendanceComponent) },
  { path: 'progress', loadComponent: () => import('./teacher-progress.component').then(m => m.TeacherProgressComponent) },
  { path: 'progress-notes', redirectTo: 'progress', pathMatch: 'full' },
  { path: 'assignments', loadComponent: () => import('./teacher-assignments.component').then(m => m.TeacherAssignmentsComponent) },
  { path: 'reports', loadComponent: () => import('./teacher-reports.component').then(m => m.TeacherReportsComponent) },
  { path: 'participation', loadComponent: () => import('./teacher-participation.component').then(m => m.TeacherParticipationComponent) },
];

export { teacherRoles };
