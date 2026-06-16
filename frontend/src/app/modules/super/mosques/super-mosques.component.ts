import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlatformService, MosqueListing } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import {
  MOSQUE_STATUSES,
  formatMosqueStatus,
  statusClass,
} from '../../../core/utils/mosque-status.util';

@Component({
  selector: 'app-super-mosques',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Mosque listings"
      subtitle="Manage platform mosques — search, filter, review duplicates, and assign owners." />

    <app-card class="block mb-5">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="heading-section text-base mb-1">Add mosque listing</h3>
          <p class="text-sm text-emerald-300/80 m-0">New listings start in Pending Review until approved.</p>
        </div>
        <button type="button" class="toggle-btn" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Hide form' : 'Show form' }}
        </button>
      </div>

      <div *ngIf="showForm()" class="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="field-label">Mosque name</label>
          <input class="admin-input" placeholder="Masjid Al-Noor" [(ngModel)]="form.name" (blur)="autoSlug()">
        </div>
        <div>
          <label class="field-label">URL slug</label>
          <input class="admin-input" placeholder="masjid-al-noor-bradford" [(ngModel)]="form.slug">
        </div>
        <div>
          <label class="field-label">City</label>
          <input class="admin-input" [(ngModel)]="form.city">
        </div>
        <div>
          <label class="field-label">Postcode</label>
          <input class="admin-input" placeholder="BD1 1AA" [(ngModel)]="form.postcode">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Address</label>
          <input class="admin-input" [(ngModel)]="form.address">
        </div>
        <div>
          <label class="field-label">Phone</label>
          <input class="admin-input" [(ngModel)]="form.phone">
        </div>
        <div>
          <label class="field-label">Email</label>
          <input class="admin-input" type="email" [(ngModel)]="form.email">
        </div>
        <div>
          <label class="field-label">Website</label>
          <input class="admin-input" placeholder="https://" [(ngModel)]="form.website">
        </div>
        <div>
          <label class="field-label">Map location</label>
          <input class="admin-input" placeholder="Google Maps link or place name" [(ngModel)]="form.mapLocation">
        </div>
        <div>
          <label class="field-label">Latitude</label>
          <input class="admin-input" type="number" step="any" [(ngModel)]="form.latitude">
        </div>
        <div>
          <label class="field-label">Longitude</label>
          <input class="admin-input" type="number" step="any" [(ngModel)]="form.longitude">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Description</label>
          <textarea class="admin-input" rows="2" [(ngModel)]="form.description"></textarea>
        </div>
      </div>
      <button *ngIf="showForm()" type="button" class="admin-btn" (click)="seed()" [disabled]="saving()">
        {{ saving() ? 'Creating…' : 'Create listing' }}
      </button>
      <p *ngIf="msg()" class="text-sm mt-3" [class.text-emerald-300]="msgOk()" [class.text-red-300]="!msgOk()">{{ msg() }}</p>
    </app-card>

    <app-card class="block mb-4">
      <div class="toolbar">
        <input class="admin-input search-input" placeholder="Search name, city, postcode…"
          [(ngModel)]="search" (ngModelChange)="onFilterChange()">
        <select class="admin-input filter-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">All statuses</option>
          <option *ngFor="let s of statuses" [value]="s">{{ formatStatus(s) }}</option>
        </select>
        <label class="dup-toggle">
          <input type="checkbox" [(ngModel)]="duplicatesOnly" (ngModelChange)="load()">
          Duplicates only
        </label>
      </div>

      <div class="bulk-bar" *ngIf="selectedIds().size">
        <span>{{ selectedIds().size }} selected</span>
        <select class="admin-input bulk-select" [(ngModel)]="bulkStatus">
          <option value="">Bulk status…</option>
          <option *ngFor="let s of statuses" [value]="s">{{ formatStatus(s) }}</option>
        </select>
        <button type="button" class="admin-btn admin-btn--sm" (click)="applyBulk()" [disabled]="!bulkStatus || bulkLoading()">
          Apply
        </button>
        <button type="button" class="link-btn" (click)="clearSelection()">Clear</button>
      </div>

      <p class="list-meta">
        {{ listings().length }} listing(s)
        <span *ngIf="duplicateCount()"> · {{ duplicateCount() }} possible duplicate(s)</span>
      </p>
    </app-card>

    <div class="space-y-3">
      <app-card *ngFor="let m of listings()" class="mosque-card">
        <div class="card-top">
          <label class="check-wrap">
            <input type="checkbox" [checked]="selectedIds().has(m.id)" (change)="toggleSelect(m.id)">
          </label>
          <div class="card-main">
            <div class="card-head">
              <div>
                <h4 class="card-title">
                  <a [routerLink]="['/dashboard/super/mosques', m.id]">{{ m.name }}</a>
                  <span *ngIf="m.isDuplicate" class="dup-badge" [title]="m.duplicateReason || 'Possible duplicate'">⚠ Dup</span>
                </h4>
                <p class="card-location">{{ m.city }} · {{ m.postcode || '—' }} · {{ m.address }}</p>
              </div>
              <span class="status-pill" [ngClass]="statusClass(m.status)">{{ formatStatus(m.status) }}</span>
            </div>

            <div class="card-stats">
              <div class="stat">
                <span class="stat-label">Owner</span>
                <span class="stat-value">{{ m.ownerName || '—' }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Admins</span>
                <span class="stat-value">{{ m.adminCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Users</span>
                <span class="stat-value">{{ m.userCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Created</span>
                <span class="stat-value">{{ m.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>

            <div class="card-actions">
              <a [routerLink]="['/dashboard/super/mosques', m.id]" class="action-link">View</a>
              <a [routerLink]="['/dashboard/super/mosques', m.id, 'edit']" class="action-link">Edit</a>
              <a *ngIf="m.status === 'Claimed'" routerLink="/dashboard/super/claims" class="action-link action-link--warn">Review claim</a>
            </div>
          </div>
        </div>
      </app-card>

      <p *ngIf="!listings().length && !loading()" class="admin-empty-desc">No mosques match your filters.</p>
      <p *ngIf="loading()" class="admin-empty-desc">Loading listings…</p>
    </div>
  `,
  styles: [`
    .field-label { display: block; font-size: 0.75rem; color: #6ee7b7; margin-bottom: 0.25rem; }
    .toggle-btn {
      font-size: 0.75rem; font-weight: 600; color: #fcd34d; background: transparent;
      border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 0.5rem; padding: 0.375rem 0.75rem; cursor: pointer;
    }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; }
    .search-input { flex: 1; min-width: 12rem; }
    .filter-select { width: auto; min-width: 10rem; }
    .dup-toggle { font-size: 0.8125rem; color: #a7f3d0; display: flex; align-items: center; gap: 0.375rem; }
    .bulk-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
      padding: 0.625rem 0.75rem; background: rgba(245, 158, 11, 0.08); border-radius: 0.5rem; margin-bottom: 0.75rem;
      font-size: 0.8125rem; color: #fcd34d;
    }
    .bulk-select { width: auto; min-width: 9rem; padding: 0.375rem 0.5rem; }
    .admin-btn--sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
    .link-btn { background: none; border: none; color: #6ee7b7; cursor: pointer; font-size: 0.75rem; }
    .list-meta { margin: 0; font-size: 0.75rem; color: #6ee7b7; opacity: 0.85; }

    .mosque-card { padding: 0; overflow: hidden; }
    .card-top { display: flex; gap: 0.75rem; padding: 1rem; }
    .check-wrap { padding-top: 0.25rem; }
    .card-main { flex: 1; min-width: 0; }
    .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .card-title { margin: 0; font-size: 0.9375rem; font-weight: 600; }
    .card-title a { color: #fff; text-decoration: none; }
    .card-title a:hover { color: #fcd34d; }
    .dup-badge {
      margin-left: 0.5rem; font-size: 0.625rem; font-weight: 700; color: #fbbf24;
      background: rgba(245, 158, 11, 0.15); padding: 0.125rem 0.375rem; border-radius: 9999px;
    }
    .card-location { margin: 0.25rem 0 0; font-size: 0.75rem; color: #6ee7b7; }
    .status-pill {
      font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      padding: 0.25rem 0.5rem; border-radius: 9999px; border: 1px solid; white-space: nowrap;
    }
    .status--active { color: #6ee7b7; border-color: #047857; background: rgba(16, 185, 129, 0.1); }
    .status--claimed { color: #fcd34d; border-color: rgba(245, 158, 11, 0.45); background: rgba(120, 53, 15, 0.2); }
    .status--unclaimed { color: #94a3b8; border-color: #475569; }
    .status--pending { color: #93c5fd; border-color: rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.1); }
    .status--suspended { color: #fca5a5; border-color: rgba(239, 68, 68, 0.45); background: rgba(127, 29, 29, 0.2); }
    .status--archived { color: #a8a29e; border-color: #57534e; background: rgba(41, 37, 36, 0.3); }

    .card-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
    @media (min-width: 640px) { .card-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .stat-label { display: block; font-size: 0.625rem; color: #6ee7b7; text-transform: uppercase; }
    .stat-value { display: block; font-size: 0.8125rem; color: #ecfdf5; font-weight: 500; margin-top: 0.125rem; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .action-link { font-size: 0.75rem; font-weight: 600; color: #fbbf24; text-decoration: none; }
    .action-link:hover { text-decoration: underline; }
    .action-link--warn { color: #fca5a5; }
  `]
})
export class SuperMosquesComponent implements OnInit {
  private platform = inject(PlatformService);

  readonly statuses = MOSQUE_STATUSES;
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  listings = signal<MosqueListing[]>([]);
  duplicateCount = signal(0);
  selectedIds = signal<Set<number>>(new Set());
  loading = signal(false);
  saving = signal(false);
  bulkLoading = signal(false);
  showForm = signal(true);
  msg = signal('');
  msgOk = signal(true);

  search = '';
  statusFilter = '';
  duplicatesOnly = false;
  bulkStatus = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  form = {
    name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '',
    phone: '', email: '', website: '', mapLocation: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  };

  ngOnInit(): void { this.load(); }

  onFilterChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  load(): void {
    this.loading.set(true);
    this.platform.getMosqueListings({
      q: this.search.trim() || undefined,
      status: this.statusFilter || undefined,
      duplicatesOnly: this.duplicatesOnly,
    }).subscribe({
      next: res => {
        this.listings.set(res.items);
        this.duplicateCount.set(res.duplicateCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  autoSlug(): void {
    if (this.form.slug || !this.form.name) return;
    this.form.slug = this.form.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  seed(): void {
    if (!this.form.name || !this.form.slug) {
      this.msg.set('Name and slug are required.');
      this.msgOk.set(false);
      return;
    }
    this.saving.set(true);
    this.platform.seedMosque({
      ...this.form,
      country: 'United Kingdom',
      timezone: 'Europe/London',
      status: 'PendingReview',
    }).subscribe({
      next: () => {
        this.msg.set('Listing created — pending review.');
        this.msgOk.set(true);
        this.form = {
          name: '', slug: '', city: 'Bradford', postcode: '', address: '', description: '',
          phone: '', email: '', website: '', mapLocation: '',
          latitude: undefined, longitude: undefined,
        };
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.msg.set('Could not create listing — check the slug is unique.');
        this.msgOk.set(false);
        this.saving.set(false);
      },
    });
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  applyBulk(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || !this.bulkStatus) return;
    this.bulkLoading.set(true);
    this.platform.bulkMosqueStatus(ids, this.bulkStatus).subscribe({
      next: () => {
        this.bulkLoading.set(false);
        this.clearSelection();
        this.bulkStatus = '';
        this.load();
      },
      error: () => this.bulkLoading.set(false),
    });
  }
}
