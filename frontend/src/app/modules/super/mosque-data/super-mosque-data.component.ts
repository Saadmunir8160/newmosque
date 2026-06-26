import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../../core/services/admin.service';
import {
  MosqueDetailResponse,
  MosqueSnapshot,
  PlatformService,
  PlatformUser,
} from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';

interface AdminRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isOwner: boolean;
}

@Component({
  selector: 'app-super-mosque-data',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <div class="mosque-data-page">
      <app-page-header
        badge="Super Admin"
        title="Mosque Data"
        subtitle="View mosque details, ownership, and admin assignments" />

      <!-- Mosque selector -->
      <section class="panel picker-panel">
        <label class="field-label" for="mosque-search">Select mosque</label>
        <input
          id="mosque-search"
          class="field-input"
          type="search"
          [(ngModel)]="mosqueSearch"
          placeholder="Search by name, city, or status…"
          autocomplete="off" />
        <select
          id="mosque-select"
          class="field-input field-input--select"
          [(ngModel)]="selectedId"
          (ngModelChange)="onMosqueSelected($event)">
          <option [ngValue]="0">Choose a mosque…</option>
          <option *ngFor="let m of filteredMosques()" [ngValue]="m.id">
            {{ m.name }} · {{ m.city }} ({{ formatStatus(m.status) }})
          </option>
        </select>
        <p *ngIf="loadingMosques()" class="hint">Loading mosque list…</p>
        <p *ngIf="mosquesError()" class="alert alert--error">{{ mosquesError() }}</p>
      </section>

      <!-- Empty state -->
      <section *ngIf="!selectedId && !loadingMosques()" class="panel empty-panel">
        <span class="empty-panel__icon" aria-hidden="true">🕌</span>
        <h2 class="empty-panel__title">No mosque selected</h2>
        <p class="empty-panel__text">Choose a mosque from the dropdown to view details and manage admins.</p>
      </section>

      <!-- Loading -->
      <section *ngIf="selectedId && loadingDetail()" class="panel loading-panel">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading mosque data…</p>
      </section>

      <!-- Error -->
      <section *ngIf="selectedId && detailError() && !loadingDetail()" class="panel">
        <p class="alert alert--error">{{ detailError() }}</p>
        <button type="button" class="btn-secondary" (click)="reloadDetail()">Try again</button>
      </section>

      <ng-container *ngIf="detail() as d">
        <!-- Unclaimed / ownership banner -->
        <section *ngIf="showClaimBanner(d)" class="claim-banner" [class.claim-banner--warn]="isUnclaimed(d)">
          <div class="claim-banner__copy">
            <p class="claim-banner__title">
              {{ isUnclaimed(d) ? 'Unclaimed mosque' : 'Ownership pending' }}
            </p>
            <p class="claim-banner__text">
              <ng-container *ngIf="isUnclaimed(d)">
                This listing has no assigned owner. Assign an admin below and check “Set as mosque owner” to claim it.
              </ng-container>
              <ng-container *ngIf="!isUnclaimed(d) && !d.owner">
                Status is {{ formatStatus(d.mosque.status) }} but no owner is linked yet.
              </ng-container>
            </p>
          </div>
          <span class="status-pill" [ngClass]="statusClass(d.mosque.status)">{{ formatStatus(d.mosque.status) }}</span>
        </section>

        <!-- Details card -->
        <section class="panel detail-card">
          <div class="detail-card__head">
            <div>
              <p class="detail-card__eyebrow">Mosque details</p>
              <h2 class="detail-card__name">{{ d.mosque.name }}</h2>
              <p class="detail-card__slug">/{{ d.mosque.slug }}</p>
            </div>
            <span class="status-pill status-pill--lg" [ngClass]="statusClass(d.mosque.status)">
              {{ formatStatus(d.mosque.status) }}
            </span>
          </div>

          <div class="detail-grid">
            <div class="detail-cell">
              <span class="detail-cell__label">Location</span>
              <span class="detail-cell__value">{{ locationLine(d.mosque) }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">Created</span>
              <span class="detail-cell__value">{{ d.mosque.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">Member count</span>
              <span class="detail-cell__value">{{ d.userCount }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">Assigned admin</span>
              <span class="detail-cell__value">{{ primaryAdminLabel(d) }}</span>
            </div>
            <div class="detail-cell detail-cell--wide" *ngIf="d.owner">
              <span class="detail-cell__label">Owner</span>
              <span class="detail-cell__value">{{ d.owner.name }} · {{ d.owner.email }}</span>
            </div>
          </div>

          <div *ngIf="snapshot() as snap" class="stats-row">
            <div class="stat-chip"><span>Announcements</span><strong>{{ snap.announcementCount }}</strong></div>
            <div class="stat-chip"><span>Events</span><strong>{{ snap.eventCount }}</strong></div>
            <div class="stat-chip"><span>Students</span><strong>{{ snap.studentCount }}</strong></div>
            <div class="stat-chip"><span>Communities</span><strong>{{ snap.communityCount }}</strong></div>
          </div>

          <p *ngIf="d.mosque.description" class="detail-desc">{{ d.mosque.description }}</p>

          <div class="detail-actions">
            <a [routerLink]="['/dashboard/super/mosques', d.mosque.id]" class="link-btn">Full listing →</a>
            <a [routerLink]="['/dashboard/super/mosques', d.mosque.id, 'edit']" class="link-btn">Edit mosque →</a>
          </div>
        </section>

        <div class="two-col">
          <!-- Assign admin -->
          <section class="panel">
            <h3 class="panel-title">Assign admin</h3>
            <p class="panel-sub">Search and select a platform user to assign as mosque admin.</p>

            <label class="field-label" for="user-search">Search users</label>
            <input
              id="user-search"
              class="field-input"
              type="search"
              [(ngModel)]="userSearch"
              placeholder="Name, username, or email…"
              autocomplete="off" />

            <label class="field-label" for="user-select">User</label>
            <select id="user-select" class="field-input field-input--select" [(ngModel)]="assignUserId">
              <option value="">Select user…</option>
              <option *ngFor="let u of assignableUsers()" [value]="u.id">
                {{ u.fullName }} · {{ u.userName }} ({{ u.email }})
              </option>
            </select>

            <label class="check-row" *ngIf="isUnclaimed(d) || !d.owner">
              <input type="checkbox" [(ngModel)]="setAsOwner" />
              <span>Set as mosque owner (claims this listing)</span>
            </label>

            <div class="form-actions">
              <button
                type="button"
                class="btn-primary"
                (click)="assignAdmin()"
                [disabled]="assigning() || !assignUserId">
                {{ assigning() ? 'Assigning…' : 'Assign admin' }}
              </button>
            </div>

            <p *ngIf="msg()" class="alert" [class.alert--ok]="msgOk()" [class.alert--error]="!msgOk()">{{ msg() }}</p>
          </section>

          <!-- Current admins -->
          <section class="panel">
            <h3 class="panel-title">Current admins</h3>
            <p class="panel-sub">{{ adminRows().length }} assigned · {{ d.admins.length }} admin role(s)</p>

            <div *ngIf="!adminRows().length" class="empty-admins">
              <p>No owner or admins assigned yet.</p>
              <p class="hint">Use the form on the left to assign the first admin.</p>
            </div>

            <ul *ngIf="adminRows().length" class="admin-list">
              <li *ngFor="let row of adminRows()" class="admin-row">
                <div class="admin-row__avatar" aria-hidden="true">{{ initials(row.name) }}</div>
                <div class="admin-row__body">
                  <p class="admin-row__name">{{ row.name }}</p>
                  <p class="admin-row__email">{{ row.email }}</p>
                  <div class="role-badges">
                    <span *ngFor="let role of row.roles" class="role-badge" [class.role-badge--owner]="role === 'Mosque Owner'">
                      {{ role }}
                    </span>
                  </div>
                </div>
                <button
                  *ngIf="!row.isOwner"
                  type="button"
                  class="btn-remove"
                  [disabled]="removingId() === row.id"
                  (click)="removeAdmin(row.id)">
                  {{ removingId() === row.id ? 'Removing…' : 'Remove' }}
                </button>
              </li>
            </ul>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .mosque-data-page {
      --md-primary: #0F4C3A;
      --md-gold: #D4AF37;
      --md-text: #1F2937;
      --md-muted: #6B7280;
      --md-border: #E5E7EB;
      --md-bg: #F8FAF9;
      --md-surface: #FFFFFF;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 2rem;
    }

    .panel {
      background: var(--md-surface);
      border: 1px solid var(--md-border);
      border-radius: 14px;
      padding: 1.125rem 1.25rem;
      box-shadow: 0 1px 3px rgba(15, 76, 58, 0.06);
    }

    .picker-panel { display: flex; flex-direction: column; gap: 0.5rem; }
    .field-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--md-muted);
    }
    .field-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--md-border);
      border-radius: 10px;
      font-size: 0.875rem;
      color: var(--md-text);
      background: var(--md-bg);
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .field-input:focus {
      outline: none;
      border-color: rgba(15, 76, 58, 0.45);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.1);
    }
    .field-input--select { cursor: pointer; }
    .hint { margin: 0; font-size: 0.75rem; color: var(--md-muted); }

    .empty-panel, .loading-panel {
      text-align: center;
      padding: 2.5rem 1.25rem;
    }
    .empty-panel__icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    .empty-panel__title { margin: 0 0 0.35rem; font-size: 1.125rem; font-weight: 800; color: var(--md-text); }
    .empty-panel__text { margin: 0; font-size: 0.875rem; color: var(--md-muted); }

    .loading-panel p { margin: 0.75rem 0 0; color: var(--md-muted); font-size: 0.875rem; }
    .spinner {
      width: 2rem; height: 2rem; margin: 0 auto;
      border: 3px solid var(--md-border);
      border-top-color: var(--md-primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .claim-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
      border: 1px solid rgba(217, 119, 6, 0.3);
    }
    .claim-banner--warn {
      background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
      border-color: rgba(234, 88, 12, 0.35);
    }
    .claim-banner__title { margin: 0 0 0.25rem; font-size: 0.9375rem; font-weight: 800; color: #92400E; }
    .claim-banner__text { margin: 0; font-size: 0.8125rem; color: #B45309; line-height: 1.45; max-width: 40rem; }

    .detail-card__head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .detail-card__eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--md-primary);
    }
    .detail-card__name { margin: 0; font-size: 1.375rem; font-weight: 800; color: var(--md-text); line-height: 1.2; }
    .detail-card__slug { margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--md-muted); font-family: ui-monospace, monospace; }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.875rem;
    }
    @media (min-width: 768px) { .detail-grid { grid-template-columns: repeat(4, 1fr); } }
    .detail-cell { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-cell--wide { grid-column: 1 / -1; }
    .detail-cell__label {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--md-muted);
    }
    .detail-cell__value { font-size: 0.875rem; font-weight: 600; color: var(--md-text); line-height: 1.35; }

    .stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--md-border);
    }
    .stat-chip {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      background: var(--md-bg);
      border: 1px solid var(--md-border);
      min-width: 5.5rem;
    }
    .stat-chip span { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; color: var(--md-muted); }
    .stat-chip strong { font-size: 1.125rem; font-weight: 800; color: var(--md-primary); }

    .detail-desc {
      margin: 1rem 0 0;
      font-size: 0.8125rem;
      color: var(--md-muted);
      line-height: 1.55;
    }
    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .link-btn {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--md-primary);
      text-decoration: none;
    }
    .link-btn:hover { text-decoration: underline; }

    .two-col { display: grid; gap: 1rem; }
    @media (min-width: 960px) { .two-col { grid-template-columns: 1fr 1fr; align-items: start; } }

    .panel-title { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; color: var(--md-text); }
    .panel-sub { margin: 0 0 1rem; font-size: 0.8125rem; color: var(--md-muted); line-height: 1.4; }

    .check-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0.75rem 0;
      font-size: 0.8125rem;
      color: var(--md-text);
      cursor: pointer;
    }
    .check-row input { margin-top: 0.15rem; accent-color: var(--md-primary); }
    .form-actions { margin-top: 0.5rem; }

    .btn-primary {
      padding: 0.5625rem 1.125rem;
      border: none;
      border-radius: 10px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, var(--md-primary) 0%, #1D6B57 100%);
      cursor: pointer;
      transition: opacity 0.18s, transform 0.18s;
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

    .btn-secondary {
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--md-border);
      border-radius: 10px;
      background: var(--md-surface);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--md-text);
      cursor: pointer;
    }

    .alert {
      margin: 0.75rem 0 0;
      padding: 0.625rem 0.875rem;
      border-radius: 10px;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .alert--ok { background: #ECFDF5; color: #047857; border: 1px solid rgba(16, 185, 129, 0.3); }
    .alert--error { background: #FEF2F2; color: #B91C1C; border: 1px solid rgba(239, 68, 68, 0.25); }

    .empty-admins {
      padding: 1.5rem 1rem;
      text-align: center;
      border-radius: 12px;
      background: var(--md-bg);
      border: 1px dashed var(--md-border);
    }
    .empty-admins p { margin: 0; font-size: 0.875rem; color: var(--md-muted); }

    .admin-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.625rem; }
    .admin-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 12px;
      background: var(--md-bg);
      border: 1px solid var(--md-border);
    }
    .admin-row__avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--md-primary);
      background: rgba(15, 76, 58, 0.1);
    }
    .admin-row__name { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--md-text); }
    .admin-row__email { margin: 0.125rem 0 0; font-size: 0.75rem; color: var(--md-muted); }
    .role-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.375rem; }
    .role-badge {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 9999px;
      background: rgba(15, 76, 58, 0.08);
      color: var(--md-primary);
      border: 1px solid rgba(15, 76, 58, 0.15);
    }
    .role-badge--owner {
      background: rgba(212, 175, 55, 0.15);
      color: #92680A;
      border-color: rgba(212, 175, 55, 0.35);
    }
    .btn-remove {
      padding: 0.375rem 0.75rem;
      border-radius: 8px;
      border: 1px solid rgba(220, 38, 38, 0.3);
      background: #FEF2F2;
      color: #B91C1C;
      font-size: 0.6875rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-remove:disabled { opacity: 0.6; cursor: wait; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-pill--lg { font-size: 0.75rem; padding: 0.35rem 0.75rem; }
    .status--active { background: #ECFDF5; color: #047857; }
    .status--unclaimed { background: #FFF7ED; color: #C2410C; }
    .status--claimed { background: #EFF6FF; color: #1D4ED8; }
    .status--pending { background: #FFFBEB; color: #B45309; }
    .status--suspended { background: #FEF2F2; color: #B91C1C; }
    .status--archived { background: #F3F4F6; color: #6B7280; }
  `]
})
export class SuperMosqueDataComponent implements OnInit {
  private admin = inject(AdminService);
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  mosques = signal<Mosque[]>([]);
  users = signal<PlatformUser[]>([]);
  detail = signal<MosqueDetailResponse | null>(null);
  snapshot = signal<MosqueSnapshot | null>(null);

  loadingMosques = signal(true);
  loadingDetail = signal(false);
  assigning = signal(false);
  removingId = signal<string | null>(null);

  mosquesError = signal('');
  detailError = signal('');

  selectedId = 0;
  mosqueSearch = '';
  userSearch = '';
  assignUserId = '';
  setAsOwner = false;
  msg = signal('');
  msgOk = signal(true);

  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  filteredMosques = computed(() => {
    const q = this.mosqueSearch.trim().toLowerCase();
    const list = this.mosques();
    if (!q) return list;
    return list.filter(m => {
      const hay = `${m.name} ${m.city} ${m.postcode} ${m.status}`.toLowerCase();
      return hay.includes(q);
    });
  });

  adminRows = computed((): AdminRow[] => {
    const d = this.detail();
    if (!d) return [];
    const rows: AdminRow[] = [];
    if (d.owner) {
      rows.push({
        id: d.owner.id,
        name: d.owner.name,
        email: d.owner.email,
        roles: ['Mosque Owner'],
        isOwner: true,
      });
    }
    for (const a of d.admins) {
      const u = this.users().find(x => x.id === a.id);
      const roles = u?.roles.filter(r =>
        r === 'Mosque Admin' || r === 'Mosque Owner' || r === 'Prayer Times Editor'
      ) ?? ['Mosque Admin'];
      rows.push({ id: a.id, name: a.name, email: a.email, roles, isOwner: false });
    }
    return rows;
  });

  assignableUsers = computed(() => {
    const d = this.detail();
    const assigned = new Set<string>();
    if (d?.owner) assigned.add(d.owner.id);
    d?.admins.forEach(a => assigned.add(a.id));

    const q = this.userSearch.trim().toLowerCase();
    return this.users().filter(u => {
      if (assigned.has(u.id)) return false;
      if (!q) return true;
      const hay = `${u.fullName} ${u.userName} ${u.email}`.toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.admin.getAllMosques().subscribe({
      next: m => {
        this.mosques.set(m);
        this.loadingMosques.set(false);
        this.applyMosqueFromQuery();
      },
      error: () => {
        this.mosquesError.set('Could not load mosque list. Check that the API is running.');
        this.loadingMosques.set(false);
      },
    });
    this.platform.getUsers().subscribe({
      next: u => this.users.set(u),
      error: () => { /* optional — assign still validates on submit */ },
    });
    this.route.queryParamMap.subscribe(() => {
      if (!this.loadingMosques()) this.applyMosqueFromQuery();
    });
  }

  private applyMosqueFromQuery(): void {
    const raw = this.route.snapshot.queryParamMap.get('mosqueId');
    const id = raw ? Number(raw) : 0;
    if (!Number.isFinite(id) || id <= 0) return;
    if (!this.mosques().some(m => m.id === id)) return;
    if (this.selectedId === id && this.detail()) return;
    this.selectedId = id;
    this.onMosqueSelected(id);
  }

  onMosqueSelected(id: number): void {
    this.msg.set('');
    this.assignUserId = '';
    this.userSearch = '';
    this.setAsOwner = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mosqueId: id > 0 ? id : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (!id) {
      this.detail.set(null);
      this.snapshot.set(null);
      this.detailError.set('');
      return;
    }
    this.reloadDetail();
  }

  reloadDetail(): void {
    if (!this.selectedId) return;
    this.loadingDetail.set(true);
    this.detailError.set('');
    this.detail.set(null);
    this.snapshot.set(null);

    forkJoin({
      mosque: this.admin.getMosqueById(this.selectedId),
      snapshot: this.platform.getMosqueSnapshot(this.selectedId).pipe(
        catchError(() => of(null))
      ),
      users: this.platform.getUsers().pipe(catchError(() => of([] as PlatformUser[]))),
    }).subscribe({
      next: ({ mosque, snapshot, users }) => {
        const ownerUser = users.find(u => u.id === mosque.ownerId);
        const mosqueUsers = users.filter(u => u.homeMosqueId === mosque.id);
        const detail: MosqueDetailResponse = {
          mosque,
          owner: ownerUser
            ? { id: ownerUser.id, name: ownerUser.fullName || ownerUser.userName, email: ownerUser.email || ownerUser.userName }
            : null,
          admins: mosqueUsers
            .filter(u => u.id !== mosque.ownerId)
            .map(u => ({ id: u.id, name: u.fullName || u.userName, email: u.email || u.userName })),
          userCount: mosqueUsers.length,
          isDuplicate: false,
          audit: [],
        };
        this.detail.set(detail);
        if (snapshot) this.snapshot.set(snapshot);
        this.loadingDetail.set(false);
        const unclaimed = this.isUnclaimed(detail);
        this.setAsOwner = unclaimed && !detail.owner;
      },
      error: () => {
        this.detailError.set('Failed to load mosque details. Please try again.');
        this.loadingDetail.set(false);
      },
    });
  }

  assignAdmin(): void {
    if (!this.selectedId || !this.assignUserId) {
      this.msgOk.set(false);
      this.msg.set('Please select a user to assign.');
      return;
    }
    this.assigning.set(true);
    this.msg.set('');
    this.platform.assignMosqueAdmin(this.selectedId, this.assignUserId, this.setAsOwner).subscribe({
      next: () => {
        this.msgOk.set(true);
        this.msg.set('Admin assigned successfully.');
        this.assignUserId = '';
        this.userSearch = '';
        this.assigning.set(false);
        this.reloadDetail();
      },
      error: (err) => {
        this.msgOk.set(false);
        this.msg.set(err?.error?.message || 'Failed to assign admin. Please try again.');
        this.assigning.set(false);
      },
    });
  }

  removeAdmin(userId: string): void {
    if (!this.selectedId || !confirm('Remove this admin from the mosque?')) return;
    this.removingId.set(userId);
    this.msg.set('');
    this.platform.removeMosqueAdmin(this.selectedId, userId).subscribe({
      next: () => {
        this.msgOk.set(true);
        this.msg.set('Admin removed successfully.');
        this.removingId.set(null);
        this.reloadDetail();
      },
      error: (err) => {
        this.msgOk.set(false);
        this.msg.set(err?.error?.message || 'Failed to remove admin.');
        this.removingId.set(null);
      },
    });
  }

  isUnclaimed(d: MosqueDetailResponse): boolean {
    return d.mosque.status === 'Unclaimed' || d.mosque.status === 'PendingReview';
  }

  showClaimBanner(d: MosqueDetailResponse): boolean {
    return this.isUnclaimed(d) || !d.owner;
  }

  locationLine(m: Mosque): string {
    const parts = [m.address, m.city, m.postcode, m.country].filter(Boolean);
    return parts.join(', ') || '—';
  }

  primaryAdminLabel(d: MosqueDetailResponse): string {
    if (d.owner) return d.owner.name;
    if (d.admins.length) return d.admins[0].name;
    return '—';
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }
}
