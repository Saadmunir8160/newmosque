import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export interface Breadcrumb {
  label: string;
  route?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  super: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  mosque: 'My Mosque',
  member: 'Member',
  teacher: 'Teacher',
  muqaddam: 'Muqaddam',
  content: 'Content',
  guest: 'Browse',
  'prayer-editor': 'Prayer Editor',
  // sub-pages
  mosques: 'Mosques',
  claims: 'Claims',
  users: 'Users',
  features: 'Features',
  audit: 'Audit',
  settings: 'Settings',
  modules: 'Modules',
  profile: 'Profile',
  overview: 'Overview',
  staff: 'Staff',
  verification: 'Verification',
  'my-claims': 'My Claims',
  'mosque-listings': 'Mosque Listings',
  'my-mosque': 'My Mosque',
  onboarding: 'Onboarding',
  'prayer-times': 'Prayer Times',
  announcements: 'Announcements',
  events: 'Events',
  janaza: 'Janaza',
  'death-readings': 'Death Readings',
  communities: 'Communities',
  participation: 'Participation',
  madrassah: 'Madrassah',
  reports: 'Reports',
  daily: 'Daily',
  monthly: 'Monthly',
  jumuah: 'Jumuah',
  wird: 'My Wird',
  adhkar: 'Adhkar',
  duas: 'Duas',
  quran: "Qur'an",
  'ritual-guides': 'Ritual Guides',
  'journey-guides': 'Journey Guides',
  readings: 'Readings',
  preferences: 'Preferences',
  classes: 'Classes',
  attendance: 'Attendance',
  'progress-notes': 'Progress Notes',
  awrad: 'Awrad',
  library: 'Library',
  reviews: 'Reviews',
  'mosque-data': 'Mosque Data',
  invitations: 'Invitations',
  oversight: 'Oversight',
};

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    .breadcrumbs {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.55);
      margin-bottom: 0.5rem;
      min-height: 1.25rem;
    }
    .breadcrumbs__item { display: flex; align-items: center; gap: 0.25rem; }
    .breadcrumbs__link {
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      transition: color 0.15s;
    }
    .breadcrumbs__link:hover { color: rgba(255,255,255,0.9); text-decoration: underline; }
    .breadcrumbs__sep { color: rgba(255,255,255,0.3); font-size: 0.625rem; }
    .breadcrumbs__current { color: rgba(255,255,255,0.85); font-weight: 600; }
  `],
  template: `
    <nav *ngIf="crumbs().length > 1" class="breadcrumbs" aria-label="Breadcrumb">
      <span *ngFor="let crumb of crumbs(); let last = last; let i = index" class="breadcrumbs__item">
        <span *ngIf="i > 0" class="breadcrumbs__sep" aria-hidden="true">›</span>
        <a *ngIf="!last && crumb.route" [routerLink]="crumb.route" class="breadcrumbs__link">{{ crumb.label }}</a>
        <span *ngIf="last" class="breadcrumbs__current" aria-current="page">{{ crumb.label }}</span>
        <span *ngIf="!last && !crumb.route" class="breadcrumbs__link">{{ crumb.label }}</span>
      </span>
    </nav>
  `,
})
export class BreadcrumbsComponent {
  private router = inject(Router);

  private navEnd = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
    { initialValue: null }
  );

  crumbs = computed((): Breadcrumb[] => {
    this.navEnd(); // reactive dependency
    const url = this.router.url.split('?')[0];
    const segments = url.split('/').filter(Boolean);
    if (!segments.includes('dashboard')) return [];

    const crumbs: Breadcrumb[] = [{ label: 'Dashboard', route: '/dashboard' }];
    let path = '';

    for (const seg of segments) {
      path += '/' + seg;
      if (seg === 'dashboard') continue;
      const label = SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const isLast = path === url || path === '/' + segments.join('/');
      crumbs.push({ label, route: isLast ? undefined : path });
    }

    return crumbs;
  });
}
