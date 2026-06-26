import { Routes } from '@angular/router';

export const MEMBER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./member-shell.component').then(m => m.MemberShellComponent),
    children: [
      { path: 'wird', loadComponent: () => import('./member-wird.component').then(m => m.MemberWirdComponent) },
      { path: 'adhkar', loadComponent: () => import('./member-adhkar.component').then(m => m.MemberAdhkarComponent) },
      { path: 'quran', loadComponent: () => import('./member-quran.component').then(m => m.MemberQuranComponent) },
      { path: 'duas', loadComponent: () => import('./member-duas.component').then(m => m.MemberDuasComponent) },
      { path: 'communities', loadComponent: () => import('./member-communities.component').then(m => m.MemberCommunitiesComponent) },
      { path: 'ritual-guides', loadComponent: () => import('./member-ritual-guides.component').then(m => m.MemberRitualGuidesComponent) },
      { path: 'journey-guides', loadComponent: () => import('./member-journey-guides.component').then(m => m.MemberJourneyGuidesComponent) },
      { path: 'janaza', loadComponent: () => import('./member-janaza.component').then(m => m.MemberJanazaComponent) },
      { path: 'readings', loadComponent: () => import('./member-readings.component').then(m => m.MemberReadingsComponent) },
      { path: 'preferences', loadComponent: () => import('./member-preferences.component').then(m => m.MemberPreferencesComponent) },
      { path: 'profile', loadComponent: () => import('./member-profile.component').then(m => m.MemberProfileComponent) },
    ],
  },
];

import { ROLES } from '../../core/constants/roles';

export const worshipRoles = [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];
