import { Routes } from '@angular/router';

export const SUPER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dashboard/super-dashboard.component').then(m => m.SuperDashboardComponent) },
  { path: 'users', loadComponent: () => import('./users/super-users.component').then(m => m.SuperUsersComponent) },
  { path: 'mosque-data', loadComponent: () => import('./mosque-data/super-mosque-data.component').then(m => m.SuperMosqueDataComponent) },
  { path: 'mosques/add', loadComponent: () => import('./mosques/super-mosques.component').then(m => m.SuperMosquesComponent), data: { openAddMosque: true } },
  { path: 'mosques', loadComponent: () => import('./mosques/super-mosques.component').then(m => m.SuperMosquesComponent) },
  { path: 'mosques/:id/edit', loadComponent: () => import('./mosques/super-mosque-edit.component').then(m => m.SuperMosqueEditComponent) },
  { path: 'mosques/:id', loadComponent: () => import('./mosques/super-mosque-detail.component').then(m => m.SuperMosqueDetailComponent) },
  { path: 'claims/:id', loadComponent: () => import('./claims/super-claim-detail.component').then(m => m.SuperClaimDetailComponent) },
  { path: 'claims', loadComponent: () => import('./claims/super-claims.component').then(m => m.SuperClaimsComponent) },
  { path: 'invitations', loadComponent: () => import('./invitations/super-invitations.component').then(m => m.SuperInvitationsComponent) },
  { path: 'oversight/janaza', loadComponent: () => import('./oversight/super-oversight-janaza.component').then(m => m.SuperOversightJanazaComponent) },
  { path: 'oversight/prayer-times', loadComponent: () => import('./oversight/super-oversight-prayer-times.component').then(m => m.SuperOversightPrayerTimesComponent) },
  { path: 'oversight/announcements', loadComponent: () => import('./oversight/super-oversight-announcements.component').then(m => m.SuperOversightAnnouncementsComponent) },
  { path: 'features', loadComponent: () => import('./features/super-features.component').then(m => m.SuperFeaturesComponent) },
  { path: 'audit', loadComponent: () => import('./audit/super-audit.component').then(m => m.SuperAuditComponent) },
  { path: 'settings', loadComponent: () => import('./settings/super-settings.component').then(m => m.SuperSettingsComponent) },
  { path: 'reports', loadComponent: () => import('./reports/super-reports.component').then(m => m.SuperReportsComponent) },
];
