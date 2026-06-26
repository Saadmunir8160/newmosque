import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  PendingOwnershipClaim,
  PlatformDashboard,
  PlatformService,
} from '../../../core/services/platform.service';
import {
  SUPER_ADMIN_NAV_ICONS,
  SUPER_ADMIN_NAV_SECTIONS,
} from '../../../core/config/super-admin-nav.config';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';

import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Dashboard"
      subtitle="Mosque listings, ownership claims, mosque data, and platform access — aligned with the sidebar." />

    <div class="super-dash" *ngIf="dashboard() as d">
      <header class="super-dash__header">
        <div>
          <h1 class="super-dash__title">{{ greeting() }}</h1>
          <p class="super-dash__sub">Mosque listings, claims, data, and access — same as the sidebar.</p>
        </div>
        <button type="button" class="super-dash__refresh" (click)="refresh()" [disabled]="loading()">
          {{ loading() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </header>

      <section class="super-dash__kpis" aria-label="Mosque summary">
        <a routerLink="/dashboard/super/mosques" class="kpi">
          <p class="kpi__label">Total mosques</p>
          <p class="kpi__value">{{ d.mosques.total }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Unclaimed' }" class="kpi kpi--amber">
          <p class="kpi__label">Unclaimed</p>
          <p class="kpi__value">{{ d.mosques.unclaimed }}</p>
        </a>
        <a routerLink="/dashboard/super/claims" class="kpi kpi--amber">
          <p class="kpi__label">Pending claims</p>
          <p class="kpi__value">{{ d.mosques.pendingClaims ?? d.needsAttention.pendingClaims }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Claimed' }" class="kpi">
          <p class="kpi__label">Claimed</p>
          <p class="kpi__value">{{ d.mosques.byStatus?.['Claimed'] ?? 0 }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Active' }" class="kpi kpi--green">
          <p class="kpi__label">Active</p>
          <p class="kpi__value">{{ d.mosques.active }}</p>
        </a>
      </section>

      <section class="super-dash__nav" aria-label="Quick navigation">
        <h2 class="super-dash__section-title">Mosques</h2>
        <div class="nav-grid">
          <a
            *ngFor="let item of mosqueNavItems"
            [routerLink]="item.route"
            class="nav-card">
            <span class="nav-card__icon" aria-hidden="true">{{ navIcon(item.icon) }}</span>
            <span class="nav-card__label">{{ item.label }}</span>
          </a>
        </div>

        <h2 class="super-dash__section-title">Access</h2>
        <div class="nav-grid nav-grid--access">
          <a
            *ngFor="let item of accessNavItems"
            [routerLink]="item.route"
            class="nav-card">
            <span class="nav-card__icon" aria-hidden="true">{{ navIcon(item.icon) }}</span>
            <span class="nav-card__label">{{ item.label }}</span>
            <span class="nav-card__meta" *ngIf="item.route === '/dashboard/super/users'">{{ d.users.total }} users</span>
          </a>
        </div>
      </section>

      <div class="super-dash__cols">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Recent mosques</h2>
            <a routerLink="/dashboard/super/mosques" class="panel__link">Mosque listings →</a>
          </div>
          <div class="data-table" *ngIf="recentMosques().length; else noMosques">
            <div class="data-table__head">
              <span>Mosque</span><span>City</span><span>Status</span><span>Owner</span>
            </div>
            <div class="data-table__body">
              <a *ngFor="let m of recentMosques()" [routerLink]="['/dashboard/super/mosques', m.id]" class="data-table__row">
                <span class="row-name">{{ m.name }}</span>
                <span>{{ m.city }}</span>
                <span class="row-status">{{ formatStatus(m.status) }}</span>
                <span>{{ m.ownerName || '—' }}</span>
              </a>
            </div>
          </div>
          <ng-template #noMosques>
            <p class="empty">No mosque listings yet.</p>
          </ng-template>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Pending claims</h2>
            <a routerLink="/dashboard/super/claims" class="panel__link">Claim management →</a>
          </div>
          <p *ngIf="!pendingClaims().length" class="empty">No pending ownership claims.</p>
          <div *ngFor="let c of pendingClaims()" class="claim-row">
            <div>
              <p class="claim-row__name">{{ c.mosqueName }}</p>
              <p class="claim-row__meta">{{ c.city }} · {{ c.claimantName }}</p>
            </div>
            <a routerLink="/dashboard/super/claims" class="claim-row__btn">Review</a>
          </div>
        </section>
      </div>
    </div>

    <div *ngIf="loading() && !dashboard()" class="dash-loading">Loading dashboard…</div>
  `,
  styles: [`
    .super-dash { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 2rem; }

    .super-dash__header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--mos-radius-card);
      background: linear-gradient(135deg, #064E3B 0%, #0F766E 48%, #115E59 100%);
      border: 1px solid rgba(212, 175, 55, 0.25);
      box-shadow: 0 12px 32px rgba(6, 78, 59, 0.18);
    }
    .super-dash__title {
      margin: 0;
      font-size: clamp(1.25rem, 2.5vw, 1.625rem);
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }
    .super-dash__sub {
      margin: 0.4rem 0 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.78);
      line-height: 1.45;
    }
    .super-dash__refresh {
      font-size: 0.8125rem;
      font-weight: 700;
      background: linear-gradient(135deg, #D4AF37 0%, #FBBF24 100%);
      color: #064E3B;
      padding: 0.5rem 1rem;
      border-radius: var(--mos-radius-btn);
      border: none;
      cursor: pointer;
    }
    .super-dash__refresh:disabled { opacity: 0.65; cursor: wait; }

    .super-dash__kpis {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (min-width: 768px) { .super-dash__kpis { grid-template-columns: repeat(5, 1fr); } }

    .kpi {
      display: block;
      padding: 0.9rem 1rem;
      border-radius: var(--mos-radius-card);
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, transform 0.15s;
    }
    .kpi:hover { border-color: rgba(15, 76, 58, 0.35); transform: translateY(-1px); }
    .kpi__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mos-text-secondary);
    }
    .kpi__value {
      margin: 0.25rem 0 0;
      font-size: 1.375rem;
      font-weight: 800;
      color: var(--mos-primary);
    }
    .kpi--amber .kpi__value { color: #B45309; }
    .kpi--green .kpi__value { color: #047857; }

    .super-dash__section-title {
      margin: 0 0 0.625rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-text-secondary);
    }
    .super-dash__nav { display: flex; flex-direction: column; gap: 1rem; }

    .nav-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.625rem;
    }
    @media (min-width: 640px) { .nav-grid { grid-template-columns: repeat(4, 1fr); } }
    .nav-grid--access { grid-template-columns: 1fr; }
    @media (min-width: 480px) { .nav-grid--access { grid-template-columns: repeat(2, 1fr); max-width: 24rem; } }

    .nav-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 1rem;
      border-radius: var(--mos-radius-card);
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .nav-card:hover {
      border-color: rgba(15, 76, 58, 0.35);
      box-shadow: 0 4px 12px rgba(15, 76, 58, 0.08);
    }
    .nav-card__icon { font-size: 1.25rem; line-height: 1; }
    .nav-card__label { font-size: 0.8125rem; font-weight: 700; color: var(--mos-text-primary); }
    .nav-card__meta { font-size: 0.75rem; color: var(--mos-text-secondary); }

    .super-dash__cols {
      display: grid;
      gap: 1rem;
    }
    @media (min-width: 1024px) { .super-dash__cols { grid-template-columns: 1fr 1fr; } }

    .panel {
      border-radius: var(--mos-radius-card);
      padding: 1.125rem 1.25rem;
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
    }
    .panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .panel__title { margin: 0; font-size: 1rem; font-weight: 800; }
    .panel__link {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mos-primary);
      text-decoration: none;
    }
    .panel__link:hover { text-decoration: underline; }

    .data-table { font-size: 0.75rem; }
    .data-table__head,
    .data-table__row {
      display: grid;
      grid-template-columns: 1.4fr 0.9fr 0.8fr 0.9fr;
      gap: 0.5rem;
      padding: 0.5rem 0;
    }
    .data-table__head {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--mos-text-secondary);
      border-bottom: 1px solid var(--mos-border);
    }
    .data-table__row {
      text-decoration: none;
      color: inherit;
      border-bottom: 1px solid var(--mos-border);
    }
    .data-table__row:last-child { border-bottom: none; }
    .data-table__row:hover { background: rgba(15, 76, 58, 0.04); }
    .row-name { font-weight: 700; color: var(--mos-text-primary); }

    .claim-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--mos-border);
    }
    .claim-row:last-child { border-bottom: none; }
    .claim-row__name { margin: 0; font-size: 0.875rem; font-weight: 700; }
    .claim-row__meta { margin: 0.2rem 0 0; font-size: 0.75rem; color: var(--mos-text-secondary); }
    .claim-row__btn {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      background: var(--mos-primary);
      color: #fff;
      text-decoration: none;
    }

    .empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--mos-text-secondary);
    }
    .dash-loading {
      padding: 2rem;
      text-align: center;
      color: var(--mos-text-secondary);
      font-size: 0.875rem;
    }
  `],
})
export class SuperDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private platform = inject(PlatformService);

  dashboard = signal<PlatformDashboard | null>(null);
  pendingClaims = signal<PendingOwnershipClaim[]>([]);
  loading = signal(false);

  readonly formatStatus = formatMosqueStatus;
  readonly mosqueNavItems = SUPER_ADMIN_NAV_SECTIONS.find(s => s.title === 'Mosques')?.items ?? [];
  readonly accessNavItems = SUPER_ADMIN_NAV_SECTIONS.find(s => s.title === 'Access')?.items ?? [];
  readonly TABLE_ROW_LIMIT = 5;

  greeting = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.userName || 'Super Admin';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${name}`;
  });

  recentMosques = computed(() => {
    const list = this.dashboard()?.mosques.recentAdditions ?? [];
    return list.slice(0, this.TABLE_ROW_LIMIT);
  });

  ngOnInit(): void {
    this.refresh();
  }

  navIcon(key?: string): string {
    if (key && SUPER_ADMIN_NAV_ICONS[key]) return SUPER_ADMIN_NAV_ICONS[key];
    return '▦';
  }

  refresh(): void {
    this.loading.set(true);
    this.platform.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.platform.getPendingClaims().subscribe({
      next: (res) => this.pendingClaims.set((res.items ?? []).slice(0, this.TABLE_ROW_LIMIT)),
      error: () => this.pendingClaims.set([]),
    });
  }
}
