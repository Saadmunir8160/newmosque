import { Routes } from '@angular/router';

export const SUPER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./dashboard/super-dashboard.component').then(m => m.SuperDashboardComponent) },
  { path: 'users', loadComponent: () => import('./users/super-users.component').then(m => m.SuperUsersComponent) },
  { path: 'mosque-data', loadComponent: () => import('./mosque-data/super-mosque-data.component').then(m => m.SuperMosqueDataComponent) },
  { path: 'mosques', loadComponent: () => import('./mosques/super-mosques.component').then(m => m.SuperMosquesComponent) },
  { path: 'mosques/:id', loadComponent: () => import('./mosques/super-mosque-detail.component').then(m => m.SuperMosqueDetailComponent) },
  { path: 'claims', loadComponent: () => import('./claims/super-claims.component').then(m => m.SuperClaimsComponent) },
  { path: 'features', loadComponent: () => import('./features/super-features.component').then(m => m.SuperFeaturesComponent) },
  { path: 'audit', loadComponent: () => import('./audit/super-audit.component').then(m => m.SuperAuditComponent) },
  { path: 'settings', loadComponent: () => import('./settings/super-settings.component').then(m => m.SuperSettingsComponent) },
  { path: 'reports', loadComponent: () => import('./reports/super-reports.component').then(m => m.SuperReportsComponent) },
];
