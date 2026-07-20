import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MosqueClaimsService, MyClaimItem } from '../../../core/services/mosque-claims.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-owner-claims',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Mosque Owner"
      title="My Claim Requests"
      subtitle="Track your mosque ownership requests, review decisions, and continue from approved claims." />

    <section class="oc-summary" aria-label="Claim request summary">
      <article class="oc-stat">
        <span class="oc-stat__label">Pending</span>
        <strong>{{ pendingCount() }}</strong>
      </article>
      <article class="oc-stat">
        <span class="oc-stat__label">Approved</span>
        <strong>{{ approvedCount() }}</strong>
      </article>
      <article class="oc-stat">
        <span class="oc-stat__label">Rejected</span>
        <strong>{{ rejectedCount() }}</strong>
      </article>
    </section>

    <div class="oc-toolbar">
      <button type="button" class="oc-btn oc-btn--ghost" (click)="load()" [disabled]="loading()">Refresh</button>
      <a routerLink="/mosques" class="oc-btn">Find a mosque to claim</a>
    </div>

    <p *ngIf="loading()" class="oc-muted">Loading claim requests...</p>
    <p *ngIf="error()" class="oc-error" role="alert">{{ error() }}</p>

    <div *ngIf="!loading() && !error() && !claims().length" class="oc-empty">
      <h2>No claim requests yet</h2>
      <p>Claim an unclaimed mosque from the public directory. Duplicate pending claims are blocked automatically.</p>
      <a routerLink="/mosques" class="oc-btn">Browse mosque directory</a>
    </div>

    <div *ngIf="!loading() && claims().length" class="oc-list">
      <article *ngFor="let claim of claims()" class="oc-card">
        <header class="oc-card__header">
          <div>
            <p class="oc-ref">{{ claim.claimReference || ('Claim #' + claim.claimId) }}</p>
            <h2>{{ claim.mosqueName }}</h2>
          </div>
          <span class="oc-status" [attr.data-status]="claim.status">{{ claim.reviewStatus || claim.status }}</span>
        </header>

        <dl class="oc-meta">
          <div>
            <dt>Submitted</dt>
            <dd>{{ claim.submittedDate | date:'medium' }}</dd>
          </div>
          <div *ngIf="claim.lastUpdated">
            <dt>Updated</dt>
            <dd>{{ claim.lastUpdated | date:'medium' }}</dd>
          </div>
        </dl>

        <p *ngIf="isPending(claim)" class="oc-note">
          Your request is pending admin verification. You will be notified when it is approved or rejected.
        </p>
        <p *ngIf="isApproved(claim) && !isActive(claim)" class="oc-note">
          Your request has been approved and ownership assigned! The mosque is currently pending activation by a super admin. You will be notified when it is live.
        </p>
        <p *ngIf="claim.rejectionReason" class="oc-rejected">
          Rejection reason: {{ claim.rejectionReason }}
        </p>

        <footer class="oc-actions">
          <a *ngIf="claim.mosqueSlug" [routerLink]="['/mosque', claim.mosqueSlug]" class="oc-btn oc-btn--ghost">
            View listing
          </a>
          <a *ngIf="isApproved(claim)" routerLink="/dashboard/owner" class="oc-btn">
            Open dashboard
          </a>
        </footer>
      </article>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .oc-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .oc-stat {
      padding: 0.85rem 1rem;
      border: 1px solid var(--mos-border);
      border-radius: 8px;
      background: #fff;
    }
    .oc-stat__label {
      display: block;
      margin-bottom: 0.2rem;
      color: var(--mos-text-secondary);
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .oc-stat strong { font-size: 1.4rem; color: var(--mos-text-primary); }
    .oc-toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .oc-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.35rem;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      border: none;
      background: var(--mos-primary);
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
    }
    .oc-btn--ghost { background: #fff; color: var(--mos-text-primary); border: 1px solid var(--mos-border); }
    .oc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .oc-list { display: grid; gap: 0.875rem; }
    .oc-card {
      padding: 1rem;
      border: 1px solid var(--mos-border);
      border-radius: 8px;
      background: #fff;
    }
    .oc-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .oc-ref { margin: 0 0 0.2rem; color: var(--mos-text-secondary); font-size: 0.75rem; font-weight: 800; }
    .oc-card h2 { margin: 0; color: var(--mos-text-primary); font-size: 1rem; font-weight: 800; }
    .oc-status {
      flex-shrink: 0;
      border-radius: 999px;
      padding: 0.22rem 0.65rem;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .oc-status[data-status="Approved"] { background: #dcfce7; color: #166534; }
    .oc-status[data-status="Rejected"] { background: #fee2e2; color: #991b1b; }
    .oc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin: 0.8rem 0 0;
      font-size: 0.8125rem;
    }
    .oc-meta dt { color: var(--mos-text-secondary); font-weight: 700; }
    .oc-meta dd { margin: 0.15rem 0 0; color: var(--mos-text-primary); font-weight: 700; }
    .oc-note { margin: 0.8rem 0 0; color: #92400e; font-size: 0.8125rem; line-height: 1.5; }
    .oc-rejected { margin: 0.8rem 0 0; color: #991b1b; font-size: 0.8125rem; font-weight: 700; line-height: 1.5; }
    .oc-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.9rem; }
    .oc-empty {
      padding: 1.5rem;
      border: 1px dashed var(--mos-border);
      border-radius: 8px;
      background: var(--mos-surface);
      text-align: center;
    }
    .oc-empty h2 { margin: 0 0 0.4rem; font-size: 1.05rem; }
    .oc-empty p { margin: 0 0 1rem; color: var(--mos-text-secondary); font-size: 0.875rem; }
    .oc-muted { color: var(--mos-text-secondary); font-size: 0.875rem; }
    .oc-error { color: var(--mos-danger); font-size: 0.875rem; font-weight: 700; }
    @media (max-width: 640px) {
      .oc-summary { grid-template-columns: 1fr; }
      .oc-card__header { flex-direction: column; }
    }
  `],
})
export class OwnerClaimsComponent implements OnInit {
  private claimsService = inject(MosqueClaimsService);

  claims = signal<MyClaimItem[]>([]);
  loading = signal(false);
  error = signal('');

  pendingCount = computed(() => this.claims().filter(c => this.normalize(c.status) === 'pending').length);
  approvedCount = computed(() => this.claims().filter(c => this.normalize(c.status) === 'approved').length);
  rejectedCount = computed(() => this.claims().filter(c => this.normalize(c.status) === 'rejected').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.claimsService.getMyClaims().subscribe({
      next: claims => {
        this.claims.set(claims ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Could not load your claim requests.');
        this.loading.set(false);
      },
    });
  }

  isPending(claim: MyClaimItem): boolean {
    return this.normalize(claim.status) === 'pending';
  }

  isApproved(claim: MyClaimItem): boolean {
    return this.normalize(claim.status) === 'approved';
  }

  isActive(claim: MyClaimItem): boolean {
    return this.normalize(claim.mosqueStatus) === 'active';
  }

  private normalize(status?: string): string {
    return (status ?? '').trim().toLowerCase();
  }
}
