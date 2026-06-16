import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlatformService } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { Mosque } from '../../../core/models';

@Component({
  selector: 'app-super-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Ownership claims"
      subtitle="Review mosque ownership requests. Approving activates the mosque and grants the owner admin access." />

    <div class="claims-stats">
      <div class="stat-card" [class.stat-card--clear]="!pending().length">
        <div class="stat-card__icon" aria-hidden="true">
          <svg *ngIf="pending().length" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <svg *ngIf="!pending().length" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <p class="stat-card__value">{{ pending().length }}</p>
          <p class="stat-card__label">Pending claim{{ pending().length === 1 ? '' : 's' }}</p>
        </div>
      </div>
      <div class="stat-card stat-card--info">
        <div class="stat-card__icon stat-card__icon--info" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div>
          <p class="stat-card__hint">Approve to activate mosque &amp; grant owner admin access</p>
        </div>
      </div>
    </div>

    <div *ngIf="loading()" class="claims-loading">
      <span class="claims-loading__dot"></span>
      Loading claims…
    </div>

    <div *ngIf="!loading() && !pending().length" class="claims-empty">
      <div class="claims-empty__icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h3 class="claims-empty__title">All clear</h3>
      <p class="claims-empty__sub">There are no pending ownership claims at the moment.</p>
      <a routerLink="/dashboard/super/mosques" class="claims-empty__link">Browse mosque listings →</a>
    </div>

    <div *ngIf="!loading() && pending().length" class="claims-list">
      <article *ngFor="let m of pending()" class="claim-card">
        <div class="claim-card__accent" aria-hidden="true"></div>

        <div class="claim-card__main">
          <div class="claim-card__top">
            <div class="claim-avatar" aria-hidden="true">{{ m.name.charAt(0) }}</div>
            <div class="claim-info">
              <div class="claim-title-row">
                <h4 class="claim-title">
                  <a [routerLink]="['/dashboard/super/mosques', m.id]">{{ m.name }}</a>
                </h4>
                <span class="claim-status">Awaiting review</span>
              </div>
              <p class="claim-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ m.address }}, {{ m.city }} {{ m.postcode }}
              </p>
            </div>
          </div>

          <div class="claim-meta">
            <div class="claim-meta__item">
              <span class="claim-meta__label">Claimant ID</span>
              <span class="claim-meta__value claim-meta__value--mono">{{ m.ownerId || 'Unknown' }}</span>
            </div>
            <div class="claim-meta__item" *ngIf="m.updatedAt">
              <span class="claim-meta__label">Submitted</span>
              <span class="claim-meta__value">{{ m.updatedAt | date:'medium' }}</span>
            </div>
            <div class="claim-meta__item">
              <span class="claim-meta__label">Slug</span>
              <span class="claim-meta__value claim-meta__value--mono">/{{ m.slug }}</span>
            </div>
          </div>

          <div class="reject-field">
            <label class="reject-label" [for]="'reject-' + m.id">Rejection note <span class="optional">(optional)</span></label>
            <input class="reject-input" [id]="'reject-' + m.id"
              placeholder="Reason recorded in audit log only"
              [(ngModel)]="rejectReason[m.id]">
          </div>
        </div>

        <div class="claim-card__actions">
          <button type="button" class="btn-approve"
            (click)="approve(m.id)" [disabled]="processingId() === m.id">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {{ processingId() === m.id ? 'Approving…' : 'Approve' }}
          </button>
          <button type="button" class="btn-reject"
            (click)="reject(m.id)" [disabled]="processingId() === m.id">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
          <a [routerLink]="['/dashboard/super/mosques', m.id]" class="btn-view">View listing</a>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .claims-stats {
      display: grid; gap: 0.75rem; margin-bottom: 1.25rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) { .claims-stats { grid-template-columns: auto 1fr; } }

    .stat-card {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 1rem 1.125rem;
      background: linear-gradient(135deg, rgba(6,78,59,0.8) 0%, rgba(2,44,34,0.95) 100%);
      border: 1px solid rgba(212,175,55,0.2);
      border-radius: 0.75rem;
    }
    .stat-card--clear { border-color: rgba(16,185,129,0.35); }
    .stat-card--info { border-color: rgba(16,185,129,0.15); }
    .stat-card__icon {
      flex-shrink: 0; width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35);
      color: #fcd34d; display: flex; align-items: center; justify-content: center;
    }
    .stat-card--clear .stat-card__icon {
      background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); color: #6ee7b7;
    }
    .stat-card__icon--info {
      background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: #93c5fd;
    }
    .stat-card__value { margin: 0; font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1; }
    .stat-card__label { margin: 0.2rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.7); text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-card__hint { margin: 0; font-size: 0.8125rem; color: rgba(167,243,208,0.8); line-height: 1.45; }

    .claims-loading {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: rgba(110,231,183,0.7); padding: 1rem 0;
    }
    .claims-loading__dot {
      width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: #D4AF37; animation: pulse 1s ease infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    .claims-empty {
      text-align: center; padding: 3rem 1.5rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.6) 0%, rgba(2,44,34,0.9) 100%);
      border: 1px dashed rgba(16,185,129,0.3);
      border-radius: 1rem;
    }
    .claims-empty__icon {
      width: 4.5rem; height: 4.5rem; margin: 0 auto 1rem;
      border-radius: 50%; background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.3);
      color: #6ee7b7; display: flex; align-items: center; justify-content: center;
    }
    .claims-empty__title { margin: 0 0 0.375rem; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .claims-empty__sub { margin: 0 0 1.25rem; font-size: 0.8125rem; color: rgba(167,243,208,0.75); max-width: 22rem; margin-left: auto; margin-right: auto; }
    .claims-empty__link {
      display: inline-block; font-size: 0.8125rem; font-weight: 600;
      color: #D4AF37; text-decoration: none;
    }
    .claims-empty__link:hover { color: #fcd34d; text-decoration: underline; }

    .claims-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .claim-card {
      position: relative; display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem; align-items: start;
      padding: 1rem 1.125rem 1rem 1.25rem;
      background: linear-gradient(135deg, rgba(6,78,59,0.75) 0%, rgba(2,44,34,0.95) 100%);
      border: 1px solid rgba(212,175,55,0.18);
      border-radius: 0.75rem;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .claim-card:hover {
      border-color: rgba(212,175,55,0.35);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .claim-card__accent {
      position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
      background: linear-gradient(180deg, #fcd34d, #D4AF37);
    }
    .claim-card__main { min-width: 0; }

    .claim-card__top { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
    .claim-avatar {
      flex-shrink: 0; width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3);
      color: #D4AF37; font-size: 1rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .claim-info { min-width: 0; flex: 1; }
    .claim-title-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;
    }
    .claim-title { margin: 0; font-size: 0.9375rem; font-weight: 700; }
    .claim-title a { color: #fff; text-decoration: none; }
    .claim-title a:hover { color: #fcd34d; }
    .claim-status {
      font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      color: #fcd34d; background: rgba(245,158,11,0.12);
      border: 1px solid rgba(245,158,11,0.35);
      padding: 0.2rem 0.5rem; border-radius: 9999px; white-space: nowrap;
    }
    .claim-location {
      margin: 0; font-size: 0.6875rem; color: rgba(110,231,183,0.75);
      display: flex; align-items: center; gap: 0.3rem; line-height: 1.4;
    }

    .claim-meta {
      display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 0.75rem;
    }
    .claim-meta__item {
      display: inline-flex; align-items: baseline; gap: 0.3rem;
      background: rgba(0,0,0,0.22); border: 1px solid rgba(16,185,129,0.12);
      border-radius: 0.375rem; padding: 0.2rem 0.5rem;
    }
    .claim-meta__label {
      font-size: 0.5625rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: rgba(212,175,55,0.7);
    }
    .claim-meta__value { font-size: 0.75rem; color: #ecfdf5; }
    .claim-meta__value--mono { font-family: ui-monospace, monospace; font-size: 0.6875rem; }

    .reject-field { margin-top: 0.25rem; }
    .reject-label {
      display: block; font-size: 0.6875rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: rgba(212,175,55,0.8); margin-bottom: 0.375rem;
    }
    .optional { font-weight: 400; text-transform: none; color: rgba(110,231,183,0.5); }
    .reject-input {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.28); border: 1px solid rgba(16,185,129,0.2);
      border-radius: 0.5rem; padding: 0.5rem 0.75rem;
      font-size: 0.8125rem; color: #f0fdf4; outline: none;
    }
    .reject-input::placeholder { color: rgba(110,231,183,0.35); }
    .reject-input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }

    .claim-card__actions {
      display: flex; flex-direction: column; gap: 0.375rem; flex-shrink: 0;
    }
    .btn-approve, .btn-reject, .btn-view {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
      font-size: 0.6875rem; font-weight: 700; border-radius: 0.375rem;
      padding: 0.5rem 0.75rem; cursor: pointer; text-decoration: none;
      border: 1px solid; white-space: nowrap; transition: background 0.2s, opacity 0.2s;
    }
    .btn-approve {
      color: #022c22; background: linear-gradient(180deg, #6ee7b7, #10b981);
      border-color: rgba(16,185,129,0.5);
    }
    .btn-approve:hover:not(:disabled) { filter: brightness(1.08); }
    .btn-reject {
      color: #fecaca; background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.35);
    }
    .btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
    .btn-view {
      color: #D4AF37; background: rgba(212,175,55,0.08);
      border-color: rgba(212,175,55,0.3);
    }
    .btn-view:hover { background: rgba(212,175,55,0.16); color: #fcd34d; }
    .btn-approve:disabled, .btn-reject:disabled { opacity: 0.55; cursor: not-allowed; }

    @media (max-width: 768px) {
      .claim-card { grid-template-columns: 1fr; }
      .claim-card__actions { flex-direction: row; flex-wrap: wrap; }
    }
  `]
})
export class SuperClaimsComponent implements OnInit {
  private platform = inject(PlatformService);

  pending = signal<Mosque[]>([]);
  loading = signal(true);
  processingId = signal<number | null>(null);
  rejectReason: Record<number, string> = {};

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.platform.getPendingClaims().subscribe({
      next: m => {
        this.pending.set(m);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  approve(id: number): void {
    this.processingId.set(id);
    this.platform.approveClaim(id).subscribe({
      next: () => { this.processingId.set(null); this.load(); },
      error: () => this.processingId.set(null),
    });
  }

  reject(id: number): void {
    this.processingId.set(id);
    this.platform.rejectClaim(id, this.rejectReason[id]).subscribe({
      next: () => {
        this.processingId.set(null);
        delete this.rejectReason[id];
        this.load();
      },
      error: () => this.processingId.set(null),
    });
  }
}
