import { Routes } from '@angular/router';
import { ROLES } from '../../core/constants/roles';

const contentRoles = [ROLES.ContentEditor, ROLES.Muqaddam, ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];

export const CONTENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./content-dashboard.component').then(m => m.ContentDashboardComponent) },
  { path: 'awrad/:id', loadComponent: () => import('./content-awrad-detail.component').then(m => m.ContentAwradDetailComponent) },
  { path: 'awrad', loadComponent: () => import('./content-awrad.component').then(m => m.ContentAwradComponent) },
  { path: 'duas', loadComponent: () => import('./content-duas.component').then(m => m.ContentDuasComponent) },
  { path: 'adhkar', loadComponent: () => import('./content-adhkar.component').then(m => m.ContentAdhkarComponent) },
  { path: 'library', loadComponent: () => import('./content-library.component').then(m => m.ContentLibraryComponent) },
  { path: 'articles', redirectTo: 'library', pathMatch: 'full' },
  { path: 'reviews', loadComponent: () => import('./content-reviews.component').then(m => m.ContentReviewsComponent) },
  { path: 'ritual-guides', loadComponent: () => import('./content-ritual-guides.component').then(m => m.ContentRitualGuidesComponent) },
  { path: 'journey-guides', loadComponent: () => import('./content-journey-guides.component').then(m => m.ContentJourneyGuidesComponent) },
  { path: 'media', loadComponent: () => import('./content-media.component').then(m => m.ContentMediaComponent) },
];

export { contentRoles };
