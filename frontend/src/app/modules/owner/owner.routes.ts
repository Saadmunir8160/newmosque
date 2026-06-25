import { Routes } from '@angular/router';

export const OWNER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./overview/owner-overview.component').then(m => m.OwnerOverviewComponent) },
  { path: 'profile', loadComponent: () => import('./profile/owner-profile.component').then(m => m.OwnerProfileComponent) },
  { path: 'settings', loadComponent: () => import('./settings/owner-settings.component').then(m => m.OwnerSettingsComponent) },
  { path: 'settings/modules', loadComponent: () => import('./settings/owner-settings.component').then(m => m.OwnerSettingsComponent) },
  { path: 'staff', loadComponent: () => import('./staff/owner-staff.component').then(m => m.OwnerStaffComponent) },
  { path: 'verification', loadComponent: () => import('./verification/owner-verification.component').then(m => m.OwnerVerificationComponent) },
  { path: 'my-claims', loadComponent: () => import('./verification/owner-verification.component').then(m => m.OwnerVerificationComponent) },
  { path: 'mosque-listings', loadComponent: () => import('./mosque-listings/owner-mosque-listings.component').then(m => m.OwnerMosqueListingsComponent) },
];
