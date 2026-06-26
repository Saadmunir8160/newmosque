import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Mosque } from '../../../core/models';

interface OwnerNotice {
  type: 'info' | 'warn' | 'success';
  title: string;
  message: string;
  route?: string;
  action?: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="owner-dash">
      <div *ngIf="isActive()" class="owner-verified" role="status">
        <span class="owner-verified__badge">ACTIVE</span>
        <span class="owner-verified__text">Verified Mosque</span>
      </div>

      <div class="owner-dash__kpis">
        <article class="owner-status-card">
          <div class="owner-status-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3L4 9v12h16V9L12 3z" stroke-linejoin="round"/>
              <path d="M9 21v-6h6v6" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="1.25" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div class="owner-status-card__body">
            <p class="owner-status-card__label">Claim status</p>
            <p class="owner-status-card__value" [attr.data-status]="status()">{{ statusLabel() }}</p>
            <p class="owner-status-card__hint">{{ statusHint() }}</p>
          </div>
        </article>

        <article class="owner-kpi-card">
          <p class="owner-kpi-card__label">Profile complete</p>
          <p class="owner-kpi-card__value">{{ completeness() }}%</p>
          <div class="owner-kpi-card__bar">
            <div class="owner-kpi-card__fill" [style.width.%]="completeness()"></div>
          </div>
        </article>

        <article class="owner-kpi-card">
          <p class="owner-kpi-card__label">Modules enabled</p>
          <p class="owner-kpi-card__value">{{ enabledModules() }}<span class="owner-kpi-card__of"> / {{ totalModules() }}</span></p>
          <p class="owner-kpi-card__hint">Feature flags for this mosque</p>
        </article>
      </div>

      <div *ngIf="notifications().length" class="owner-notices">
        <article *ngFor="let n of notifications()" class="owner-notice" [attr.data-type]="n.type">
          <p class="owner-notice__title">{{ n.title }}</p>
          <p class="owner-notice__body">{{ n.message }}</p>
          <a *ngIf="n.route" [routerLink]="n.route" class="owner-notice__link">{{ n.action }}</a>
        </article>
      </div>

      <article *ngIf="mosque() as m" class="owner-panel">
        <h2 class="owner-panel__title">{{ m.name }}</h2>
        <p class="owner-panel__sub">{{ m.address }}, {{ m.city }} {{ m.postcode }}</p>
        <p *ngIf="missing().length" class="owner-panel__warn">
          Missing: {{ missing().join(', ') }}
        </p>
        <a *ngIf="m.slug && isActive()" routerLink="/dashboard/owner/profile" class="owner-link">
          Open mosque profile →
        </a>
      </article>

      <article *ngIf="!mosque()" class="owner-panel owner-panel--cta">
        <p class="owner-panel__title">No mosque linked yet</p>
        <p class="owner-panel__sub">Contact your super admin to assign your mosque to this account.</p>
      </article>

      <div class="owner-quick-grid">
        <a routerLink="/dashboard/owner/profile" class="owner-quick">
          <span class="owner-quick__icon">⌂</span>
          <h3 class="owner-quick__title">Mosque profile</h3>
          <p class="owner-quick__desc">Edit name, contact, logo &amp; banner</p>
        </a>
        <a routerLink="/dashboard/owner/settings" class="owner-quick"
          [class.owner-quick--disabled]="!isActive()">
          <span class="owner-quick__icon">⚙</span>
          <h3 class="owner-quick__title">Module settings</h3>
          <p class="owner-quick__desc">{{ isActive() ? 'Enable prayer times, events, donations' : 'Available after mosque is Active' }}</p>
        </a>
        <a routerLink="/dashboard/owner/staff" class="owner-quick"
          [class.owner-quick--disabled]="!isActive()">
          <span class="owner-quick__icon">👥</span>
          <h3 class="owner-quick__title">Admin management</h3>
          <p class="owner-quick__desc">{{ isActive() ? 'Assign Mosque Admin roles' : 'Available when mosque is Active' }}</p>
        </a>
        <a routerLink="/dashboard/owner/my-claims" class="owner-quick">
          <span class="owner-quick__icon">📝</span>
          <h3 class="owner-quick__title">My claims</h3>
          <p class="owner-quick__desc">Track ownership claim status</p>
        </a>
        <a routerLink="/dashboard/owner/mosque-listings" class="owner-quick">
          <span class="owner-quick__icon">📋</span>
          <h3 class="owner-quick__title">Mosque listings</h3>
          <p class="owner-quick__desc">Browse unclaimed mosques to claim</p>
        </a>
        <a *ngIf="mosque()?.slug && isActive()" [routerLink]="['/mosque', mosque()!.slug]" target="_blank" class="owner-quick">
          <span class="owner-quick__icon">🌐</span>
          <h3 class="owner-quick__title">Public profile</h3>
          <p class="owner-quick__desc">View live mosque page</p>
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .owner-verified {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.9rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 1px solid #6ee7b7;
      margin-bottom: 0.25rem;
    }

