import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';

interface MyClaimRow {
  claimId: number;
  claimReference: string;
  mosqueId: number;
  mosqueName: string;
  mosqueSlug?: string;
  status: string;
  reviewStatus: string;
  submittedDate?: string;
  rejectionReason?: string;
}

@Component({
  selector: 'app-owner-verification',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Mosque Owner"
      title="My claims"
      subtitle="Track ownership claims you submitted. Browse unclaimed listings to start a new claim." />

    <div class="ov-toolbar">
      <button type="button" class="ov-btn ov-btn--ghost" (click)="load()" [disabled]="loading()">Refresh</button>
      <a routerLink="/dashboard/owner/mosque-listings" class="ov-btn">View mosque listings</a>
    </div>

    <p *ngIf="loading()" class="ov-muted">Loading your claims…</p>
    <p *ngIf="error()" class="ov-error">{{ error() }}</p>

    <div *ngIf="!loading() && !error() && !claims().length" class="ov-empty">
      <p class="ov-empty__title">No claims submitted yet</p>
      <p class="ov-empty__body">Find an unclaimed mosque in the public directory and submit a claim from its profile page.</p>
      <a routerLink="/dashboard/owner/mosque-listings" class="ov-btn">Browse mosque listings</a>
    </div>

    <div *ngIf="claims().length" class="ov-list">
      <article *ngFor="let c of claims()" class="ov-card">
        <div class="ov-card__head">
          <div>
            <h2>{{ c.mosqueName }}</h2>
            <p class="ov-ref">{{ c.claimReference }} · {{ c.reviewStatus }}</p>
          </div>
          <span class="ov-badge" [attr.data-status]="c.status">{{ formatStatus(c.status) }}</span>
        </div>
        <p *ngIf="c.submittedDate" class="ov-date">Submitted {{ c.submittedDate | date:'medium' }}</p>
        <p *ngIf="c.rejectionReason" class="ov-reject">Rejected: {{ c.rejectionReason }}</p>
        <div class="ov-card__actions">
          <a *ngIf="c.mosqueSlug" [routerLink]="['/mosque', c.mosqueSlug]" class="ov-btn ov-btn--ghost">View public listing</a>
        </div>
      </article>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ov-toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .ov-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.5rem 1rem; border-radius: 10px; border: none;
      background: var(--mos-primary); color: #fff;
      font-weight: 700; font-size: 0.8125rem; text-decoration: none; cursor: pointer;
    }
    .ov-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .ov-btn--ghost { background: #fff; color: var(--mos-text-primary); border: 1px solid var(--mos-border); }
    .ov-list { display: grid; gap: 0.875rem; }
    .ov-card { padding: 1rem 1.125rem; border-radius: 14px; border: 1px solid var(--mos-border); background: #fff; }
    .ov-card__head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
    .ov-card h2 { margin: 0; font-size: 1rem; font-weight: 800; }
    .ov-ref { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--mos-text-secondary); }
    .ov-badge { font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: var(--mos-primary-08); white-space: nowrap; }
    .ov-badge[data-status="Pending"] { background: #fef3c7; color: #92400e; }
    .ov-badge[data-status="Approved"] { background: #d1fae5; color: #065f46; }
    .ov-badge[data-status="Rejected"] { background: #fee2e2; color: #991b1b; }
    .ov-date { margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--mos-text-secondary); }
    .ov-reject { margin: 0.35rem 0 0; color: var(--mos-danger); font-size: 0.8125rem; font-weight: 600; }
    .ov-card__actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .ov-error { color: var(--mos-danger); font-weight: 600; font-size: 0.875rem; }
    .ov-muted { color: var(--mos-text-secondary); font-size: 0.875rem; }
    .ov-empty {
      padding: 1.25rem; border-radius: 14px; border: 1px dashed var(--mos-border);
      background: var(--mos-surface); text-align: center;
    }
    .ov-empty__title { margin: 0; font-weight: 800; font-size: 1rem; }
    .ov-empty__body { margin: 0.5rem 0 1rem; font-size: 0.875rem; color: var(--mos-text-secondary); line-height: 1.5; }
  `]
})
export class OwnerVerificationComponent implements OnInit {
  private admin = inject(AdminService);
  claims = signal<MyClaimRow[]>([]);
  loading = signal(false);
  error = signal('');
  readonly formatStatus = formatMosqueStatus;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.getMyClaims().subscribe({
      next: (items) => {
        this.claims.set((items as MyClaimRow[]) ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not load your claims. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
