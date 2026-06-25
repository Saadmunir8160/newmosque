import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlatformService, AuditLogEntry, RoleMonitorData } from '../../../core/services/platform.service';

const ACTION_LABELS: Record<string, string> = {
  ASSIGN_ROLE: 'Assign Role',
  REMOVE_ROLE: 'Remove Role',
  APPROVE_CLAIM: 'Approve Claim',
  REJECT_CLAIM: 'Reject Claim',
  SEED_MOSQUE: 'Create Listing',
  UPDATE_MOSQUE: 'Update Listing',
  BULK_MOSQUE_STATUS: 'Bulk Status',
  ASSIGN_MOSQUE_ADMIN: 'Assign Admin',
  ACTIVATE_USER: 'Activate User',
  DEACTIVATE_USER: 'Deactivate User',
  UPDATE_USER: 'Update User',
  PRAYER_TIME_CHANGE: 'Prayer Update',
};

@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './super-audit.component.html',
  styleUrl: './super-audit.component.css',
})
export class SuperAuditComponent implements OnInit {
  private platform = inject(PlatformService);

  data = signal<RoleMonitorData | null>(null);
  loading = signal(true);
  roleFilterOnly = signal(false);
  toast = signal('');
  toastOk = signal(true);
  auditLimit = signal(30);
  loadingMore = signal(false);
  canLoadMore = signal(true);

  dateFrom = '2026-01-01';
  dateTo = new Date().toISOString().slice(0, 10);

  filteredAudit = computed(() => {
    const trail = this.data()?.auditTrail ?? [];
    if (!this.roleFilterOnly()) return trail;
    return trail.filter(l => this.isRoleAction(l.action));
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.auditLimit.set(30);
    this.canLoadMore.set(true);
    this.platform.getRoleMonitor(this.dateFrom, this.dateTo, this.auditLimit()).subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
        this.canLoadMore.set(d.auditTrail.length >= this.auditLimit());
      },
      error: () => { this.loading.set(false); this.showToast('Could not load role monitor.', false); },
    });
  }

  loadMoreAudit(): void {
    if (this.loadingMore() || !this.canLoadMore()) return;
    this.loadingMore.set(true);
    const nextLimit = this.auditLimit() + 30;
    this.platform.getRoleMonitor(this.dateFrom, this.dateTo, nextLimit).subscribe({
      next: d => {
        this.auditLimit.set(nextLimit);
        this.data.update(cur => cur ? { ...cur, auditTrail: d.auditTrail } : d);
        this.loadingMore.set(false);
        this.canLoadMore.set(d.auditTrail.length >= nextLimit);
      },
      error: () => { this.loadingMore.set(false); this.showToast('Could not load more entries.', false); },
    });
  }

  onAuditScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
    if (nearBottom && this.canLoadMore() && !this.loadingMore()) {
      this.loadMoreAudit();
    }
  }

  trackLog(_: number, log: AuditLogEntry): number {
    return log.id;
  }

  actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  actionType(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('role')) return 'role';
    if (a.includes('claim')) return 'claim';
    if (a.includes('mosque') || a.includes('seed') || a.includes('admin')) return 'mosque';
    return 'system';
  }

  actionIcon(action: string): string {
    const t = this.actionType(action);
    if (t === 'role') return '🔐';
    if (t === 'claim') return '⭐';
    if (t === 'mosque') return '🕌';
    return '⚙️';
  }

  toggleRoleFilter(): void {
    this.roleFilterOnly.update(v => !v);
  }

  focusRoleAudit(): void {
    this.roleFilterOnly.set(true);
    this.showToast('Showing role-related audit events.', true);
    document.querySelector('.panel--audit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  exportAccessReport(): void {
    this.platform.getUsers().subscribe({
      next: users => {
        const header = 'Name,Email,Username,Roles,Mosque,Active\n';
        const rows = users.map(u =>
          `"${u.fullName || u.userName}","${u.email ?? ''}","${u.userName}","${u.roles.join('; ')}","${u.mosqueName ?? ''}",${u.isActive !== false}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'user-access-report.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        this.showToast('User access report exported.', true);
      },
      error: () => this.showToast('Export failed.', false),
    });
  }

  private isRoleAction(action: string): boolean {
    const a = action.toLowerCase();
    return a.includes('role') || a.includes('activate_user') || a.includes('deactivate_user');
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
