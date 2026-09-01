import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  PlatformService,
  AuditLogEntry,
  RoleMonitorData,
  PlatformDashboard,
} from '../../../core/services/platform.service';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

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

type AuditView = 'logs' | 'system';

@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-audit.component.html',
  styleUrl: './super-audit.component.css',
})
export class SuperAuditComponent implements OnInit {
  private platform = inject(PlatformService);
  private route = inject(ActivatedRoute);

  view = signal<AuditView>('logs');
  data = signal<RoleMonitorData | null>(null);
  dashboard = signal<PlatformDashboard | null>(null);
  loading = signal(true);
  roleFilterOnly = signal(false);
  toast = signal('');
  toastOk = signal(true);
  auditLimit = signal(30);
  loadingMore = signal(false);
  canLoadMore = signal(true);

  dateFrom = '2026-01-01';
  dateTo = new Date().toISOString().slice(0, 10);

  pageTitle = computed(() => this.view() === 'system' ? 'System Activity' : 'Audit Logs');
  pageSubtitle = computed(() =>
    this.view() === 'system'
      ? 'API, database, email, and security health across the MOS platform.'
      : 'Track role changes, claims, and platform actions across MOS.');

  filteredAudit = computed(() => {
    const trail = this.data()?.auditTrail ?? [];
    if (!this.roleFilterOnly()) return trail;
    return trail.filter(l => this.isRoleAction(l.action));
  });

  healthRows = computed(() => {
    const h = this.dashboard()?.systemHealth;
    if (!h) return [];
    return [
      { label: 'API', value: h.api },
      { label: 'Database', value: h.database },
      { label: 'Storage', value: h.storage },
      { label: 'Email', value: h.email },
      { label: 'Queue', value: h.queue },
      { label: 'Backup', value: h.backup },
    ];
  });

  ngOnInit(): void {
    this.route.data.subscribe(d => {
      this.view.set((d['auditView'] as AuditView) || 'logs');
      this.reload();
    });
  }

  reload(): void {
    this.loading.set(true);
    if (this.view() === 'system') {
      this.platform.getDashboard().subscribe({
        next: dash => {
          this.dashboard.set(dash);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showToast('Could not load system activity.', false);
        },
      });
      return;
    }

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
    if (this.loadingMore() || !this.canLoadMore() || this.view() !== 'logs') return;
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
