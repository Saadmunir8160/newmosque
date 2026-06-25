import { Component, OnInit, inject, signal } from '@angular/core';
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

  searchQ = '';
  statusFilter = '';
  missingOwnerOnly = false;
  sortBy = '';
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  viewMode = signal<'grid' | 'list'>(this.readStoredViewMode());

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
  }

  onMosqueCreated(event: MosqueCreatedEvent): void {
    this.showToast('Mosque created successfully.', true);
    if (event.uploadWarning) {
      setTimeout(() => this.showToast(event.uploadWarning!, false), 400);
    }
    this.load();
  }

  activate(id: number): void {
    this.platform.activateMosque(id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Activation failed.'),
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
