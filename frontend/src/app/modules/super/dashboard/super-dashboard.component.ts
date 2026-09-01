import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  PendingOwnershipClaim,
  PlatformDashboard,
  PlatformService,
} from '../../../core/services/platform.service';
import {
  AdminRegistrationItem,
  RegistrationService,
} from '../../../core/services/registration.service';

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './super-dashboard.component.html',
  styleUrl: './super-dashboard.component.css',
})
export class SuperDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private platform = inject(PlatformService);
  private registrations = inject(RegistrationService);

  dashboard = signal<PlatformDashboard | null>(null);
  pendingClaims = signal<PendingOwnershipClaim[]>([]);
  registrationItems = signal<AdminRegistrationItem[]>([]);
  loading = signal(false);
  now = signal(new Date());

  readonly LIST_LIMIT = 5;

  userInitials = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.userName || 'Super Admin';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  userName = computed(() =>
    this.auth.user()?.fullName?.trim() || this.auth.user()?.userName || 'Super Admin');

  londonTime = computed(() =>
    this.now().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }));

  londonDate = computed(() =>
    this.now().toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }));

  pendingRegistrations = computed(() => this.registrationItems().length);

  statusSlices = computed(() => {
    const d = this.dashboard();
    if (!d) return [];
    const total = Math.max(d.mosques.total, 1);
    const active = d.mosques.active;
    const unclaimed = d.mosques.unclaimed;
    const pending = d.mosques.pendingClaims ?? d.mosques.claimPending ?? 0;
    const inactive = Math.max(0, total - active - unclaimed - pending);
    const slices = [
      { label: 'Active', value: active, color: '#16A34A', pct: (active / total) * 100 },
      { label: 'Unclaimed', value: unclaimed, color: '#F59E0B', pct: (unclaimed / total) * 100 },
      { label: 'Pending', value: pending, color: '#2563EB', pct: (pending / total) * 100 },
      { label: 'Inactive', value: inactive, color: '#94A3B8', pct: (inactive / total) * 100 },
    ];
    return slices.filter(s => s.value > 0 || s.label === 'Active');
  });

  donutBackground = computed(() => {
    const slices = this.statusSlices();
    if (!slices.length) return '#E5E7EB';
    let cursor = 0;
    const parts: string[] = [];
    for (const s of slices) {
      const start = cursor;
      cursor += s.pct;
      parts.push(`${s.color} ${start}% ${cursor}%`);
    }
    return `conic-gradient(${parts.join(', ')})`;
  });

  chartPoints = computed(() => {
    const chart = this.dashboard()?.analytics?.mosqueChart ?? [];
    if (!chart.length) {
      return { polyline: '0,40 100,40', area: '0,40 100,40 100,48 0,48', labels: [] as string[] };
    }
    const values = chart.map(p => p.count);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const w = 100;
    const h = 48;
    const pad = 4;
    const pts = values.map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return { x, y, label: chart[i].date };
    });
    const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${polyline} ${w},${h} 0,${h}`;
    const labels = chart.map(c => {
      const d = new Date(c.date);
      return Number.isNaN(d.getTime()) ? c.date.slice(5, 10) : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    return { polyline, area, labels };
  });

  recentActivity = computed(() => {
    const list = this.dashboard()?.recentActivity ?? this.dashboard()?.auditPreview ?? [];
    return list.slice(0, 6);
  });

  modules = computed(() => {
    const d = this.dashboard();
    const usage = d?.analytics?.featureUsage ?? [];
    const defaults = [
      { module: 'Prayer Times', count: d?.content?.announcements ?? 1 },
      { module: 'Announcements', count: d?.content?.announcements ?? 0 },
      { module: 'Events', count: d?.content?.events ?? 0 },
      { module: 'Madrassah', count: 0 },
      { module: 'Janaza', count: 0 },
      { module: "Qur'an Reading", count: d?.content?.guides ?? 0 },
    ];
    const source = usage.length ? usage.slice(0, 6) : defaults;
    return source.map(m => ({
      name: m.module,
      enabled: (m.count ?? 0) > 0 || ['Prayer Times', 'Announcements'].includes(m.module),
    }));
  });

  healthRows = computed(() => {
    const h = this.dashboard()?.systemHealth;
    if (!h) return [];
    return [
      { label: 'API', value: h.api, tone: h.api === 'Healthy' ? 'ok' : 'warn' },
      { label: 'Database', value: h.database, tone: h.database === 'Healthy' ? 'ok' : 'warn' },
      { label: 'Server', value: h.api, tone: h.api === 'Healthy' ? 'ok' : 'warn' },
      { label: 'Email', value: h.email, tone: /healthy|ok|ready/i.test(h.email) ? 'ok' : 'warn' },
      { label: 'Storage', value: h.storage, tone: /%|warn|full/i.test(h.storage) ? 'warn' : 'ok' },
      { label: 'Backup', value: h.backup, tone: /healthy|ok|ready|success/i.test(h.backup) ? 'ok' : 'warn' },
    ];
  });

  ngOnInit(): void {
    this.refresh();
    setInterval(() => this.now.set(new Date()), 30_000);
  }

  relativeTime(iso?: string): string {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }

  activityIcon(action: string): string {
    const a = (action || '').toLowerCase();
    if (a.includes('claim')) return 'verified_user';
    if (a.includes('register') || a.includes('user')) return 'person_add';
    if (a.includes('prayer')) return 'schedule';
    if (a.includes('mosque')) return 'domain';
    if (a.includes('login')) return 'login';
    return 'history';
  }

  showChartLabel(index: number, total: number): boolean {
    if (total <= 3) return true;
    return index === 0 || index === total - 1 || index === Math.floor(total / 2);
  }

  refresh(): void {
    this.loading.set(true);
    this.platform.getDashboard().subscribe({
      next: dashboard => {
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.platform.getPendingClaims().subscribe({
      next: res => this.pendingClaims.set((res.items ?? []).slice(0, this.LIST_LIMIT)),
      error: () => this.pendingClaims.set([]),
    });
    this.registrations.list('Pending').subscribe({
      next: items => this.registrationItems.set((items ?? []).slice(0, this.LIST_LIMIT)),
      error: () => this.registrationItems.set([]),
    });
  }
}
