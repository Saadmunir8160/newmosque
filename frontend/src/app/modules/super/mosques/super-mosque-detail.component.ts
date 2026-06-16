import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PlatformService, MosqueDetailResponse } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';

const ACTION_LABELS: Record<string, string> = {
  SEED_MOSQUE: 'Listing created',
  UPDATE_MOSQUE: 'Listing updated',
  APPROVE_CLAIM: 'Claim approved',
  REJECT_CLAIM: 'Claim rejected',
  ASSIGN_MOSQUE_ADMIN: 'Admin assigned',
  BULK_MOSQUE_STATUS: 'Bulk status change',
};

@Component({
  selector: 'app-super-mosque-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      [title]="detail()?.mosque?.name || 'Mosque details'"
      subtitle="Listing overview, assignments, and audit history." />

    <div class="actions-row">
      <a routerLink="/dashboard/super/mosques" class="back-link">← All listings</a>
      <a *ngIf="detail()?.mosque as m" [routerLink]="['/dashboard/super/mosques', m.id, 'edit']" class="edit-btn">Edit listing</a>
    </div>

    <div *ngIf="loading()" class="loading-msg">Loading…</div>

    <ng-container *ngIf="detail() as d">
      <div *ngIf="d.isDuplicate" class="dup-alert">
        ⚠ Possible duplicate: {{ d.duplicateReason }}
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-4">
        <app-card>
          <p class="stat-label">Status</p>
          <span class="status-pill" [ngClass]="statusClass(d.mosque.status)">{{ formatStatus(d.mosque.status) }}</span>
        </app-card>
        <app-card>
          <p class="stat-label">Users</p>
          <p class="stat-value">{{ d.userCount }}</p>
        </app-card>
        <app-card>
          <p class="stat-label">Created</p>
          <p class="stat-value">{{ d.mosque.createdAt | date:'medium' }}</p>
        </app-card>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 mb-4">
        <app-card>
          <h3 class="section-title">Location & contact</h3>
          <dl class="detail-list">
            <div><dt>Address</dt><dd>{{ d.mosque.address }}</dd></div>
            <div><dt>City</dt><dd>{{ d.mosque.city }} {{ d.mosque.postcode }}</dd></div>
            <div><dt>Phone</dt><dd>{{ d.mosque.phone || '—' }}</dd></div>
            <div><dt>Email</dt><dd>{{ d.mosque.email || '—' }}</dd></div>
            <div><dt>Website</dt><dd>
              <a *ngIf="d.mosque.website" [href]="d.mosque.website" target="_blank" rel="noopener" class="ext-link">{{ d.mosque.website }}</a>
              <span *ngIf="!d.mosque.website">—</span>
            </dd></div>
            <div><dt>Map</dt><dd>{{ d.mosque.mapLocation || '—' }}</dd></div>
            <div *ngIf="d.mosque.latitude != null"><dt>Coordinates</dt><dd>{{ d.mosque.latitude }}, {{ d.mosque.longitude }}</dd></div>
          </dl>
          <p *ngIf="d.mosque.description" class="desc">{{ d.mosque.description }}</p>
        </app-card>

        <app-card>
          <h3 class="section-title">Assignments</h3>
          <div class="assign-block">
            <p class="assign-label">Owner</p>
            <p *ngIf="d.owner as o" class="assign-value">{{ o.name }} · {{ o.email }}</p>
            <p *ngIf="!d.owner" class="assign-empty">No owner assigned</p>
          </div>
          <div class="assign-block">
            <p class="assign-label">Mosque admins ({{ d.admins.length }})</p>
            <ul *ngIf="d.admins.length" class="person-list">
              <li *ngFor="let a of d.admins">{{ a.name }} · {{ a.email }}</li>
            </ul>
            <p *ngIf="!d.admins.length" class="assign-empty">No admins assigned</p>
          </div>
          <p class="slug-hint">Slug: {{ d.mosque.slug }}</p>
        </app-card>
      </div>

      <app-card>
        <h3 class="section-title">Audit history</h3>
        <p *ngIf="!d.audit.length" class="assign-empty">No audit entries for this mosque yet.</p>
        <div *ngFor="let log of d.audit" class="audit-row">
          <div>
            <span class="audit-action">{{ actionLabel(log.action) }}</span>
            <p class="audit-desc">{{ log.description }}</p>
          </div>
          <time class="audit-time">{{ log.createdAt | date:'medium' }}</time>
        </div>
      </app-card>
    </ng-container>
  `,
  styles: [`
    .actions-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 0.75rem; }
    .back-link { font-size: 0.8125rem; color: #6ee7b7; text-decoration: none; }
    .back-link:hover { color: #fcd34d; }
    .edit-btn {
      font-size: 0.8125rem; font-weight: 600; color: #022c22; background: #f59e0b;
      padding: 0.5rem 1rem; border-radius: 0.5rem; text-decoration: none;
    }
    .loading-msg { color: #6ee7b7; font-size: 0.875rem; }
    .dup-alert {
      padding: 0.75rem 1rem; margin-bottom: 1rem; border-radius: 0.5rem;
      background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fcd34d; font-size: 0.8125rem;
    }
    .stat-label { margin: 0; font-size: 0.6875rem; color: #6ee7b7; text-transform: uppercase; }
    .stat-value { margin: 0.25rem 0 0; font-size: 1.125rem; font-weight: 700; color: #fff; }
    .status-pill {
      display: inline-block; margin-top: 0.375rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; padding: 0.25rem 0.5rem; border-radius: 9999px; border: 1px solid;
    }
    .status--active { color: #6ee7b7; border-color: #047857; }
    .status--claimed { color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); }
    .status--unclaimed { color: #94a3b8; border-color: #475569; }
    .status--pending { color: #93c5fd; border-color: rgba(59, 130, 246, 0.45); }
    .status--suspended { color: #fca5a5; border-color: rgba(239, 68, 68, 0.45); }
    .status--archived { color: #a8a29e; border-color: #57534e; }
    .section-title { margin: 0 0 1rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .detail-list { margin: 0; display: flex; flex-direction: column; gap: 0.625rem; }
    .detail-list div { display: grid; grid-template-columns: 6rem 1fr; gap: 0.5rem; font-size: 0.8125rem; }
    .detail-list dt { margin: 0; color: #6ee7b7; }
    .detail-list dd { margin: 0; color: #ecfdf5; }
    .ext-link { color: #fbbf24; }
    .desc { margin: 1rem 0 0; font-size: 0.8125rem; color: #a7f3d0; line-height: 1.5; }
    .assign-block { margin-bottom: 1rem; }
    .assign-label { margin: 0; font-size: 0.6875rem; color: #6ee7b7; text-transform: uppercase; }
    .assign-value { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #fff; }
    .assign-empty { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #6ee7b7; opacity: 0.75; }
    .person-list { margin: 0.375rem 0 0; padding-left: 1rem; font-size: 0.8125rem; color: #d1fae5; }
    .slug-hint { margin: 1rem 0 0; font-size: 0.75rem; color: #6ee7b7; opacity: 0.7; }
    .audit-row {
      display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 0;
      border-bottom: 1px solid rgba(6, 95, 70, 0.5); font-size: 0.8125rem;
    }
    .audit-row:last-child { border-bottom: none; }
    .audit-action { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; color: #fbbf24; }
    .audit-desc { margin: 0.25rem 0 0; color: #ecfdf5; }
    .audit-time { color: #6ee7b7; font-size: 0.75rem; white-space: nowrap; }
  `]
})
export class SuperMosqueDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platform = inject(PlatformService);

  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;
  readonly actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, ' ').toLowerCase();

  detail = signal<MosqueDetailResponse | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.platform.getMosqueDetail(id).subscribe({
      next: d => { this.detail.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
