import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, AuditLogEntry } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

const ACTION_LABELS: Record<string, string> = {
  ASSIGN_ROLE: 'Role assigned',
  REMOVE_ROLE: 'Role removed',
  APPROVE_CLAIM: 'Claim approved',
  REJECT_CLAIM: 'Claim rejected',
  SEED_MOSQUE: 'Mosque listed',
  UPDATE_MOSQUE: 'Listing updated',
  BULK_MOSQUE_STATUS: 'Bulk status change',
  ASSIGN_MOSQUE_ADMIN: 'Admin assigned',
  PRAYER_TIME_CHANGE: 'Prayer time updated',
};

type AuditFilter = 'all' | 'mosques' | 'users' | 'claims' | 'system';

@Component({
  selector: 'app-super-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Audit trail"
      subtitle="A chronological record of platform actions and system-wide changes." />

    <div class="audit-layout">
      <aside class="aside">
        <section class="panel">
          <div class="panel__head">
            <span class="panel__icon">📜</span>
            <div>
              <h3 class="panel__title">Filter logs</h3>
              <p class="panel__sub">Search and narrow by category</p>
            </div>
          </div>

          <div class="field">
            <label class="label" for="audit-search">Search</label>
            <div class="search-wrap">
              <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="audit-search" class="input" placeholder="Description, action, target…"
                [(ngModel)]="search">
            </div>
          </div>

          <div class="field">
            <span class="label">Category</span>
            <div class="chips">
              <button type="button" *ngFor="let f of filters" class="chip"
                [class.chip--on]="activeFilter() === f.id" (click)="activeFilter.set(f.id)">
                {{ f.label }}
              </button>
            </div>
          </div>
        </section>

        <div class="stat-row">
          <div class="stat-box">
            <span class="stat-val">{{ logs().length }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ filtered().length }}</span>
            <span class="stat-lbl">Showing</span>
          </div>
        </div>
      </aside>

      <main class="main">
        <div *ngIf="loading()" class="state-box">
          <span class="state-dot"></span> Loading audit trail…
        </div>

        <div *ngIf="!loading() && !logs().length" class="state-box state-box--empty">
          <span class="state-icon">📋</span>
          <h3 class="state-title">No activity yet</h3>
          <p class="state-sub">Role changes, claim decisions, and mosque listings will appear here.</p>
        </div>

        <div *ngIf="!loading() && logs().length && !filtered().length" class="state-box state-box--empty">
          <span class="state-icon">🔍</span>
          <h3 class="state-title">No matches</h3>
          <p class="state-sub">Try a different search term or category filter.</p>
        </div>

        <div *ngIf="!loading() && filtered().length" class="log-list">
          <article *ngFor="let log of filtered()" class="log-card">
            <div class="log-card__bar" [ngClass]="actionClass(log.action)"></div>
            <div class="log-card__body">
              <div class="log-card__top">
                <span class="action-tag" [ngClass]="actionClass(log.action)">{{ actionLabel(log.action) }}</span>
                <time class="log-time">{{ log.createdAt | date:'MMM d, y · h:mm a' }}</time>
              </div>
              <p class="log-desc">{{ log.description }}</p>
              <div class="log-meta">
                <span class="meta-chip">{{ moduleLabel(log) }}</span>
                <span *ngIf="log.targetId" class="meta-id">#{{ log.targetId }}</span>
                <span *ngIf="log.actorId" class="meta-actor">{{ log.actorId }}</span>
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .audit-layout { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .audit-layout { grid-template-columns: minmax(260px, 280px) 1fr; align-items: start; } }

    .panel {
      padding: 1rem; margin-bottom: 0.75rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.75rem;
    }
    .panel__head { display: flex; gap: 0.625rem; align-items: center; margin-bottom: 0.875rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.12); }
    .panel__icon { font-size: 1.25rem; }
    .panel__title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .panel__sub { margin: 0.1rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.65); }

    .field { margin-bottom: 0.875rem; }
    .label { display: block; margin-bottom: 0.35rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: rgba(212,175,55,0.9); }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%);
      color: rgba(167,243,208,0.5); pointer-events: none; }
    .input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35);
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.5rem;
      padding: 0.55rem 0.65rem 0.55rem 2rem; font-size: 0.8125rem; color: #fff; outline: none; }
    .input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }

    .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .chip { font-size: 0.6875rem; font-weight: 600; padding: 0.35rem 0.65rem; border-radius: 9999px;
      border: 1px solid rgba(16,185,129,0.25); background: rgba(0,0,0,0.3); color: rgba(167,243,208,0.9); cursor: pointer; }
    .chip--on { color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37); border-color: #D4AF37; }

    .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .stat-box { text-align: center; padding: 0.75rem;
      background: rgba(2,44,34,0.8); border: 1px solid rgba(16,185,129,0.15); border-radius: 0.5rem; }
    .stat-val { display: block; font-size: 1.25rem; font-weight: 800; color: #fff; }
    .stat-lbl { font-size: 0.5625rem; text-transform: uppercase; color: rgba(167,243,208,0.6); }

    .state-box { padding: 2.5rem 1.5rem; text-align: center; font-size: 0.8125rem;
      color: rgba(167,243,208,0.65); border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; }
    .state-box--empty { padding: 3rem 1.5rem; }
    .state-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: #D4AF37; margin-right: 0.4rem; animation: pulse 1.2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    .state-icon { font-size: 2rem; display: block; margin-bottom: 0.625rem; }
    .state-title { margin: 0 0 0.35rem; font-size: 0.9375rem; font-weight: 700; color: #fff; }
    .state-sub { margin: 0; font-size: 0.75rem; color: rgba(167,243,208,0.6); max-width: 22rem; margin-inline: auto; }

    .log-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .log-card {
      display: flex; background: linear-gradient(135deg, rgba(6,78,59,0.75), rgba(2,44,34,0.95));
      border: 1px solid rgba(16,185,129,0.18); border-radius: 0.625rem; overflow: hidden;
      transition: border-color 0.2s;
    }
    .log-card:hover { border-color: rgba(212,175,55,0.3); }
    .log-card__bar { width: 3px; flex-shrink: 0; }
    .log-card__body { flex: 1; padding: 0.75rem 0.875rem; min-width: 0; }
    .log-card__top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.375rem; margin-bottom: 0.375rem; }

    .act--mosque { background: #10b981; color: #6ee7b7; border-color: rgba(16,185,129,0.35); }
    .act--user { background: #3b82f6; color: #93c5fd; border-color: rgba(59,130,246,0.35); }
    .act--claim { background: #D4AF37; color: #fcd34d; border-color: rgba(212,175,55,0.35); }
    .act--prayer { background: #8b5cf6; color: #c4b5fd; border-color: rgba(139,92,246,0.35); }
    .act--system { background: #64748b; color: #94a3b8; border-color: rgba(100,116,139,0.35); }

    .action-tag { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem; border-radius: 9999px; border: 1px solid; }
    .log-time { font-size: 0.6875rem; color: rgba(167,243,208,0.55); white-space: nowrap; }
    .log-desc { margin: 0 0 0.5rem; font-size: 0.8125rem; color: #ecfdf5; line-height: 1.45; word-break: break-word; }
    .log-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; }
    .meta-chip { font-size: 0.5625rem; font-weight: 600; text-transform: uppercase;
      padding: 0.15rem 0.4rem; border-radius: 0.25rem;
      background: rgba(0,0,0,0.25); color: rgba(167,243,208,0.7); border: 1px solid rgba(16,185,129,0.15); }
    .meta-id { font-size: 0.625rem; color: rgba(212,175,55,0.7); font-family: ui-monospace, monospace; }
    .meta-actor { font-size: 0.625rem; color: rgba(148,163,184,0.7); margin-left: auto; }
  `]
})
export class SuperAuditComponent implements OnInit {
  private platform = inject(PlatformService);
  logs = signal<AuditLogEntry[]>([]);
  loading = signal(true);
  search = '';
  activeFilter = signal<AuditFilter>('all');

  readonly filters: { id: AuditFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mosques', label: 'Mosques' },
    { id: 'users', label: 'Users' },
    { id: 'claims', label: 'Claims' },
    { id: 'system', label: 'System' },
  ];

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    const cat = this.activeFilter();
    return this.logs().filter(log => {
      if (cat !== 'all' && this.categoryOf(log) !== cat) return false;
      if (!q) return true;
      const hay = [
        log.description, log.action, log.targetType, log.actorId,
        log.targetId?.toString(), this.actionLabel(log.action),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.platform.getAuditLogs(100).subscribe({
      next: l => { this.logs.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase();
  }

  moduleLabel(log: AuditLogEntry): string {
    if (log.targetType) return log.targetType;
    const a = log.action.toLowerCase();
    if (a.includes('role')) return 'Users';
    if (a.includes('claim') || a.includes('mosque')) return 'Mosques';
    if (a.includes('prayer')) return 'Prayer';
    return 'Platform';
  }

  actionClass(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('claim')) return 'act--claim';
    if (a.includes('role')) return 'act--user';
    if (a.includes('prayer')) return 'act--prayer';
    if (a.includes('mosque') || a.includes('seed') || a.includes('bulk') || a.includes('admin')) return 'act--mosque';
    return 'act--system';
  }

  private categoryOf(log: AuditLogEntry): AuditFilter {
    const a = log.action.toLowerCase();
    if (a.includes('claim')) return 'claims';
    if (a.includes('role')) return 'users';
    if (a.includes('mosque') || a.includes('seed') || a.includes('bulk') || a.includes('admin')) return 'mosques';
    return 'system';
  }
}
