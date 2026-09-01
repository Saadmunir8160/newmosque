import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import {
  AuditLogEntry,
  PlatformDashboard,
  PlatformService,
  PlatformStats,
} from '../../../core/services/platform.service';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus, statusClass } from '../../../core/utils/mosque-status.util';
import { SuperAdminPageHeaderComponent } from '../../../shared/ui/super-admin-page-header.component';

type ReportView = 'platform' | 'usage' | 'activity';

@Component({
  selector: 'app-super-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, SuperAdminPageHeaderComponent],
  templateUrl: './super-reports.component.html',
  styleUrl: './super-reports.component.css',
})
export class SuperReportsComponent implements OnInit {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);
  private route = inject(ActivatedRoute);

  view = signal<ReportView>('platform');
  stats = signal<PlatformStats | null>(null);
  dashboard = signal<PlatformDashboard | null>(null);
  mosques = signal<Mosque[]>([]);
  loading = signal(true);
  toast = signal('');
  toastOk = signal(true);

  pageTitle = computed(() => {
    const v = this.view();
    if (v === 'usage') return 'Usage Statistics';
    if (v === 'activity') return 'Activity Reports';
    return 'Platform Reports';
  });

  pageSubtitle = computed(() => {
    const v = this.view();
    if (v === 'usage') return 'Feature usage, user growth, and module adoption across MOS.';
    if (v === 'activity') return 'Recent platform activity and 7-day engagement trends.';
    return 'Live mosque network metrics and status breakdown.';
  });

  statusRows = computed(() => {
    const list = this.mosques();
    const tally = (s: string) => list.filter(m => m.status === s).length;
    return [
      { label: 'Active', count: tally('Active'), tone: 'active' },
      { label: 'Claimed', count: tally('Claimed'), tone: 'claimed' },
      { label: 'Unclaimed', count: tally('Unclaimed'), tone: 'unclaimed' },
    ];
  });

  featureUsage = computed(() => this.dashboard()?.analytics?.featureUsage ?? []);
  recentActivity = computed(() => {
    const d = this.dashboard();
    return (d?.recentActivity ?? d?.auditPreview ?? []).slice(0, 12);
  });

  ngOnInit(): void {
    this.route.data.subscribe(d => {
      const v = (d['reportView'] as ReportView) || 'platform';
      this.view.set(v);
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.platform.getStats(),
      mosques: this.admin.getAllMosques(),
      dashboard: this.platform.getDashboard(),
    }).subscribe({
      next: ({ stats, mosques, dashboard }) => {
        this.stats.set(stats);
        this.mosques.set(mosques);
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Could not load platform analytics.', false);
      },
    });
  }

  formatStatus = formatMosqueStatus;
  statusClass = statusClass;

  activityLabel(entry: AuditLogEntry): string {
    return entry.action?.replace(/_/g, ' ') || 'Activity';
  }

  private showToast(msg: string, ok: boolean): void {
    this.toastOk.set(ok);
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3200);
  }
}
