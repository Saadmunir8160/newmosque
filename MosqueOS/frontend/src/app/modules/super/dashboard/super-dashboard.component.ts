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
          <p class="kpi__label">Total Mosques</p>
          <p class="kpi__value">{{ d.mosques.total }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Active' }" class="kpi kpi--green">
          <p class="kpi__label">Active</p>
          <p class="kpi__value">{{ d.mosques.active }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Claimed' }" class="kpi">
          <p class="kpi__label">Claimed</p>
          <p class="kpi__value">{{ d.mosques.byStatus?.['Claimed'] ?? 0 }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'Unclaimed' }" class="kpi kpi--amber">
          <p class="kpi__label">Unclaimed</p>
          <p class="kpi__value">{{ d.mosques.unclaimed }}</p>
        </a>
        <a routerLink="/dashboard/super/mosques/add" class="kpi kpi--action">
          <p class="kpi__label">Add Mosque</p>
          <p class="kpi__value">+</p>
        </a>
      </section>

      <section class="stats-card" aria-label="Statistics">
        <div>
          <p class="stats-card__eyebrow">Statistics</p>
          <h2 class="stats-card__title">Mosque network overview</h2>
        </div>
        <dl class="stats-card__grid">
          <div>
            <dt>Total Mosques</dt>
            <dd>{{ d.mosques.total }}</dd>
          </div>
          <div>
            <dt>Active</dt>
            <dd>{{ d.mosques.active }}</dd>
          </div>
          <div>
            <dt>Claimed</dt>
            <dd>{{ d.mosques.byStatus?.['Claimed'] ?? 0 }}</dd>
          </div>
          <div>
            <dt>Unclaimed</dt>
            <dd>{{ d.mosques.unclaimed }}</dd>
          </div>
        </dl>
      </section>

      <section class="claim-requests" aria-label="Claim Requests">
        <div class="claim-requests__head">
          <div>
            <p class="claim-requests__eyebrow">Claim Requests</p>
            <h2>Admin claim dashboard</h2>
            <p>Verify pending ownership claims, assign owners, update mosque status, and review audit history.</p>
          </div>
          <a routerLink="/dashboard/super/claims" class="claim-requests__action">Open claim requests</a>
        </div>

        <div class="claim-requests__stats">
          <a routerLink="/dashboard/super/claims" class="claim-stat claim-stat--warn">
            <span>Pending Claims</span>
            <strong>{{ d.needsAttention.pendingClaims }}</strong>
          </a>
          <a routerLink="/dashboard/super/mosques" [queryParams]="{ status: 'ClaimPending' }" class="claim-stat">
            <span>Claim Pending Listings</span>
            <strong>{{ d.mosques.pendingClaims ?? 0 }}</strong>
          </a>
          <a routerLink="/dashboard/super/claims" class="claim-stat claim-stat--muted">
            <span>Rejected Claims</span>
            <strong>{{ d.mosques.rejectedClaims ?? 0 }}</strong>
          </a>
        </div>

        <div class="claim-requests__list" *ngIf="pendingClaims().length; else noClaimRequests">
          <a *ngFor="let c of pendingClaims()" [routerLink]="['/dashboard/super/claims', c.claimId]" class="claim-request-row">
            <div>
              <strong>{{ c.mosqueName }}</strong>
              <span>{{ c.claimReference || ('Claim #' + c.claimId) }} · {{ c.claimantName }} · {{ c.city || 'No city' }}</span>
            </div>
            <span class="claim-request-row__status">Verify</span>
          </a>
        </div>
        <ng-template #noClaimRequests>
          <p class="empty">No pending claim requests need verification.</p>
        </ng-template>
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

        <h2 class="super-dash__section-title">Oversight</h2>
        <div class="nav-grid">
          <a
            *ngFor="let item of oversightNavItems"
            [routerLink]="item.route"
            class="nav-card">
            <span class="nav-card__icon" aria-hidden="true">{{ navIcon(item.icon) }}</span>
            <span class="nav-card__label">{{ item.label }}</span>
          </a>
        </div>

        <h2 class="super-dash__section-title">System</h2>
        <div class="nav-grid">
          <a
            *ngFor="let item of systemNavItems"
            [routerLink]="item.route"
            class="nav-card">
            <span class="nav-card__icon" aria-hidden="true">{{ navIcon(item.icon) }}</span>
            <span class="nav-card__label">{{ item.label }}</span>
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
            <a [routerLink]="['/dashboard/super/claims', c.claimId]" class="claim-row__btn">Review</a>
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
    .kpi--action {
      border-color: rgba(15, 76, 58, 0.28);
      background: rgba(15, 76, 58, 0.06);
    }
    .kpi--action .kpi__value { color: var(--mos-primary); }

    .stats-card {
      display: grid;
      gap: 1rem;
      padding: 1.125rem 1.25rem;
      border-radius: var(--mos-radius-card);
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
    }
    @media (min-width: 900px) {
      .stats-card {
        grid-template-columns: minmax(12rem, 0.7fr) 1.3fr;
        align-items: center;
      }
    }
    .stats-card__eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.6875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-text-secondary);
    }
    .stats-card__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: var(--mos-text-primary);
    }
    .stats-card__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin: 0;
    }
    @media (min-width: 640px) { .stats-card__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .stats-card__grid div {
      min-width: 0;
      padding: 0.75rem;
      border-radius: 8px;
      background: rgba(15, 76, 58, 0.04);
    }
    .stats-card__grid dt {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--mos-text-secondary);
    }
    .stats-card__grid dd {
      margin: 0.25rem 0 0;
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--mos-primary);
    }

    .super-dash__section-title {
      margin: 0 0 0.625rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-text-secondary);
    }
    .super-dash__nav { display: flex; flex-direction: column; gap: 1rem; }

    .claim-requests {
      display: grid;
      gap: 1rem;
      padding: 1.125rem 1.25rem;
      border-radius: var(--mos-radius-card);
      border: 1px solid rgba(180, 83, 9, 0.24);
      background: #fff;
    }
    .claim-requests__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .claim-requests__eyebrow {
      margin: 0 0 0.25rem;
      color: #b45309;
      font-size: 0.6875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .claim-requests h2 {
      margin: 0 0 0.35rem;
      color: var(--mos-text-primary);
      font-size: 1.1rem;
      font-weight: 800;
    }
    .claim-requests p {
      margin: 0;
      color: var(--mos-text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .claim-requests__action {
      flex-shrink: 0;
      padding: 0.55rem 0.9rem;
      border-radius: 8px;
      background: var(--mos-primary);
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 800;
      text-decoration: none;
    }
    .claim-requests__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .claim-stat {
      padding: 0.85rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--mos-border);
      background: #f8fafc;
      color: inherit;
      text-decoration: none;
    }
    .claim-stat span {
      display: block;
      color: var(--mos-text-secondary);
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .claim-stat strong {
      display: block;
      margin-top: 0.25rem;
      color: var(--mos-primary);
      font-size: 1.35rem;
      font-weight: 850;
    }
    .claim-stat--warn strong { color: #b45309; }
    .claim-stat--muted strong { color: #64748b; }
    .claim-requests__list {
      display: grid;
      gap: 0.55rem;
    }
    .claim-request-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--mos-border);
      border-radius: 8px;
      color: inherit;
      text-decoration: none;
      background: #f8fafc;
    }
    .claim-request-row strong {
      display: block;
      color: var(--mos-text-primary);
      font-size: 0.875rem;
    }
    .claim-request-row span {
      display: block;
      margin-top: 0.2rem;
      color: var(--mos-text-secondary);
      font-size: 0.75rem;
    }
    .claim-request-row__status {
      margin-top: 0 !important;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e !important;
      font-weight: 800;
      text-transform: uppercase;
    }

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
    @media (max-width: 760px) {
      .claim-requests__head,
      .claim-request-row {
        flex-direction: column;
        align-items: stretch;
      }
      .claim-requests__stats { grid-template-columns: 1fr; }
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
  readonly oversightNavItems = SUPER_ADMIN_NAV_SECTIONS.find(s => s.title === 'Oversight')?.items ?? [];
  readonly systemNavItems = SUPER_ADMIN_NAV_SECTIONS.find(s => s.title === 'System')?.items ?? [];
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
