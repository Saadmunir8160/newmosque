import { Routes } from '@angular/router';

/** Super Admin lazy routes — each sidebar item maps to a unique path. */
export const SUPER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dashboard/super-dashboard.component').then(m => m.SuperDashboardComponent) },
  {
    path: 'users/roles',
    loadComponent: () => import('./users/super-users.component').then(m => m.SuperUsersComponent),
    data: { mainTab: 'roles' },
  },
  {
    path: 'users',
    loadComponent: () => import('./users/super-users.component').then(m => m.SuperUsersComponent),
    data: { mainTab: 'users' },
  },
  { path: 'mosque-data', loadComponent: () => import('./mosque-data/super-mosque-data.component').then(m => m.SuperMosqueDataComponent) },
  { path: 'mosques/add', loadComponent: () => import('./mosques/super-mosques.component').then(m => m.SuperMosquesComponent), data: { openAddMosque: true } },
  { path: 'mosques', loadComponent: () => import('./mosques/super-mosques.component').then(m => m.SuperMosquesComponent) },
  { path: 'mosques/:id/edit', loadComponent: () => import('./mosques/super-mosque-edit.component').then(m => m.SuperMosqueEditComponent) },
  { path: 'mosques/:id', loadComponent: () => import('./mosques/super-mosque-detail.component').then(m => m.SuperMosqueDetailComponent) },
  { path: 'claims/:id', loadComponent: () => import('./claims/super-claim-detail.component').then(m => m.SuperClaimDetailComponent) },
  { path: 'claims', loadComponent: () => import('./claims/super-claims.component').then(m => m.SuperClaimsComponent) },
  { path: 'registrations', loadComponent: () => import('./registrations/super-registrations.component').then(m => m.SuperRegistrationsComponent) },
  { path: 'invitations', loadComponent: () => import('./invitations/super-invitations.component').then(m => m.SuperInvitationsComponent) },
  { path: 'oversight/janaza', loadComponent: () => import('./oversight/super-oversight-janaza.component').then(m => m.SuperOversightJanazaComponent) },
  { path: 'oversight/prayer-times', loadComponent: () => import('./oversight/super-oversight-prayer-times.component').then(m => m.SuperOversightPrayerTimesComponent) },
  { path: 'oversight/announcements', loadComponent: () => import('./oversight/super-oversight-announcements.component').then(m => m.SuperOversightAnnouncementsComponent) },
  {
    path: 'modules/:slug',
    loadComponent: () => import('./super-module-hub.component').then(m => m.SuperModuleHubComponent),
  },
  { path: 'features', loadComponent: () => import('./features/super-features.component').then(m => m.SuperFeaturesComponent) },
  {
    path: 'audit/system',
    loadComponent: () => import('./audit/super-audit.component').then(m => m.SuperAuditComponent),
    data: { auditView: 'system' },
  },
  {
    path: 'audit',
    loadComponent: () => import('./audit/super-audit.component').then(m => m.SuperAuditComponent),
    data: { auditView: 'logs' },
  },
  { path: 'settings/email', loadComponent: () => import('./settings/super-settings.component').then(m => m.SuperSettingsComponent), data: { settingsTab: 'email' } },
  { path: 'settings/system', loadComponent: () => import('./settings/super-settings.component').then(m => m.SuperSettingsComponent), data: { settingsTab: 'system' } },
  { path: 'settings', loadComponent: () => import('./settings/super-settings.component').then(m => m.SuperSettingsComponent), data: { settingsTab: 'global' } },
  {
    path: 'reports/usage',
    loadComponent: () => import('./reports/super-reports.component').then(m => m.SuperReportsComponent),
    data: { reportView: 'usage' },
  },
  {
    path: 'reports/activity',
    loadComponent: () => import('./reports/super-reports.component').then(m => m.SuperReportsComponent),
    data: { reportView: 'activity' },
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/super-reports.component').then(m => m.SuperReportsComponent),
    data: { reportView: 'platform' },
  },
];