    .owner-verified__badge {
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #047857;
      background: #fff;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #a7f3d0;
    }

    .owner-verified__text {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #065f46;
    }

    .owner-dash {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .owner-dash__kpis {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.875rem;
    }

    .owner-notices {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .owner-notice {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--mos-border);
      background: #fff;
    }

    .owner-notice[data-type="warn"] {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .owner-notice[data-type="success"] {
      border-color: #10b981;
      background: #ecfdf5;
    }

    .owner-notice[data-type="info"] {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .owner-notice__title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-text-primary);
    }

    .owner-notice__body {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
      color: var(--mos-text-secondary);
      line-height: 1.45;
    }

    .owner-notice__link {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mos-primary, #0d5c4b);
      text-decoration: none;
    }

    .owner-notice__link:hover { text-decoration: underline; }

    @media (max-width: 900px) {
      .owner-dash__kpis { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .owner-dash__kpis { grid-template-columns: 1fr; }
    }

    .owner-status-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.125rem;
      background: #f1f5f4;
      border: 1px solid var(--mos-border);
      border-radius: 14px;
    }

    .owner-status-card__icon {
      flex-shrink: 0;
      width: 2.75rem;
      height: 2.75rem;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: #d1fae5;
      color: var(--mos-primary);
    }

    .owner-status-card__icon svg { width: 1.35rem; height: 1.35rem; }

    .owner-status-card__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-text-secondary);
    }

    .owner-status-card__value {
      margin: 0.2rem 0 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--mos-primary);
    }

    .owner-status-card__value[data-status="Unclaimed"] { color: var(--mos-text-secondary); }
    .owner-status-card__value[data-status="ClaimPending"],
    .owner-status-card__value[data-status="PendingReview"] { color: #b45309; }
    .owner-status-card__value[data-status="Claimed"] { color: #0369a1; }
    .owner-status-card__value[data-status="Active"] { color: var(--mos-success); }
    .owner-status-card__value[data-status="None"] { color: var(--mos-primary); }

    .owner-status-card__hint {
      margin: 0.2rem 0 0;
      font-size: 0.8125rem;
      color: var(--mos-text-secondary);
      line-height: 1.45;
    }

    .owner-kpi-card {
      padding: 1rem 1.125rem;
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      border-radius: 14px;
      box-shadow: var(--mos-shadow-card);
    }

    .owner-kpi-card__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mos-text-secondary);
    }

    .owner-kpi-card__value {
      margin: 0.25rem 0 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--mos-primary);
      line-height: 1.1;
    }

    .owner-kpi-card__bar {
      margin-top: 0.625rem;
      height: 0.375rem;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }

    .owner-kpi-card__hint {
      margin: 0.35rem 0 0;
      font-size: 0.75rem;
      color: var(--mos-text-secondary);
    }

    .owner-kpi-card__of {
      font-size: 1rem;
      font-weight: 600;
      color: var(--mos-text-secondary);
    }

    .owner-kpi-card__fill {
      height: 100%;
      border-radius: 999px;
      background: var(--mos-primary);
      transition: width 0.3s ease;
    }

    .owner-panel {
      padding: 1.125rem 1.25rem;
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      border-radius: 14px;
      box-shadow: var(--mos-shadow-card);
    }

    .owner-panel__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--mos-text-primary);
    }

    .owner-panel__sub {
      margin: 0.35rem 0 0;
      font-size: 0.8125rem;
      color: var(--mos-text-secondary);
      line-height: 1.5;
    }

    .owner-panel__warn {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #b45309;
    }

    .owner-link {
      display: inline-block;
      margin-top: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-primary);
      text-decoration: none;
    }

    .owner-link:hover { text-decoration: underline; }

    .owner-btn {
      display: inline-flex;
      margin-top: 0.875rem;
      padding: 0.625rem 1.125rem;
      border: none;
      border-radius: 10px;
      background: var(--mos-primary);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .owner-btn:hover { background: var(--mos-primary-hover); }

    .owner-quick-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    @media (min-width: 900px) {
      .owner-quick-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    .owner-quick {
      display: block;
      padding: 1rem 1.125rem;
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      border-radius: 14px;
      box-shadow: var(--mos-shadow-card);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
    }

    .owner-quick:hover:not(.owner-quick--disabled) {
      border-color: rgba(15, 76, 58, 0.28);
      box-shadow: var(--mos-shadow-card-hover);
      transform: translateY(-1px);
    }

    .owner-quick--disabled {
      opacity: 0.55;
      pointer-events: none;
    }

    .owner-quick__icon { font-size: 1.25rem; line-height: 1; }

    .owner-quick__title {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--mos-text-primary);
    }

    .owner-quick__desc {
      margin: 0.25rem 0 0;
      font-size: 0.75rem;
      color: var(--mos-text-secondary);
      line-height: 1.45;
    }
    .owner-submit-row { margin-top: 0.875rem; padding-top: 0.875rem; border-top: 1px solid var(--mos-border); }
    .owner-submit-msg { margin: 0.5rem 0 0; font-size: 0.8125rem; font-weight: 600; color: var(--mos-success); }
    .owner-submit-msg--err { color: var(--mos-danger); }
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
  enabledModules = signal(0);
  totalModules = signal(0);
  notifications = signal<OwnerNotice[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getOwnerMosque().subscribe((res) => {
      this.mosque.set(res.mosque);
      this.completeness.set(res.profileCompleteness);
      this.missing.set(res.missingFields);
      const s = res.mosque?.status ?? 'None';
      this.status.set(s);
      this.isActive.set(s === 'Active');
      if (!res.mosque) {
        this.statusLabel.set('No mosque linked');
        this.statusHint.set('Contact super admin to link your account to a mosque.');
      } else if (s === 'Active') {
        this.statusLabel.set('Active');
        this.statusHint.set('You can edit the profile, manage modules, and assign admins.');
      } else {
        this.statusLabel.set(s);
        this.statusHint.set('Your mosque is not active yet.');
      }
      this.notifications.set(this.buildNotifications(res.mosque, res.profileCompleteness));
      if (res.mosque?.id) {
        this.admin.getMosqueFeatures(res.mosque.id).subscribe({
          next: (mods) => {
            this.totalModules.set(mods.length);
            this.enabledModules.set(mods.filter(m => m.isEnabled).length);
          },
          error: () => {
            this.totalModules.set(0);
            this.enabledModules.set(0);
          },
        });
      }
    });
  }

  private buildNotifications(
    mosque: Mosque | null,
    completeness: number,
  ): OwnerNotice[] {
    const notices: OwnerNotice[] = [];

    if (mosque?.status === 'Active' && completeness < 60) {
      notices.push({
        type: 'info',
        title: 'Complete your profile',
        message: `Profile is ${completeness}% complete. Add contact details and branding.`,
        route: '/dashboard/owner/profile',
        action: 'Complete profile →',
      });
    }

    if (mosque?.status === 'Active') {
      notices.push({
        type: 'success',
        title: 'Mosque is active',
        message: `${mosque.name} is ready to manage.`,
        route: '/dashboard/owner/profile',
        action: 'Open profile →',
      });
    }

    return notices;
  }
}
