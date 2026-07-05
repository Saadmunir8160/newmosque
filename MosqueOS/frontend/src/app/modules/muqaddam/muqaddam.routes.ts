import { Routes } from '@angular/router';
import { ROLES } from '../../core/constants/roles';

const muqaddamRoles = [ROLES.Muqaddam, ROLES.SuperAdmin];

export const MUQADDAM_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./muqaddam-dashboard.component').then(m => m.MuqaddamDashboardComponent) },
  { path: 'murids', loadComponent: () => import('./muqaddam-murids.component').then(m => m.MuqaddamMuridsComponent) },
  { path: 'communities', loadComponent: () => import('./muqaddam-communities.component').then(m => m.MuqaddamCommunitiesComponent) },
  { path: 'guidance', loadComponent: () => import('./muqaddam-guidance.component').then(m => m.MuqaddamGuidanceComponent) },
  { path: 'events', loadComponent: () => import('./muqaddam-events.component').then(m => m.MuqaddamEventsComponent) },
  { path: 'reports', loadComponent: () => import('./muqaddam-reports.component').then(m => m.MuqaddamReportsComponent) },
  { path: 'readings', loadComponent: () => import('../admin/death-readings/admin-death-readings.component').then(m => m.AdminDeathReadingsComponent) },
];

export { muqaddamRoles };
