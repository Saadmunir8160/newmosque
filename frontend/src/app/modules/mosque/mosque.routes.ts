import { Routes } from '@angular/router';

export const MOSQUE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./mosque-shell/mosque-shell.component').then(m => m.MosqueShellComponent),
    children: [
      { path: '', loadComponent: () => import('./overview/mosque-overview.component').then(m => m.MosqueOverviewComponent) },
      { path: 'profile', loadComponent: () => import('./profile/mosque-profile.component').then(m => m.MosqueProfileComponent) },
      { path: 'settings', loadComponent: () => import('./settings/mosque-settings.component').then(m => m.MosqueSettingsComponent) },
      { path: 'settings/modules', loadComponent: () => import('../owner/settings/owner-module-settings.component').then(m => m.OwnerModuleSettingsComponent) },
    ],
  },
];
