import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AuditLogEntry,
  PlatformDashboard,
  PlatformService,
} from '../../../core/services/platform.service';
import { SUPER_ADMIN_NAV_ICONS } from '../../../core/config/super-admin-nav.config';
import { Mosque } from '../../../core/models';
import { formatMosqueStatus } from '../../../core/utils/mosque-status.util';

interface ActionItem {
  count: number;
  title: string;
  description: string;
  route: string;
  action: string;
  warn?: boolean;
}

interface QuickAction {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="enterprise-dash" *ngIf="dashboard() as d">
      <!-- Header -->
      <header class="dash-header">
        <div class="dash-header__left">
          <p class="dash-eyebrow">Super Admin · Platform Control</p>
          <h1 class="dash-greeting">{{ greeting() }}</h1>
          <div class="dash-meta">
            <span class="status-chip" [class.status-chip--warn]="d.platformStatus === 'Warning'">
              <span class="status-dot"></span>
              {{ d.platformStatus }}
            </span>
            <span class="sync-time">Last sync {{ lastSync() | date:'short' }}</span>
          </div>
        </div>
        <div class="dash-header__right">
          <div class="notif-wrap">
            <button type="button" class="icon-btn" (click)="toggleNotifs()" aria-label="Notifications">
              🔔
              <span *ngIf="d.notifications.length" class="notif-badge">{{ d.notifications.length }}</span>
            </button>
            <div class="notif-panel" *ngIf="showNotifs()">
              <p class="notif-panel__title">Notification center</p>
              <a *ngFor="let n of d.notifications" [routerLink]="n.route" class="notif-item" [attr.data-severity]="n.severity" (click)="showNotifs.set(false)">
                <strong>{{ n.title }}</strong>
                <span>{{ n.message }}</span>
              </a>
              <p *ngIf="!d.notifications.length" class="notif-empty">No alerts right now.</p>
            </div>
          </div>
          <button type="button" class="btn-primary" (click)="refresh()" [disabled]="loading()">
            {{ loading() ? 'Syncing…' : 'Refresh' }}
          </button>
        </div>
      </header>

      <!-- Health score + KPI row -->
      <div class="top-row">
        <div class="health-score-card">
          <div class="score-ring" [style.--score]="d.healthScore">
            <span class="score-value">{{ d.healthScore }}%</span>
          </div>
          <div>
            <p class="score-label">Platform health score</p>
            <p class="score-hint">System · security · mosques · errors</p>
          </div>
        </div>

        <div class="kpi-grid">
          <a routerLink="/dashboard/super/mosques" class="kpi-card">
            <div class="kpi-card__head">
              <span class="kpi-icon">🕌</span>
              <span class="kpi-trend kpi-trend--up" *ngIf="d.analytics.mosqueGrowth30d">+{{ d.analytics.mosqueGrowth30d }} / 30d</span>
            </div>
            <p class="kpi-label">Total mosques</p>
            <p class="kpi-value">{{ d.stats.totalMosques }}</p>
            <p class="kpi-sub">{{ d.stats.activeMosques }} active</p>
          </a>

          <a routerLink="/dashboard/super/users" class="kpi-card">
            <div class="kpi-card__head">
              <span class="kpi-icon">👥</span>
              <span class="kpi-trend kpi-trend--up" *ngIf="d.users.newUsers30d">+{{ d.users.newUsers30d }} new</span>
            </div>
            <p class="kpi-label">Total users</p>
            <p class="kpi-value">{{ d.stats.totalUsers }}</p>
            <p class="kpi-sub">{{ d.users.active }} active</p>
          </a>

          <a routerLink="/dashboard/super/claims" class="kpi-card" [class.kpi-card--warn]="d.needsAttention.pendingApprovals > 0">
            <div class="kpi-card__head">
              <span class="kpi-icon">📋</span>
            </div>
            <p class="kpi-label">Pending actions</p>
            <p class="kpi-value">{{ d.needsAttention.pendingApprovals }}</p>
            <p class="kpi-sub">{{ d.needsAttention.pendingClaims }} claims · {{ d.needsAttention.missingOwners }} unassigned</p>
          </a>

