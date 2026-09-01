import { Routes } from '@angular/router';
import { ROLES } from '../../core/constants/roles';

const adminRoles = [ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];
const mosqueAdminOnly = [ROLES.MosqueAdmin, ROLES.SuperAdmin, ROLES.MosqueOwner];

const ADMIN_CHILD_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
  { path: 'mosque', loadComponent: () => import('./mosque-profile/admin-mosque.component').then(m => m.AdminMosqueComponent) },
  { path: 'modules', loadComponent: () => import('./modules/admin-modules.component').then(m => m.AdminModulesComponent) },
  { path: 'prayer-times', loadComponent: () => import('./prayer-times-edit/admin-prayer-times.component').then(m => m.AdminPrayerTimesComponent) },
  { path: 'prayer-times/templates', loadComponent: () => import('../prayer-editor/prayer-editor-templates.component').then(m => m.PrayerEditorTemplatesComponent) },
  { path: 'announcements', loadComponent: () => import('./announcements-manage/admin-announcements.component').then(m => m.AdminAnnouncementsComponent) },
  { path: 'events', loadComponent: () => import('./events-manage/admin-events.component').then(m => m.AdminEventsComponent) },
  { path: 'janaza', loadComponent: () => import('./janaza/admin-janaza.component').then(m => m.AdminJanazaComponent) },
  { path: 'death-readings', loadComponent: () => import('./death-readings/admin-death-readings.component').then(m => m.AdminDeathReadingsComponent) },
  { path: 'settings', loadComponent: () => import('./settings/admin-settings.component').then(m => m.AdminSettingsComponent) },
  { path: 'settings/contact', loadComponent: () => import('./settings/admin-contact-settings.component').then(m => m.AdminContactSettingsComponent) },
  { path: 'communities', loadComponent: () => import('./communities/admin-communities.component').then(m => m.AdminCommunitiesComponent) },
  { path: 'participation', loadComponent: () => import('./participation/admin-participation.component').then(m => m.AdminParticipationComponent) },
  { path: 'madrassah', loadComponent: () => import('./madrassah/admin-madrassah.component').then(m => m.AdminMadrassahComponent) },
  { path: 'users/teachers', loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
  { path: 'users/parents', loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
  { path: 'users/members', loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
  { path: 'reports', loadComponent: () => import('./reports/admin-reports.component').then(m => m.AdminReportsComponent) },
];

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-layout.component').then(m => m.AdminLayoutComponent),
    children: ADMIN_CHILD_ROUTES,
  },
];

export { adminRoles, mosqueAdminOnly };
