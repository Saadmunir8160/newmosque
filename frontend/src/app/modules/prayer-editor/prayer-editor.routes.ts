import { Routes } from '@angular/router';

export const PRAYER_EDITOR_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./prayer-editor-dashboard.component').then(m => m.PrayerEditorDashboardComponent) },
  { path: 'daily', loadComponent: () => import('./prayer-editor-daily.component').then(m => m.PrayerEditorDailyComponent) },
  { path: 'jumuah', loadComponent: () => import('./prayer-editor-jumuah.component').then(m => m.PrayerEditorJumuahComponent) },
  { path: 'ramadan', loadComponent: () => import('./prayer-editor-ramadan.component').then(m => m.PrayerEditorRamadanComponent) },
  { path: 'audit', loadComponent: () => import('./prayer-editor-audit.component').then(m => m.PrayerEditorAuditComponent) },
  { path: 'monthly', loadComponent: () => import('./prayer-editor-monthly.component').then(m => m.PrayerEditorMonthlyComponent) },
];
