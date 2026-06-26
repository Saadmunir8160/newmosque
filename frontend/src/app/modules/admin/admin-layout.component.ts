import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { ROLES } from '../../core/constants/roles';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

const MODULE_LABELS: Record<string, string> = {
  '': 'Mosque Admin',
  mosque: 'Mosque Profile',
  modules: 'Module Settings',
  'prayer-times': 'Prayer Times',
  announcements: 'Announcements',
  events: 'Events',
  janaza: 'Janaza',
  'death-readings': 'Death Readings',
  settings: 'Module Settings',
  contact: 'Contact Settings',
  communities: 'Communities',
  participation: 'Participation',
  madrassah: 'Madrassah',
  reports: 'Reports',
  users: 'Users',
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, PageHeaderComponent],
  template: `
    <ng-container *ngIf="!ownerBlocked()">
      <router-outlet />
    </ng-container>

    <ng-container *ngIf="ownerBlocked()">
      <app-page-header
        badge="Mosque Owner"
        [title]="moduleTitle()"
        [subtitle]="'Complete mosque verification before configuring ' + moduleTitle() + '.'" />
      <div class="mos-dash-panel mos-dash-panel--info">
        <p class="admin-empty-title">Mosque setup required</p>
        <p class="admin-empty-desc">
          Register a new mosque or claim an existing listing. Once your mosque is linked to your account,
          you can manage {{ moduleTitle() }} from here.
        </p>
        <a routerLink="/dashboard/owner/verification" class="mos-dash-link">Go to verification →</a>
      </div>
    </ng-container>
  `,
  styles: [`
    .mos-dash-link {
      display: inline-block;
      margin-top: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-primary);
      text-decoration: none;
    }
    .mos-dash-link:hover { text-decoration: underline; }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private admin = inject(AdminService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  ownerBlocked = signal(false);
  moduleTitle = signal('this module');

  ngOnInit(): void {
    this.syncTitle();
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.syncTitle();
      this.refreshOwnerGate();
    });

    this.refreshOwnerGate();
  }

  private refreshOwnerGate(): void {
    if (!this.auth.hasRole(ROLES.MosqueOwner)) {
      this.ownerBlocked.set(false);
      return;
    }
    this.admin.getOwnerMosque().subscribe({
      next: res => this.ownerBlocked.set(!res.mosque),
      error: () => this.ownerBlocked.set(true),
    });
  }

  private syncTitle(): void {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const adminIdx = parts.indexOf('admin');
    if (adminIdx < 0) {
      this.moduleTitle.set('Admin');
      return;
    }
    const segment = parts[adminIdx + 1] ?? '';
    const sub = parts[adminIdx + 2];
    let key = segment;
    if (segment === 'settings' && sub === 'contact') key = 'contact';
    else if (segment === 'users' && sub) key = 'users';
    this.moduleTitle.set(MODULE_LABELS[key] ?? (segment.replace(/-/g, ' ') || 'Admin'));
  }
}
