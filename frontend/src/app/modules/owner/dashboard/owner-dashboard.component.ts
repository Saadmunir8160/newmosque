import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';
import { DashboardBadgesComponent } from '../../../shared/ui/dashboard-badges.component';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardBadgesComponent],
  template: `
    <div class="owner-dash">
      <header class="owner-header">
        <app-dashboard-badges [useAuthRole]="true" />
        <h1 class="owner-title">Mosque Owner Dashboard</h1>
        <p class="owner-sub">Claim and own your mosque profile until verified by Super Admin.</p>
      </header>

      <div class="owner-stats">
        <article class="owner-stat">
          <p class="owner-stat-label">Claim status</p>
          <p class="owner-stat-value" [attr.data-status]="status()">{{ statusLabel() }}</p>
          <p class="owner-stat-hint">{{ statusHint() }}</p>
        </article>
        <article class="owner-stat">
          <p class="owner-stat-label">Profile complete</p>
          <p class="owner-stat-value">{{ completeness() }}%</p>
          <div class="owner-bar"><div class="owner-bar-fill" [style.width.%]="completeness()"></div></div>
        </article>
      </div>

      <article *ngIf="mosque() as m" class="owner-mosque-card">
        <h2 class="owner-mosque-name">{{ m.name }}</h2>
        <p class="owner-mosque-addr">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
        <p *ngIf="missing().length" class="owner-missing">
          Missing: {{ missing().join(', ') }}
        </p>
        <a *ngIf="m.slug" [routerLink]="['/mosque', m.slug]" target="_blank" class="owner-preview">
          Preview public profile →
        </a>
      </article>

      <article *ngIf="!mosque()" class="admin-empty">
        <p class="admin-empty-title">No mosque linked yet</p>
        <p class="admin-empty-desc">Submit a verification claim for an unclaimed listing in your area.</p>
        <a routerLink="/dashboard/owner/verification" class="admin-btn mt-4 inline-flex">Start verification</a>
      </article>

      <div class="owner-quick">
        <a routerLink="/dashboard/owner/profile" class="owner-quick-card">
          <span class="owner-quick-icon">⌂</span>
          <span class="owner-quick-label">Mosque profile</span>
          <span class="owner-quick-desc">Edit name, contact, logo & banner</span>
        </a>
        <a routerLink="/dashboard/owner/verification" class="owner-quick-card">
          <span class="owner-quick-icon">✓</span>
          <span class="owner-quick-label">Verification</span>
          <span class="owner-quick-desc">Submit or track claim approval</span>
        </a>
        <a routerLink="/dashboard/owner/staff" class="owner-quick-card" [class.owner-quick-card--disabled]="!isActive()">
          <span class="owner-quick-icon">👥</span>
          <span class="owner-quick-label">Admin management</span>
          <span class="owner-quick-desc">{{ isActive() ? 'Assign Mosque Admin roles' : 'Available after verification' }}</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .owner-dash { display: flex; flex-direction: column; gap: 1rem; }
    .owner-title { margin: 0; font-size: 1.25rem; font-weight: 600; color: #fff; }
    .owner-sub { margin: 0.375rem 0 0; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.85; max-width: 36rem; }
    .owner-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 540px) { .owner-stats { grid-template-columns: 1fr; } }
    .owner-stat { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .owner-stat-label { margin: 0; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: #6ee7b7; }
    .owner-stat-value { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .owner-stat-value[data-status="Unclaimed"] { color: #94a3b8; }
    .owner-stat-value[data-status="Claimed"] { color: #fbbf24; }
    .owner-stat-value[data-status="Active"] { color: #34d399; }
    .owner-stat-value[data-status="None"] { color: #6ee7b7; }
    .owner-stat-hint { margin: 0.25rem 0 0; font-size: 0.75rem; color: #6ee7b7; opacity: 0.8; }
    .owner-bar { height: 6px; border-radius: 9999px; background: rgba(16,185,129,0.2); margin-top: 0.5rem; overflow: hidden; }
    .owner-bar-fill { height: 100%; background: #10b981; border-radius: 9999px; }
    .owner-mosque-card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem 1.125rem; }
    .owner-mosque-name { margin: 0; font-size: 1.0625rem; font-weight: 600; color: #fff; }
    .owner-mosque-addr { margin: 0.375rem 0 0; font-size: 0.8125rem; color: #6ee7b7; }
    .owner-missing { margin: 0.5rem 0 0; font-size: 0.75rem; color: #fcd34d; }
    .owner-preview { display: inline-block; margin-top: 0.75rem; font-size: 0.8125rem; font-weight: 600; color: #fbbf24; text-decoration: none; }
    .owner-preview:hover { text-decoration: underline; }
    .owner-quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    @media (max-width: 768px) { .owner-quick { grid-template-columns: 1fr; } }
    .owner-quick-card {
      display: flex; flex-direction: column; gap: 0.25rem; text-decoration: none; color: inherit;
      background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem;
      transition: border-color 0.2s, transform 0.2s;
    }
    .owner-quick-card:hover:not(.owner-quick-card--disabled) { border-color: rgba(245,158,11,0.45); transform: translateY(-1px); }
    .owner-quick-card--disabled { opacity: 0.55; pointer-events: none; }
    .owner-quick-icon { font-size: 1.25rem; }
    .owner-quick-label { font-size: 0.875rem; font-weight: 600; color: #fff; }
    .owner-quick-desc { font-size: 0.75rem; color: #6ee7b7; }
    .mt-4 { margin-top: 1rem; }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  private admin = inject(AdminService);
  mosque = signal<Mosque | null>(null);
  completeness = signal(0);
  missing = signal<string[]>([]);

  status = signal('None');
  statusLabel = signal('Not started');
  statusHint = signal('Find an unclaimed mosque and submit a claim.');
  isActive = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getOwnerMosque().subscribe(res => {
      this.mosque.set(res.mosque);
      this.completeness.set(res.profileCompleteness);
      this.missing.set(res.missingFields);
      const s = res.mosque?.status ?? 'None';
      this.status.set(s);
      this.isActive.set(s === 'Active');
      if (!res.mosque) {
        this.statusLabel.set('Not started');
        this.statusHint.set('No claim submitted yet.');
      } else if (s === 'Unclaimed') {
        this.statusLabel.set('Unclaimed');
        this.statusHint.set('Listing exists but is not yet owned.');
      } else if (s === 'Claimed') {
        this.statusLabel.set('Claimed — pending');
        this.statusHint.set('Super Admin is reviewing your ownership request.');
      } else if (s === 'Active') {
        this.statusLabel.set('Active — verified');
        this.statusHint.set('You can edit the profile and assign admins.');
      }
    });
  }
}