          <div class="kpi-card kpi-card--health">
            <div class="kpi-card__head"><span class="kpi-icon">⚡</span></div>
            <p class="kpi-label">System health</p>
            <ul class="health-mini">
              <li><span class="dot dot--ok"></span> API {{ d.systemHealth.api }}</li>
              <li><span class="dot dot--ok"></span> DB {{ d.systemHealth.database }}</li>
              <li><span class="dot dot--ok"></span> Storage {{ d.systemHealth.storage }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Action center -->
      <section class="panel" *ngIf="actionItems().length">
        <div class="panel__head">
          <h2 class="panel__title">Action center</h2>
          <span class="panel__badge">{{ actionItems().length }} priorities</span>
        </div>
        <div class="action-grid">
          <div *ngFor="let item of actionItems()" class="action-card" [class.action-card--warn]="item.warn && item.count > 0">
            <div class="action-card__count">{{ item.count }}</div>
            <div class="action-card__body">
              <p class="action-card__title">{{ item.title }}</p>
              <p class="action-card__desc">{{ item.description }}</p>
            </div>
            <a [routerLink]="item.route" class="action-card__btn">{{ item.action }}</a>
          </div>
        </div>
      </section>

      <!-- Mosque + Users -->
      <div class="two-col">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Mosque overview</h2>
            <a routerLink="/dashboard/super/mosques" class="panel__link">Manage mosques →</a>
          </div>
          <div class="stat-pills">
            <div class="pill"><span>Total</span><strong>{{ d.mosques.total }}</strong></div>
            <div class="pill pill--ok"><span>Active</span><strong>{{ d.mosques.active }}</strong></div>
            <div class="pill"><span>Claimed</span><strong>{{ d.mosques.claimed }}</strong></div>
            <div class="pill"><span>Unclaimed</span><strong>{{ d.mosques.unclaimed }}</strong></div>
            <div class="pill"><span>Suspended</span><strong>{{ d.mosques.suspended }}</strong></div>
          </div>
          <div class="data-table">
            <div class="data-table__head">
              <span>Mosque</span><span>City</span><span>Status</span><span>Owner</span><span>Created</span>
            </div>
            <a *ngFor="let m of d.mosques.recentAdditions" [routerLink]="['/dashboard/super/mosques', m.id]" class="data-table__row">
              <span class="row-name">{{ m.name }}</span>
              <span>{{ m.city }}</span>
              <span class="row-status">{{ formatStatus(m.status) }}</span>
              <span>{{ m.ownerName || '—' }}</span>
              <span class="row-date">{{ m.createdAt | date:'mediumDate' }}</span>
            </a>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Users & roles</h2>
            <a routerLink="/dashboard/super/users" class="btn-secondary">Manage users</a>
          </div>
          <div class="user-stats">
            <div><span class="user-stat-label">Total</span><strong>{{ d.users.total }}</strong></div>
            <div><span class="user-stat-label">Active</span><strong class="text-ok">{{ d.users.active }}</strong></div>
            <div><span class="user-stat-label">Blocked</span><strong [class.text-warn]="d.users.blocked">{{ d.users.blocked }}</strong></div>
          </div>
          <div class="role-list">
            <div *ngFor="let row of groupedRoles(d)" class="role-item">
              <div class="role-item__head">
                <span>{{ row.role }}</span>
                <span>{{ row.count }}</span>
              </div>
              <div class="role-bar"><div class="role-bar__fill" [style.width.%]="rolePct(row.count, d)"></div></div>
            </div>
          </div>
        </section>
      </div>

      <!-- Analytics -->
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">Analytics</h2>
          <a routerLink="/dashboard/super/reports" class="panel__link">Full reports →</a>
        </div>
        <div class="charts-row">
          <div class="chart-card">
            <p class="chart-title">Mosque growth <span>30 days</span></p>
            <div class="chart-bars">
              <div *ngFor="let pt of d.analytics.mosqueChart || []" class="chart-bar" [style.height.%]="barHeight(pt.count, d.analytics.mosqueChart)" [title]="pt.date + ': ' + pt.count"></div>
            </div>
            <p class="chart-footer">+{{ d.analytics.mosqueGrowth30d }} new mosques</p>
          </div>
          <div class="chart-card">
            <p class="chart-title">User growth <span>30 days</span></p>
            <div class="chart-bars">
              <div *ngFor="let pt of d.analytics.userChart || []" class="chart-bar chart-bar--blue" [style.height.%]="barHeight(pt.count, d.analytics.userChart)" [title]="pt.date + ': ' + pt.count"></div>
            </div>
            <p class="chart-footer">+{{ d.analytics.userGrowth30d }} new users</p>
          </div>
          <div class="chart-card">
            <p class="chart-title">Platform activity <span>7 days</span></p>
            <div class="chart-bars">
              <div *ngFor="let pt of d.analytics.activityChart || []" class="chart-bar chart-bar--gold" [style.height.%]="barHeight(pt.count, d.analytics.activityChart)" [title]="pt.date + ': ' + pt.count"></div>
            </div>
            <p class="chart-footer">{{ d.analytics.activityLast7 }} events · {{ activityTrendLabel(d) }}</p>
          </div>
        </div>
      </section>

      <!-- Health + Security + Content -->
      <div class="three-col">
        <section class="panel">
          <h2 class="panel__title">System health</h2>
          <ul class="health-list">
            <li><span class="dot dot--ok"></span> API <em>{{ d.systemHealth.api }}</em></li>
            <li><span class="dot dot--ok"></span> Database <em>{{ d.systemHealth.database }}</em></li>
            <li><span class="dot dot--ok"></span> Storage <em>{{ d.systemHealth.storage }}</em></li>
            <li><span class="dot dot--ok"></span> Email <em>{{ d.systemHealth.email }}</em></li>
            <li><span class="dot dot--ok"></span> Queue <em>{{ d.systemHealth.queue }}</em></li>
            <li><span class="dot dot--ok"></span> Backup <em>{{ d.systemHealth.backup }}</em></li>
          </ul>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Security</h2>
            <a routerLink="/dashboard/super/audit" class="panel__link">Security logs →</a>
          </div>
          <div class="sec-grid">
            <div class="sec-cell"><span>Sessions</span><strong>{{ d.security.activeSessions }}</strong></div>
            <div class="sec-cell" [class.sec-cell--warn]="d.security.failedLoginAttempts > 0"><span>Failed logins</span><strong>{{ d.security.failedLoginAttempts }}</strong></div>
            <div class="sec-cell" [class.sec-cell--warn]="d.security.blockedAccounts > 0"><span>Blocked</span><strong>{{ d.security.blockedAccounts }}</strong></div>
            <div class="sec-cell" [class.sec-cell--warn]="d.security.suspiciousActivity > 0"><span>Suspicious</span><strong>{{ d.security.suspiciousActivity }}</strong></div>
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Content summary</h2>
          <div class="content-grid">
            <div class="content-cell"><span>Announcements</span><strong>{{ d.content.announcements }}</strong></div>
            <div class="content-cell"><span>Events</span><strong>{{ d.content.events }}</strong></div>
            <div class="content-cell"><span>Campaigns</span><strong>{{ d.content.campaigns }}</strong></div>
            <div class="content-cell"><span>Guides</span><strong>{{ d.content.guides }}</strong></div>
          </div>
          <p class="feature-title">Feature usage</p>
          <div *ngFor="let f of topFeatures(d)" class="role-item">
            <div class="role-item__head"><span>{{ featureLabel(f.module) }}</span><span>{{ f.count }}</span></div>
            <div class="role-bar"><div class="role-bar__fill" [style.width.%]="featurePct(f.count, d)"></div></div>
          </div>
        </section>
      </div>

      <!-- Claims + Timeline -->
      <div class="two-col">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Claims overview</h2>
            <a routerLink="/dashboard/super/claims" class="panel__link">Review all →</a>
          </div>
          <p *ngIf="!pendingClaims().length" class="empty">No pending mosque claims.</p>
          <div *ngFor="let m of pendingClaims()" class="claim-item">
            <div>
              <p class="claim-name">{{ m.name }}</p>
              <p class="claim-meta">{{ m.city }} · {{ m.ownerId || 'No owner ID' }}</p>
            </div>
            <div class="claim-btns">
              <button type="button" class="btn-ok" (click)="approveClaim(m.id)">Approve</button>
              <button type="button" class="btn-danger" (click)="rejectClaim(m.id)">Reject</button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">Recent activity</h2>
            <a routerLink="/dashboard/super/audit" class="panel__link">Audit logs →</a>
          </div>
          <div class="timeline">
            <div *ngFor="let log of timelineLogs()" class="timeline__item">
              <div class="timeline__dot"></div>
              <div class="timeline__body">
                <p class="timeline__action">{{ actionLabel(log.action) }}</p>
                <p class="timeline__user">{{ log.description || log.actorId }}</p>
                <p class="timeline__meta">{{ moduleLabel(log) }} · {{ log.createdAt | date:'short' }}</p>
              </div>
            </div>
            <p *ngIf="!timelineLogs().length" class="empty">No recent platform activity.</p>
          </div>
        </section>
      </div>

      <!-- Quick actions -->
      <section class="panel">
        <h2 class="panel__title">Quick actions</h2>
        <div class="quick-grid">
          <a *ngFor="let q of quickActions" [routerLink]="q.route" class="quick-btn">
            <span class="quick-btn__icon">{{ q.icon }}</span>
            <span>{{ q.label }}</span>
          </a>
        </div>
      </section>
    </div>

    <div *ngIf="loading() && !dashboard()" class="dash-loading">Loading platform dashboard…</div>
  `,
  styles: [`
    .enterprise-dash { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 2rem; }

    .dash-header {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1rem;
      padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .dash-eyebrow { margin: 0; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #6ee7b7; opacity: 0.8; }
    .dash-greeting { margin: 0.25rem 0 0; font-size: 1.5rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .dash-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 600;
      padding: 0.25rem 0.625rem; border-radius: 9999px; background: rgba(34,197,94,0.12); color: #86efac; border: 1px solid rgba(34,197,94,0.3);
    }
    .status-chip--warn { background: rgba(245,158,11,0.12); color: #fcd34d; border-color: rgba(245,158,11,0.35); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .sync-time { font-size: 0.75rem; color: #6ee7b7; opacity: 0.7; }
    .dash-header__right { display: flex; align-items: center; gap: 0.5rem; }
    .icon-btn {
      position: relative; width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(2,44,34,0.6); cursor: pointer; font-size: 1rem;
    }
    .notif-badge {
      position: absolute; top: -4px; right: -4px; min-width: 1rem; height: 1rem; border-radius: 9999px;
      background: #ef4444; color: #fff; font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
    .notif-wrap { position: relative; }
    .notif-panel {
      position: absolute; right: 0; top: calc(100% + 0.5rem); width: min(20rem, 90vw); z-index: 50;
      background: #022c22; border: 1px solid #065f46; border-radius: 0.75rem; padding: 0.75rem;
      box-shadow: 0 16px 40px rgba(0,0,0,0.35);
    }
    .notif-panel__title { margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 700; color: #a7f3d0; text-transform: uppercase; letter-spacing: 0.05em; }
    .notif-item { display: block; padding: 0.625rem; border-radius: 0.5rem; text-decoration: none; margin-bottom: 0.375rem; border: 1px solid transparent; }
    .notif-item strong { display: block; font-size: 0.8125rem; color: #fff; margin-bottom: 0.125rem; }
    .notif-item span { font-size: 0.75rem; color: #6ee7b7; }
    .notif-item[data-severity="warn"] { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.2); }
    .notif-item[data-severity="error"] { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2); }
    .notif-empty { margin: 0; font-size: 0.8125rem; color: #6ee7b7; }

    .btn-primary {
      font-size: 0.8125rem; font-weight: 600; color: #022c22; background: #f59e0b;
      padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: wait; }
    .btn-secondary {
      font-size: 0.75rem; font-weight: 600; color: #fcd34d; background: transparent;
      padding: 0.375rem 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(245,158,11,0.4); text-decoration: none;
    }

    .top-row { display: grid; gap: 1rem; }
    @media (min-width: 1100px) { .top-row { grid-template-columns: auto 1fr; align-items: stretch; } }
    .health-score-card {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
      background: linear-gradient(135deg, rgba(6,78,59,0.9), rgba(2,44,34,0.95));
      border: 1px solid rgba(245,158,11,0.25); border-radius: 0.875rem; min-width: 14rem;
    }
    .score-ring {
      width: 4.5rem; height: 4.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: conic-gradient(#f59e0b calc(var(--score) * 1%), rgba(255,255,255,0.08) 0);
      position: relative;
    }
    .score-ring::before {
      content: ''; position: absolute; inset: 6px; border-radius: 50%; background: #022c22;
    }
    .score-value { position: relative; font-size: 1rem; font-weight: 800; color: #fcd34d; }
    .score-label { margin: 0; font-size: 0.875rem; font-weight: 600; color: #fff; }
    .score-hint { margin: 0.25rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }

    .kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0.75rem; }
    @media (min-width: 900px) { .kpi-grid { grid-template-columns: repeat(4, minmax(0,1fr)); } }
    .kpi-card {
      padding: 1rem; border-radius: 0.875rem; background: rgba(6,78,59,0.55);
      border: 1px solid rgba(255,255,255,0.06); text-decoration: none; color: inherit;
      transition: border-color 0.2s, transform 0.2s;
    }
    .kpi-card:hover { border-color: rgba(245,158,11,0.35); transform: translateY(-1px); }
    .kpi-card--warn { border-color: rgba(245,158,11,0.35); }
    .kpi-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .kpi-icon { font-size: 1.25rem; }
    .kpi-trend { font-size: 0.625rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 9999px; }
    .kpi-trend--up { background: rgba(34,197,94,0.15); color: #86efac; }
    .kpi-label { margin: 0; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6ee7b7; }
    .kpi-value { margin: 0.25rem 0 0; font-size: 1.75rem; font-weight: 800; color: #fff; line-height: 1; }
    .kpi-sub { margin: 0.375rem 0 0; font-size: 0.75rem; color: #a7f3d0; opacity: 0.85; }
    .health-mini { list-style: none; margin: 0.5rem 0 0; padding: 0; font-size: 0.6875rem; color: #a7f3d0; }
    .health-mini li { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.25rem; }

    .panel {
      background: rgba(6,78,59,0.4); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.875rem; padding: 1rem 1.125rem;
    }
    .panel__head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .panel__title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: #fff; }
    .panel__link { font-size: 0.75rem; color: #fbbf24; text-decoration: none; }
    .panel__link:hover { text-decoration: underline; }
    .panel__badge { font-size: 0.6875rem; font-weight: 600; color: #fcd34d; background: rgba(245,158,11,0.12); padding: 0.2rem 0.5rem; border-radius: 9999px; }

    .action-grid { display: grid; gap: 0.75rem; }
    @media (min-width: 768px) { .action-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1100px) { .action-grid { grid-template-columns: repeat(3, 1fr); } }
    .action-card {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem;
      background: rgba(2,44,34,0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 0.625rem;
    }
    .action-card--warn { border-color: rgba(245,158,11,0.3); }
    .action-card__count { font-size: 1.5rem; font-weight: 800; color: #fcd34d; min-width: 2rem; text-align: center; }
    .action-card__body { flex: 1; min-width: 0; }
    .action-card__title { margin: 0; font-size: 0.8125rem; font-weight: 600; color: #fff; }
    .action-card__desc { margin: 0.125rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }
    .action-card__btn {
      font-size: 0.6875rem; font-weight: 700; color: #022c22; background: #f59e0b;
      padding: 0.375rem 0.625rem; border-radius: 0.375rem; text-decoration: none; white-space: nowrap;
    }

    .two-col { display: grid; gap: 1rem; }
    @media (min-width: 1024px) { .two-col { grid-template-columns: 1fr 1fr; } }
    .three-col { display: grid; gap: 1rem; }
    @media (min-width: 900px) { .three-col { grid-template-columns: repeat(3, 1fr); } }

    .stat-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .pill {
      padding: 0.5rem 0.75rem; border-radius: 0.5rem; background: rgba(2,44,34,0.5); border: 1px solid rgba(255,255,255,0.05);
      font-size: 0.6875rem; color: #6ee7b7;
    }
    .pill strong { display: block; font-size: 1rem; color: #fff; margin-top: 0.125rem; }
    .pill--ok strong { color: #86efac; }

    .data-table { font-size: 0.75rem; }
    .data-table__head, .data-table__row {
      display: grid; grid-template-columns: 1.4fr 0.8fr 0.8fr 0.9fr 0.9fr; gap: 0.5rem; padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .data-table__head { color: #6ee7b7; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .data-table__row { text-decoration: none; color: #d1fae5; transition: background 0.15s; border-radius: 0.25rem; }
    .data-table__row:hover { background: rgba(245,158,11,0.06); color: #fff; }
    .row-name { font-weight: 600; color: #fff; }
    .row-status { color: #fcd34d; }
    .row-date { color: #6ee7b7; opacity: 0.8; }
    @media (max-width: 700px) {
      .data-table__head { display: none; }
      .data-table__row { grid-template-columns: 1fr; gap: 0.125rem; padding: 0.75rem 0; }
    }

    .user-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; text-align: center; }
    .user-stat-label { display: block; font-size: 0.625rem; color: #6ee7b7; text-transform: uppercase; }
    .user-stats strong { font-size: 1.25rem; color: #fff; }
    .text-ok { color: #86efac !important; }
    .text-warn { color: #fbbf24 !important; }

    .role-list { display: flex; flex-direction: column; gap: 0.625rem; }
    .role-item__head { display: flex; justify-content: space-between; font-size: 0.75rem; color: #a7f3d0; margin-bottom: 0.2rem; }
    .role-bar { height: 4px; border-radius: 9999px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .role-bar__fill { height: 100%; background: linear-gradient(90deg, #10b981, #f59e0b); border-radius: 9999px; }

    .charts-row { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .charts-row { grid-template-columns: repeat(3, 1fr); } }
    .chart-card { padding: 0.75rem; background: rgba(2,44,34,0.45); border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.04); }
    .chart-title { margin: 0 0 0.75rem; font-size: 0.8125rem; font-weight: 600; color: #fff; }
    .chart-title span { font-weight: 400; color: #6ee7b7; font-size: 0.6875rem; }
    .chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 4.5rem; }
    .chart-bar { flex: 1; min-height: 4px; background: #10b981; border-radius: 2px 2px 0 0; opacity: 0.85; transition: height 0.3s; }
    .chart-bar--blue { background: #3b82f6; }
    .chart-bar--gold { background: #f59e0b; }
    .chart-footer { margin: 0.5rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }

    .health-list { list-style: none; margin: 0; padding: 0; }
    .health-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0; font-size: 0.8125rem; color: #a7f3d0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .health-list li em { margin-left: auto; font-style: normal; color: #fff; font-weight: 600; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #6b7280; flex-shrink: 0; }
    .dot--ok { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }

    .sec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .sec-cell { padding: 0.75rem; background: rgba(2,44,34,0.45); border-radius: 0.5rem; text-align: center; }
    .sec-cell span { display: block; font-size: 0.625rem; color: #6ee7b7; text-transform: uppercase; }
    .sec-cell strong { font-size: 1.25rem; color: #fff; }
    .sec-cell--warn strong { color: #fbbf24; }

    .content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
    .content-cell { padding: 0.625rem; background: rgba(2,44,34,0.45); border-radius: 0.5rem; }
    .content-cell span { display: block; font-size: 0.625rem; color: #6ee7b7; }
    .content-cell strong { font-size: 1.125rem; color: #fff; }
    .feature-title { margin: 0 0 0.5rem; font-size: 0.6875rem; font-weight: 600; color: #6ee7b7; text-transform: uppercase; }

    .claim-item {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem;
      padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .claim-name { margin: 0; font-size: 0.875rem; font-weight: 600; color: #fff; }
    .claim-meta { margin: 0.125rem 0 0; font-size: 0.75rem; color: #6ee7b7; }
    .claim-btns { display: flex; gap: 0.5rem; }
    .btn-ok { background: #10b981; color: #022c22; font-weight: 700; border: none; padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; }
    .btn-danger { background: #ef4444; color: #fff; font-weight: 700; border: none; padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.75rem; }

    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline__item { display: flex; gap: 0.75rem; padding: 0.625rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .timeline__dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; margin-top: 0.375rem; flex-shrink: 0; }
    .timeline__action { margin: 0; font-size: 0.8125rem; font-weight: 600; color: #fff; }
    .timeline__user { margin: 0.125rem 0 0; font-size: 0.75rem; color: #a7f3d0; }
    .timeline__meta { margin: 0.125rem 0 0; font-size: 0.6875rem; color: #6ee7b7; opacity: 0.75; }

    .quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    @media (min-width: 640px) { .quick-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1024px) { .quick-grid { grid-template-columns: repeat(5, 1fr); } }
    .quick-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.375rem; padding: 0.875rem 0.5rem;
      background: rgba(2,44,34,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.625rem;
      text-decoration: none; color: #d1fae5; font-size: 0.6875rem; font-weight: 600; text-align: center;
      transition: border-color 0.2s, background 0.2s;
    }
    .quick-btn:hover { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.06); color: #fff; }
    .quick-btn__icon { font-size: 1.25rem; }

    .empty { margin: 0; font-size: 0.8125rem; color: #6ee7b7; }
    .dash-loading { padding: 3rem; text-align: center; color: #6ee7b7; }
  `]
})
export class SuperDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private platform = inject(PlatformService);

  dashboard = signal<PlatformDashboard | null>(null);
  pendingClaims = signal<Mosque[]>([]);
  lastSync = signal<Date>(new Date());
  loading = signal(false);
  showNotifs = signal(false);

  readonly formatStatus = formatMosqueStatus;

  readonly quickActions: QuickAction[] = [
    { label: 'Add mosque', route: '/dashboard/super/mosques', icon: '➕' },
    { label: 'Manage mosques', route: '/dashboard/super/mosques', icon: '🕌' },
    { label: 'Manage users', route: '/dashboard/super/users', icon: '👥' },
    { label: 'Review claims', route: '/dashboard/super/claims', icon: '📋' },
    { label: 'Assign owner', route: '/dashboard/super/mosques', icon: '🏛️' },
    { label: 'Feature flags', route: '/dashboard/super/features', icon: '⚙️' },
    { label: 'Reports', route: '/dashboard/super/reports', icon: '📈' },
    { label: 'Settings', route: '/dashboard/super/settings', icon: '🔧' },
    { label: 'Audit logs', route: '/dashboard/super/audit', icon: '📜' },
  ];

  greeting = computed(() => {
    const name = this.auth.user()?.fullName || this.auth.user()?.userName || 'Super Admin';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${name}`;
  });

  actionItems = computed((): ActionItem[] => {
    const d = this.dashboard();
    if (!d) return [];
    const n = d.needsAttention;
    return [
      { count: n.unclaimedMosques, title: 'Unclaimed mosques', description: 'Listings without an assigned owner', route: '/dashboard/super/mosques', action: 'Review', warn: n.unclaimedMosques > 0 },
      { count: n.pendingClaims, title: 'Ownership claims', description: 'Pending mosque ownership requests', route: '/dashboard/super/claims', action: 'Review', warn: true },
      { count: n.missingOwners, title: 'Missing owners', description: 'Active mosques without an owner', route: '/dashboard/super/mosques', action: 'Assign', warn: n.missingOwners > 0 },
      { count: n.duplicateListings ?? 0, title: 'Duplicate listings', description: 'Possible duplicate mosque records', route: '/dashboard/super/mosques', action: 'Inspect', warn: (n.duplicateListings ?? 0) > 0 },
      { count: d.security.suspiciousActivity, title: 'Security warnings', description: 'Suspicious events in recent audit logs', route: '/dashboard/super/audit', action: 'View logs', warn: d.security.suspiciousActivity > 0 },
    ].filter(i => i.count > 0);
  });

  timelineLogs = computed(() => {
    const d = this.dashboard();
    return d?.auditPreview?.length ? d.auditPreview : (d?.recentActivity ?? []).slice(0, 8);
  });

  ngOnInit(): void { this.refresh(); }

  toggleNotifs(): void { this.showNotifs.update(v => !v); }

  refresh(): void {
    this.loading.set(true);
    forkJoin({
      dashboard: this.platform.getDashboard(),
      claims: this.platform.getPendingClaims(),
    }).subscribe({
      next: ({ dashboard, claims }) => {
        this.dashboard.set(dashboard);
        this.pendingClaims.set(claims.slice(0, 4));
        this.lastSync.set(dashboard.syncedAt ? new Date(dashboard.syncedAt) : new Date());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  groupedRoles(d: PlatformDashboard): { role: string; count: number }[] {
    const priority = ['Super Admin', 'Mosque Owner', 'Mosque Admin', 'Teacher', 'Member'];
    const rows = [...d.users.byRole];
    const sorted = rows.sort((a, b) => {
      const ai = priority.indexOf(a.role);
      const bi = priority.indexOf(b.role);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return b.count - a.count;
    });
    const top = sorted.filter(r => priority.includes(r.role));
    const other = sorted.filter(r => !priority.includes(r.role));
    const otherCount = other.reduce((s, r) => s + r.count, 0);
    if (otherCount > 0) top.push({ role: 'Other roles', count: otherCount });
    return top.slice(0, 7);
  }

  rolePct(count: number, d: PlatformDashboard): number {
    const max = Math.max(...d.users.byRole.map(r => r.count), 1);
    return Math.round((count / max) * 100);
  }

  topFeatures(d: PlatformDashboard) {
    const keys = ['PrayerTimes', 'Events', 'Janaza', 'Communities'];
    const usage = d.analytics.featureUsage;
    const picked = keys.map(k => usage.find(f => f.module === k) ?? { module: k, count: 0 });
    return picked.sort((a, b) => b.count - a.count);
  }

  featurePct(count: number, d: PlatformDashboard): number {
    const max = Math.max(...this.topFeatures(d).map(f => f.count), 1);
    return Math.round((count / max) * 100);
  }

  featureLabel(module: string): string {
    const map: Record<string, string> = {
      PrayerTimes: 'Prayer times',
      Events: 'Events',
      Janaza: 'Donations / Janaza',
      Communities: 'Community',
    };
    return map[module] ?? module;
  }

  barHeight(count: number, series: { count: number }[]): number {
    const max = Math.max(...series.map(p => p.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }

  activityTrendLabel(d: PlatformDashboard): string {
    const diff = d.analytics.activityLast7 - d.analytics.activityPrev7;
    if (diff > 0) return `↑ ${diff} vs prior week`;
    if (diff < 0) return `↓ ${Math.abs(diff)} vs prior week`;
    return 'steady vs prior week';
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      APPROVE_CLAIM: 'Approved mosque claim',
      REJECT_CLAIM: 'Rejected mosque claim',
      ASSIGN_ROLE: 'Changed user role',
      REMOVE_ROLE: 'Removed user role',
      ASSIGN_MOSQUE_ADMIN: 'Assigned mosque admin',
      SEED_MOSQUE: 'Added mosque listing',
      UPDATE_MOSQUE: 'Updated mosque listing',
      BULK_MOSQUE_STATUS: 'Bulk status update',
    };
    return map[action] ?? action.replace(/_/g, ' ').toLowerCase();
  }

  moduleLabel(log: AuditLogEntry): string {
    if (log.targetType) return log.targetType;
    const a = log.action.toLowerCase();
    if (a.includes('role')) return 'Users';
    if (a.includes('claim') || a.includes('mosque')) return 'Mosques';
    if (a.includes('feature') || a.includes('module')) return 'Features';
    return 'Platform';
  }

  approveClaim(id: number): void {
    this.platform.approveClaim(id).subscribe(() => this.refresh());
  }

  rejectClaim(id: number): void {
    this.platform.rejectClaim(id).subscribe(() => this.refresh());
  }
}
