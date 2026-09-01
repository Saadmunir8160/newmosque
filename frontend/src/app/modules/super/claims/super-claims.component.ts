import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, PendingOwnershipClaim } from '../../../core/services/platform.service';
import { SuperClaimReviewDrawerComponent } from './super-claim-review-drawer.component';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

type StatusFilter = 'Pending' | 'All';
type SortKey = 'submittedAt' | 'mosqueName' | 'claimantName' | 'claimReference';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-super-claims',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SuperClaimReviewDrawerComponent, SuperAdminPageHeaderComponent],
  templateUrl: './super-claims.component.html',
  styleUrls: ['./super-claims.component.css'],
})
export class SuperClaimsComponent implements OnInit {
  private platform = inject(PlatformService);

  allClaims = signal<PendingOwnershipClaim[]>([]);
  loading = signal(false);
  error = signal('');
  toast = signal('');
  toastOk = signal(true);

  search = signal('');
  statusFilter = signal<StatusFilter>('Pending');
  sortKey = signal<SortKey>('submittedAt');
  sortDir = signal<SortDir>('desc');
  page = signal(1);
  readonly pageSize = 10;

  selectedClaimId = signal(0);
  drawerOpen = signal(false);

  filteredClaims = computed(() => {
    let list = [...this.allClaims()];
    const q = this.search().trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.claimReference ?? '').toLowerCase().includes(q)
        || c.mosqueName.toLowerCase().includes(q)
        || c.claimantName.toLowerCase().includes(q)
        || (c.position ?? '').toLowerCase().includes(q)
        || (c.claimantEmail ?? '').toLowerCase().includes(q),
      );
    }

    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let av = '';
      let bv = '';
      if (key === 'submittedAt') {
        av = a.submittedAt;
        bv = b.submittedAt;
      } else if (key === 'mosqueName') {
        av = a.mosqueName;
        bv = b.mosqueName;
      } else if (key === 'claimantName') {
        av = a.claimantName;
        bv = b.claimantName;
      } else {
        av = a.claimReference ?? '';
        bv = b.claimReference ?? '';
      }
      return av.localeCompare(bv) * dir;
    });

    return list;
  });

  pagedClaims = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredClaims().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClaims().length / this.pageSize)),
  );

  pendingCount = computed(() =>
    this.allClaims().filter(c => (c.status ?? 'Pending').toLowerCase() === 'pending').length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const status = this.statusFilter();
    const req = status === 'Pending'
      ? this.platform.getPlatformPendingClaims()
      : this.platform.getPendingClaims('All');

    req.subscribe({
      next: (res) => {
        this.allClaims.set(res.items ?? []);
        this.loading.set(false);
        this.page.set(1);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load claims.');
        this.loading.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onStatusFilterChange(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.load();
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'submittedAt' ? 'desc' : 'asc');
    }
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ↑' : ' ↓';
  }

  goPage(p: number): void {
    const clamped = Math.min(Math.max(1, p), this.totalPages());
    this.page.set(clamped);
  }

  openClaim(claimId: number): void {
    this.selectedClaimId.set(claimId);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedClaimId.set(0);
  }

  onClaimApproved(): void {
    this.showToast('Claim approved. Mosque is CLAIMED — activate to make it public.', true);
    this.load();
  }

  onClaimActivated(): void {
    this.closeDrawer();
    this.showToast('Mosque activated. Public profile is now live.', true);
    this.load();
  }

  onClaimRejected(): void {
    this.closeDrawer();
    this.showToast('Claim rejected.', true);
    this.load();
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const d = new Date(value);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return 'Today';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  statusBadge(status?: string): string {
    const s = (status ?? 'Pending').toLowerCase();
    if (s === 'approved') return 'sc-badge sc-badge--ok';
    if (s === 'rejected') return 'sc-badge sc-badge--err';
    return 'sc-badge sc-badge--pending';
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 4000);
  }
}
