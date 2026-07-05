import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, MosqueListing } from '../../../core/services/platform.service';
import { formatMosqueStatus, isMosquePubliclyVisible, statusClass } from '../../../core/utils/mosque-status.util';
import { slugifyMosqueName } from '../../../core/utils/mosque-slug.util';
import { AddMosqueDrawerComponent, MosqueCreatedEvent } from './add-mosque-drawer.component';

@Component({
  selector: 'app-super-mosques',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AddMosqueDrawerComponent],
  templateUrl: './super-mosques.component.html',
  styleUrls: ['./mosque-profile.shared.css', './super-mosques.component.css'],
})
export class SuperMosquesComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  listings = signal<MosqueListing[]>([]);
  summary = signal<{ unclaimed: number; claimPending: number; claimed: number; active: number; pendingReview: number } | null>(null);
  loading = signal(false);
  error = signal('');
  showSeed = signal(false);
  toast = signal('');
  toastOk = signal(true);
  page = signal(1);
  deleting = signal(false);
  deleteTarget = signal<MosqueListing | null>(null);

  searchQ = '';
  statusFilter = '';
  missingOwnerOnly = false;
  sortBy = '';
  readonly pageSize = 12;
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  viewMode = signal<'grid' | 'list'>(this.readStoredViewMode());

  totalPages = computed(() => Math.max(1, Math.ceil(this.listings().length / this.pageSize)));
  pageStart = computed(() => this.listings().length ? ((this.page() - 1) * this.pageSize) + 1 : 0);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.listings().length));
  pagedListings = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.listings().slice(start, start + this.pageSize);
  });

  private readStoredViewMode(): 'grid' | 'list' {
    try {
      const stored = localStorage.getItem('super-mosques-view');
      return stored === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    try {
      localStorage.setItem('super-mosques-view', mode);
    } catch { /* ignore */ }
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data['openAddMosque']) {
        this.showSeed.set(true);
      }
    });

    this.route.queryParams.subscribe(p => {
      this.statusFilter = p['status'] ?? '';
      this.searchQ = p['q'] ?? '';
      this.missingOwnerOnly = p['missingOwner'] === 'true';
      this.sortBy = p['sort'] ?? '';
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getMosqueListings({
      q: this.searchQ || undefined,
      status: this.statusFilter || undefined,
      missingOwner: this.missingOwnerOnly || undefined,
      sort: this.sortBy || undefined,
    }).subscribe({
      next: (res) => {
        this.listings.set(res.items ?? []);
        this.page.set(1);
        const s = res.summary as Record<string, number> | undefined;
        this.summary.set(s ? {
          unclaimed: s['unclaimed'] ?? 0,
          claimPending: s['claimPending'] ?? 0,
          claimed: s['claimed'] ?? 0,
          active: s['active'] ?? 0,
          pendingReview: s['pendingReview'] ?? 0,
        } : null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load listings.');
        this.loading.set(false);
      },
    });
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  mosqueInitial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '🕌';
  }

  applyFilters(): void {
    this.page.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.statusFilter || null,
        q: this.searchQ || null,
        missingOwner: this.missingOwnerOnly ? 'true' : null,
        sort: this.sortBy || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  openSeed(): void {
    this.showSeed.set(true);
  }

  closeSeed(): void {
    this.showSeed.set(false);
    if (this.route.snapshot.data['openAddMosque']) {
      void this.router.navigate(['/dashboard/super/mosques'], {
        queryParams: this.route.snapshot.queryParams,
      });
    }
  }

  onMosqueCreated(event: MosqueCreatedEvent): void {
    this.showToast('Mosque created successfully.', true);
    if (event.inviteMessage) {
      setTimeout(() => this.showToast(event.inviteMessage!, !event.inviteLink), 600);
    }
    if (event.inviteLink) {
      setTimeout(() => {
        this.showToast(`Owner invite link: ${event.inviteLink}`, true);
        void navigator.clipboard?.writeText(event.inviteLink!);
      }, 1200);
    }
    if (event.uploadWarning) {
      setTimeout(() => this.showToast(event.uploadWarning!, false), event.inviteLink ? 2400 : 400);
    }
    this.load();
  }

  activate(id: number): void {
    this.platform.activateMosque(id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Activation failed.'),
    });
  }

  setPage(page: number): void {
    const next = Math.max(1, Math.min(page, this.totalPages()));
    this.page.set(next);
  }

  openDeleteDialog(mosque: MosqueListing): void {
    this.deleteTarget.set(mosque);
  }

  closeDeleteDialog(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const mosque = this.deleteTarget();
    if (!mosque || this.deleting()) return;

    this.deleting.set(true);
    this.platform.deleteMosque(mosque.id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.showToast(res.message || 'Mosque deleted.', true);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.showToast(err?.error?.message ?? 'Delete failed.', false);
      },
    });
  }

  isPublicVisible = isMosquePubliclyVisible;

  resolvePublicSlug(m: MosqueListing): string {
    const slug = m.slug?.trim();
    if (slug) return slug;
    return slugifyMosqueName(m.name ?? '') || `mosque-${m.id}`;
  }

  publicPreviewQuery(m: MosqueListing): Record<string, string> {
    return { preview: 'admin', mosqueId: String(m.id) };
  }

  publicLinkTitle(status: string): string {
    return isMosquePubliclyVisible(status)
      ? 'Open public profile (super admin preview)'
      : 'Super admin preview (not publicly visible yet)';
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
