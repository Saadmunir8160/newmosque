import { Routes } from '@angular/router';

export const GUEST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./guest-home.component').then(m => m.GuestHomeComponent),
    data: { seo: { title: 'Mosque Home', description: 'Mosque information, prayer times, announcements and events.' } },
  },
  {
    path: 'prayer-times',
    loadComponent: () => import('./guest-prayer-times.component').then(m => m.GuestPrayerTimesComponent),
    data: { seo: { title: 'Prayer Times', description: 'Daily and monthly prayer timetables for your local mosque.' } },
  },
  {
    path: 'announcements',
    loadComponent: () => import('./guest-announcements.component').then(m => m.GuestAnnouncementsComponent),
    data: { seo: { title: 'Announcements', description: 'Latest mosque announcements and community updates.' } },
  },
  {
    path: 'events',
    loadComponent: () => import('./guest-events.component').then(m => m.GuestEventsComponent),
    data: { seo: { title: 'Events', description: 'Upcoming mosque events and programmes.' } },
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./guest-event-detail.component').then(m => m.GuestEventDetailComponent),
    data: { seo: { title: 'Event Details', description: 'Mosque event information.' } },
  },
  {
    path: 'janaza',
    loadComponent: () => import('./guest-janaza.component').then(m => m.GuestJanazaComponent),
    data: { seo: { title: 'Janaza Notices', description: 'Active janaza funeral prayer announcements.' } },
  },
  {
    path: 'communities',
    loadComponent: () => import('./guest-communities.component').then(m => m.GuestCommunitiesComponent),
    data: { seo: { title: 'Communities', description: 'Public spiritual circles and study groups.' } },
  },
  {
    path: 'duas',
    loadComponent: () => import('./guest-duas.component').then(m => m.GuestDuasComponent),
    data: { seo: { title: 'Duas Library', description: 'Browse Islamic supplications with Arabic text and translation.' } },
  },
  {
    path: 'adhkar',
    loadComponent: () => import('./guest-adhkar.component').then(m => m.GuestAdhkarComponent),
    data: { seo: { title: 'Adhkar Library', description: 'Daily remembrance and dhikr from the public library.' } },
  },
  {
    path: 'ritual-guides',
    loadComponent: () => import('./guest-ritual-guides.component').then(m => m.GuestRitualGuidesComponent),
    data: { seo: { title: 'Ritual Guides', description: 'Step-by-step wudu, ghusl and salah guides.' } },
  },
  {
    path: 'journey-guides',
    loadComponent: () => import('./guest-journey-guides.component').then(m => m.GuestJourneyGuidesComponent),
    data: { seo: { title: 'Umrah & Hajj Guides', description: 'Journey guides for Umrah and Hajj.' } },
  },
  { path: 'updates', redirectTo: 'announcements', pathMatch: 'full' },
];
