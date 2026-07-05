import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuditLogEntry, PlatformClaimDetail, PlatformService } from '../../../core/services/platform.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-super-claim-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="scd-page">
      <nav class="scd-breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/dashboard/super">Dashboard</a>
        <span aria-hidden="true">›</span>
        <a routerLink="/dashboard/super/claims">Claim Requests</a>
        <span aria-hidden="true">›</span>
        <span>Claim Details</span>
      </nav>

      <header class="scd-header">
        <div>
          <p class="scd-eyebrow">Claim Details</p>
          <h1>{{ detail()?.claimReference || ('Claim #' + claimId) }}</h1>
          <p>Verify the applicant, review documents, and approve or reject ownership assignment.</p>
        </div>
        <a routerLink="/dashboard/super/claims" class="scd-btn scd-btn--ghost">Back to claims</a>
      </header>

      <p *ngIf="loading()" class="scd-muted">Loading claim details...</p>
      <p *ngIf="error()" class="scd-error" role="alert">{{ error() }}</p>

      <ng-container *ngIf="!loading() && detail() as d">
        <section class="scd-status">
          <div>
            <span class="scd-status__label">Claim status</span>
            <strong [attr.data-status]="d.status">{{ d.status }}</strong>
          </div>
          <div>
            <span class="scd-status__label">Mosque status</span>
            <strong>{{ d.mosqueStatus }}</strong>
          </div>
          <div>
            <span class="scd-status__label">Submitted</span>
            <strong>{{ d.submittedDate | date:'medium' }}</strong>
          </div>
        </section>

        <div class="scd-grid">
          <section class="scd-panel">
            <h2>Applicant</h2>
            <dl>
              <div><dt>Name</dt><dd>{{ d.applicant.fullName }}</dd></div>
              <div><dt>Email</dt><dd>{{ d.applicant.email || 'None supplied' }}</dd></div>
              <div><dt>Phone</dt><dd>{{ d.applicant.phone || 'None supplied' }}</dd></div>
              <div><dt>Role</dt><dd>{{ d.applicant.role || 'None supplied' }}</dd></div>
              <div><dt>User ID</dt><dd><code>{{ d.applicant.userId }}</code></dd></div>
            </dl>
          </section>

          <section class="scd-panel">
            <h2>Mosque</h2>
            <dl>
              <div><dt>Name</dt><dd>{{ d.mosqueName }}</dd></div>
              <div><dt>Address</dt><dd>{{ mosqueAddress(d) }}</dd></div>
              <div><dt>Slug</dt><dd><code>{{ d.slug }}</code></dd></div>
            </dl>
            <div class="scd-actions">
              <a *ngIf="d.slug" [routerLink]="['/mosque', d.slug]" class="scd-btn scd-btn--ghost">Public listing</a>
              <a [routerLink]="['/dashboard/super/mosques', d.mosqueId]" class="scd-btn scd-btn--ghost">Admin mosque record</a>
            </div>
          </section>
        </div>

        <section class="scd-panel">
          <h2>Verification Evidence</h2>
          <div *ngIf="documentLinks(d).length; else noDocs" class="scd-docs">
            <a *ngFor="let doc of documentLinks(d)" [href]="doc.url" target="_blank" rel="noopener noreferrer" class="scd-doc">
              <span>{{ doc.label }}</span>
              <strong>Open</strong>
            </a>
          </div>
          <ng-template #noDocs>
            <p class="scd-muted">No document was uploaded with this claim.</p>
          </ng-template>
          <p *ngIf="d.notes" class="scd-notes">{{ d.notes }}</p>
        </section>

        <section *ngIf="d.status.toLowerCase() === 'pending'" class="scd-decision">
          <div>
            <h2>Actions</h2>
            <p>Approving assigns the applicant as owner, adds owner/admin roles, activates the mosque, writes an audit log, and sends notification email.</p>
          </div>
          <div class="scd-decision__buttons">
            <button type="button" class="scd-btn scd-btn--danger" (click)="showReject.set(true)" [disabled]="acting()">Reject</button>
            <button type="button" class="scd-btn" (click)="approve()" [disabled]="acting()">{{ acting() ? 'Approving...' : 'Approve' }}</button>
          </div>
        </section>

        <section *ngIf="d.status.toLowerCase() !== 'pending'" class="scd-panel">
          <h2>Decision</h2>
          <p *ngIf="d.status.toLowerCase() === 'approved'" class="scd-ok">This claim has been approved and ownership assignment is complete.</p>
          <p *ngIf="d.status.toLowerCase() === 'rejected'" class="scd-rejected">Rejected: {{ d.rejectionReason || 'No reason recorded.' }}</p>
        </section>

        <section class="scd-panel">
          <h2>Audit Log</h2>
          <div *ngIf="audit().length; else noAudit" class="scd-audit">
            <article *ngFor="let log of audit()" class="scd-audit__row">
              <div>
                <strong>{{ log.action }}</strong>
                <p>{{ log.description }}</p>
              </div>
              <time>{{ log.createdAt | date:'medium' }}</time>
            </article>
          </div>
          <ng-template #noAudit>
            <p class="scd-muted">No claim-specific audit entries found yet.</p>
          </ng-template>
        </section>
      </ng-container>

      <div *ngIf="showReject()" class="scd-modal-backdrop" role="presentation">
        <div class="scd-modal" role="dialog" aria-labelledby="reject-title">
          <h2 id="reject-title">Reject Claim</h2>
          <label class="scd-field">
            <span>Reason</span>
            <textarea rows="4" [(ngModel)]="rejectReason" placeholder="Explain what the applicant needs to correct."></textarea>
          </label>
          <p *ngIf="rejectError()" class="scd-error">{{ rejectError() }}</p>
          <footer>
            <button type="button" class="scd-btn scd-btn--ghost" (click)="showReject.set(false)" [disabled]="acting()">Cancel</button>
            <button type="button" class="scd-btn scd-btn--danger" (click)="reject()" [disabled]="acting()">{{ acting() ? 'Rejecting...' : 'Reject' }}</button>
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scd-page { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1rem 2rem; }
    .scd-breadcrumb { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 1rem; color: #64748b; font-size: 0.75rem; }
    .scd-breadcrumb a { color: #1d6b57; font-weight: 700; text-decoration: none; }
    .scd-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
    .scd-eyebrow { margin: 0 0 0.25rem; color: #64748b; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    .scd-header h1 { margin: 0 0 0.35rem; color: #0f172a; font-size: 1.55rem; font-weight: 850; }
    .scd-header p { margin: 0; color: #64748b; font-size: 0.875rem; line-height: 1.5; }
    .scd-status { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .scd-status div, .scd-panel, .scd-decision { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .scd-status div { padding: 0.85rem 1rem; }
    .scd-status__label { display: block; margin-bottom: 0.25rem; color: #64748b; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    .scd-status strong { color: #0f172a; font-size: 0.95rem; }
    .scd-status strong[data-status="Pending"] { color: #92400e; }
    .scd-status strong[data-status="Approved"] { color: #166534; }
    .scd-status strong[data-status="Rejected"] { color: #991b1b; }
    .scd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .scd-panel { padding: 1rem; margin-bottom: 1rem; }
    .scd-panel h2, .scd-decision h2 { margin: 0 0 0.75rem; color: #0f172a; font-size: 1rem; font-weight: 850; }
    .scd-panel dl { display: grid; gap: 0.6rem; margin: 0; }
    .scd-panel dl div { display: grid; grid-template-columns: 8rem 1fr; gap: 0.5rem; }
    .scd-panel dt { color: #64748b; font-size: 0.8125rem; font-weight: 700; }
    .scd-panel dd { margin: 0; color: #0f172a; font-size: 0.8125rem; font-weight: 700; overflow-wrap: anywhere; }
    .scd-actions, .scd-decision__buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
    .scd-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.35rem; padding: 0.55rem 1rem; border-radius: 8px; border: none; background: #1d6b57; color: #fff; font-size: 0.8125rem; font-weight: 800; text-decoration: none; cursor: pointer; }
    .scd-btn--ghost { background: #fff; color: #334155; border: 1px solid #cbd5e1; }
    .scd-btn--danger { background: #dc2626; color: #fff; }
    .scd-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .scd-docs { display: grid; gap: 0.5rem; }
    .scd-doc { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 0.9rem; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; text-decoration: none; background: #f8fafc; }
    .scd-doc strong { color: #1d6b57; }
    .scd-notes { margin: 0.85rem 0 0; padding: 0.85rem; border-radius: 8px; background: #f8fafc; color: #334155; font-size: 0.875rem; line-height: 1.55; white-space: pre-wrap; }
    .scd-audit { display: grid; gap: 0.65rem; }
    .scd-audit__row { display: grid; grid-template-columns: 1fr auto; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; }
    .scd-audit__row:last-child { border-bottom: none; }
    .scd-audit__row strong { color: #0f172a; font-size: 0.8125rem; }
    .scd-audit__row p { margin: 0.2rem 0 0; color: #475569; font-size: 0.8125rem; line-height: 1.45; }
    .scd-audit__row time { color: #64748b; font-size: 0.75rem; white-space: nowrap; }
    .scd-decision { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 1rem; }
    .scd-decision p, .scd-muted { margin: 0; color: #64748b; font-size: 0.875rem; line-height: 1.5; }
    .scd-error { color: #b91c1c; font-size: 0.875rem; font-weight: 700; }
    .scd-ok { margin: 0; color: #166534; font-weight: 700; }
    .scd-rejected { margin: 0; color: #991b1b; font-weight: 700; }
    .scd-modal-backdrop { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, 0.55); }
    .scd-modal { width: min(100%, 440px); padding: 1rem; border-radius: 8px; background: #fff; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18); }
    .scd-field { display: grid; gap: 0.35rem; color: #334155; font-size: 0.8125rem; font-weight: 800; }
    .scd-field textarea { width: 100%; box-sizing: border-box; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; resize: vertical; }
    .scd-modal footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.85rem; }
    @media (max-width: 760px) {
      .scd-header, .scd-decision { flex-direction: column; align-items: stretch; }
      .scd-status, .scd-grid { grid-template-columns: 1fr; }
      .scd-panel dl div { grid-template-columns: 1fr; }
      .scd-audit__row { grid-template-columns: 1fr; }
    }
  `],
})
export class SuperClaimDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platform = inject(PlatformService);

  claimId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  detail = signal<PlatformClaimDetail | null>(null);
  audit = signal<AuditLogEntry[]>([]);
  loading = signal(false);
  acting = signal(false);
  error = signal('');
  showReject = signal(false);
  rejectError = signal('');
  rejectReason = '';

  private apiOrigin = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

  ngOnInit(): void {
    if (!this.claimId) {
      void this.router.navigate(['/dashboard/super/claims']);
      return;
    }
    this.load();
    this.loadAudit();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getPlatformClaimDetail(this.claimId).subscribe({
      next: detail => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load claim details.');
        this.loading.set(false);
      },
    });
  }

  loadAudit(): void {
    this.platform.getAuditLogs(150).subscribe({
      next: logs => {
        const claimId = this.claimId;
        this.audit.set((logs ?? []).filter(log =>
          log.targetType === 'Claim' && log.targetId === claimId
          || log.description?.includes(`claim ${claimId}`)
          || log.description?.includes(`ClaimId=${claimId}`)
        ));
      },
      error: () => this.audit.set([]),
    });
  }

  approve(): void {
    if (!confirm('Approve this claim and activate the mosque?')) return;
    this.acting.set(true);
    this.platform.approvePlatformClaim(this.claimId).subscribe({
      next: () => {
        this.acting.set(false);
        this.load();
        this.loadAudit();
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Approval failed.');
        this.acting.set(false);
      },
    });
  }

  reject(): void {
    const reason = this.rejectReason.trim();
    if (!reason) {
      this.rejectError.set('Rejection reason is required.');
      return;
    }
    this.acting.set(true);
    this.rejectError.set('');
    this.platform.rejectPlatformClaim(this.claimId, reason).subscribe({
      next: () => {
        this.acting.set(false);
        this.showReject.set(false);
        this.rejectReason = '';
        this.load();
        this.loadAudit();
      },
      error: err => {
        this.rejectError.set(err?.error?.message ?? 'Rejection failed.');
        this.acting.set(false);
      },
    });
  }

  mosqueAddress(detail: PlatformClaimDetail): string {
    return [detail.mosqueAddress, detail.mosqueCity, detail.mosquePostcode, detail.mosqueCountry]
      .filter(Boolean)
      .join(', ') || 'None supplied';
  }

  documentLinks(detail: PlatformClaimDetail): { label: string; url: string }[] {
    const docs = detail.documents?.length
      ? detail.documents
      : detail.proofDocumentUrl
        ? [{ label: 'Proof of ownership', url: detail.proofDocumentUrl }]
        : [];
    return docs.map(d => ({ label: d.label || 'Document', url: this.documentUrl(d.url) }));
  }

  private documentUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
