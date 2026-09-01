import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrayerEditorService, PrayerAuditLog } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';

@Component({
  selector: 'app-prayer-editor-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ped">
      <header>
        <p class="ped-label">Prayer Times Editor</p>
        <h1 class="ped-title">Audit Log</h1>
        <p class="ped-sub">Complete history of prayer timetable changes (user, action, old → new).</p>
      </header>

      <p *ngIf="!logs().length" class="ped-empty">No audit entries yet.</p>

      <article class="ped-card" *ngFor="let log of logs()">
        <div class="log-top">
          <span class="ped-badge" *ngIf="log.actionType">{{ log.actionType }}</span>
          <time class="log-time">{{ log.createdAt | date:'medium' }}</time>
        </div>
        <p class="log-desc">{{ log.changeDescription }}</p>
        <div class="log-meta">
          <span *ngIf="log.date">Date: {{ log.date }}</span>
          <span *ngIf="log.changedById">User: {{ shortUser(log.changedById) }}</span>
        </div>
        <div class="diff" *ngIf="log.oldValue || log.newValue">
          <div *ngIf="log.oldValue"><span class="diff__label">Old</span><code>{{ log.oldValue }}</code></div>
          <div *ngIf="log.newValue"><span class="diff__label">New</span><code>{{ log.newValue }}</code></div>
        </div>
      </article>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .ped {
      --ped-ink: #0f172a; --ped-muted: #64748b; --ped-border: #e2e8f0; --ped-primary: #0f4c3a;
      display: flex; flex-direction: column; gap: 0.85rem; padding-bottom: 2rem; color: var(--ped-ink);
    }
    .ped-label { margin: 0; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ped-primary); }
    .ped-title { margin: 0.35rem 0 0; font-size: clamp(1.65rem, 3vw, 2rem); font-weight: 800; letter-spacing: -0.03em; color: var(--ped-ink); line-height: 1.15; }
    .ped-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--ped-muted); max-width: 36rem; }
    .ped-card {
      background: #fff; border: 1px solid var(--ped-border); border-radius: 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); padding: 1.1rem 1.25rem;
    }
    .log-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .ped-badge {
      display: inline-flex; padding: 0.3rem 0.65rem; border-radius: 999px;
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
      background: rgba(15, 76, 58, 0.1); color: var(--ped-primary);
    }
    .log-time { font-size: 0.75rem; color: var(--ped-muted); }
    .log-desc { margin: 0.55rem 0 0; font-size: 0.9rem; color: var(--ped-ink); line-height: 1.45; }
    .log-meta {
      display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 0.4rem;
      font-size: 0.78rem; color: var(--ped-muted);
    }
    .diff {
      margin-top: 0.65rem; display: flex; flex-direction: column; gap: 0.35rem;
      padding: 0.65rem 0.75rem; border-radius: 10px; background: #f8fafc; border: 1px solid var(--ped-border);
    }
    .diff__label {
      display: inline-block; min-width: 2.4rem; font-size: 0.65rem; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.04em; color: var(--ped-muted); margin-right: 0.45rem;
    }
    .diff code {
      font-size: 0.75rem; color: #334155; word-break: break-word; font-family: ui-monospace, Menlo, Consolas, monospace;
    }
    .ped-empty { margin: 0.75rem 0 0; color: var(--ped-muted); font-size: 0.9rem; }
  `],
})
export class PrayerEditorAuditComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  logs = signal<PrayerAuditLog[]>([]);

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.editor.getAuditLog(id).subscribe(l => this.logs.set(l));
    });
  }

  shortUser(id: string): string {
    if (!id) return '—';
    return id.length > 12 ? id.slice(0, 8) + '…' : id;
  }
}
