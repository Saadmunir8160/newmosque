import { Routes } from '@angular/router';
import { activeMosqueRequiredGuard } from '../../core/auth/active-mosque-required.guard';

export const OWNER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./overview/owner-overview.component').then(m => m.OwnerOverviewComponent) },
  { path: 'overview', redirectTo: '', pathMatch: 'full' },
  { path: 'my-mosque', loadComponent: () => import('./profile/owner-profile.component').then(m => m.OwnerProfileComponent) },
  { path: 'my-mosque/edit-profile', loadComponent: () => import('./profile/owner-profile.component').then(m => m.OwnerProfileComponent), data: { profileTab: 'basic' } },
  { path: 'my-mosque/upload-logo', loadComponent: () => import('./profile/owner-profile.component').then(m => m.OwnerProfileComponent), data: { profileTab: 'media' } },
  { path: 'my-mosque/upload-banner', loadComponent: () => import('./profile/owner-profile.component').then(m => m.OwnerProfileComponent), data: { profileTab: 'media' } },
  { path: 'my-mosque/verify', redirectTo: 'verification', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'my-mosque', pathMatch: 'full' },
  {
    path: 'modules',
    canActivate: [activeMosqueRequiredGuard],
    loadComponent: () => import('./settings/owner-settings.component').then(m => m.OwnerSettingsComponent),
  },
  { path: 'settings', redirectTo: 'modules', pathMatch: 'full' },
  {
    path: 'settings/modules',
    redirectTo: 'modules',
    pathMatch: 'full',
  },
  {
    path: 'staff',
    canActivate: [activeMosqueRequiredGuard],
    loadComponent: () => import('./staff/owner-staff.component').then(m => m.OwnerStaffComponent),
  },
  { path: 'verification', loadComponent: () => import('./verification/owner-verification.component').then(m => m.OwnerVerificationComponent) },
  { path: 'my-claims', loadComponent: () => import('./claims/owner-claims.component').then(m => m.OwnerClaimsComponent) },
  { path: 'mosque-listings', loadComponent: () => import('./mosque-listings/owner-mosque-listings.component').then(m => m.OwnerMosqueListingsComponent) },
  { path: 'onboarding', loadComponent: () => import('./onboarding/owner-onboarding.component').then(m => m.OwnerOnboardingComponent) },
];
