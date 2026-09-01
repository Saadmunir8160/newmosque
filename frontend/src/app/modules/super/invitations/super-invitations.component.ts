import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService, MosqueInvitationItem } from '../../../core/services/platform.service';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

type StatusFilter = 'Pending' | 'All';

@Component({
  selector: 'app-super-invitations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-invitations.component.html',
  styleUrls: ['../claims/super-claims.component.css', './super-invitations.component.css'],
})
export class SuperInvitationsComponent implements OnInit {
  private platform = inject(PlatformService);

  allItems = signal<MosqueInvitationItem[]>([]);
  loading = signal(false);
  error = signal('');
  toast = signal('');
  toastOk = signal(true);
  search = signal('');
  statusFilter = signal<StatusFilter>('Pending');
  page = signal(1);
  readonly pageSize = 10;
  readonly formatStatus = formatMosqueStatus;
  readonly statusClass = statusClass;

  filtered = computed(() => {
    let list = [...this.allItems()];
    const q = this.search().trim().toLowerCase();
    if (q) {
      list = list.filter(i =>
        i.mosqueName.toLowerCase().includes(q)
        || i.inviteEmail.toLowerCase().includes(q)
        || (i.inviteName ?? '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter() === 'Pending') {
      list = list.filter(i => i.status === 'Pending');
    }
    return list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  });

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pendingCount = computed(() => this.allItems().filter(i => i.status === 'Pending').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.platform.getInvitations().subscribe({
      next: items => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load invitations.');
        this.loading.set(false);
      },
    });
  }

  onSearchChange(v: string): void {
    this.search.set(v);
    this.page.set(1);
  }

  onStatusFilterChange(v: StatusFilter): void {
    this.statusFilter.set(v);
    this.page.set(1);
  }

  resend(item: MosqueInvitationItem): void {
    this.platform.resendInvitation(item.id).subscribe({
      next: res => this.showToast(res.message || 'Invitation resent.', true),
      error: err => this.showToast(err?.error?.message ?? 'Resend failed.', false),
    });
  }

  revoke(item: MosqueInvitationItem): void {
    if (!confirm(`Revoke invitation for ${item.inviteEmail}?`)) return;
    this.platform.revokeInvitation(item.id).subscribe({
      next: res => {
        this.showToast(res.message || 'Invitation revoked.', true);
        this.load();
      },
      error: err => this.showToast(err?.error?.message ?? 'Revoke failed.', false),
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      Pending: 'sc-badge sc-badge--pending',
      Accepted: 'sc-badge sc-badge--ok',
      Revoked: 'sc-badge sc-badge--muted',
      Expired: 'sc-badge sc-badge--muted',
    };
    return map[status] ?? 'sc-badge';
  }

  prevPage(): void {
    if (this.page() > 1) this.page.update(p => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.update(p => p + 1);
  }

  private showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 5000);
  }

  copyLink(link: string): void {
    void navigator.clipboard?.writeText(link);
    this.showToast('Invite link copied to clipboard.', true);
  }
}
