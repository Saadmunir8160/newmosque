import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrayerEditorService } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PrayerTimesDaily } from '../../core/models';

@Component({
  selector: 'app-prayer-editor-monthly',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ped">
      <header class="ped-top">
        <div>
          <p class="ped-label">Prayer Times Editor</p>
          <h1 class="ped-title">Monthly view</h1>
          <p class="ped-sub">Published and draft daily rows for the selected month (exceptions applied).</p>
        </div>
        <div class="month-nav">
          <button type="button" class="ped-btn ped-btn--ghost" (click)="shiftMonth(-1)">‹</button>
          <label class="field">
            <input class="ped-input" type="month" [ngModel]="monthInput" (ngModelChange)="onMonthInput($event)" />
          </label>
          <button type="button" class="ped-btn ped-btn--ghost" (click)="shiftMonth(1)">›</button>
        </div>
      </header>

      <section class="ped-card">
        <p class="note" *ngIf="loading()">Loading {{ year }}-{{ month | number:'2.0' }}…</p>
        <p class="note" *ngIf="!loading() && !rows().length">No daily rows for this month yet. Generate from a template or edit daily.</p>
        <div class="table-wrap" *ngIf="rows().length">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Status</th>
                <th>Fajr</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of rows()">
                <td class="date">{{ r.date | date:'EEE d MMM' }}</td>
                <td><span class="st" [class.st--ok]="r.status === 'Published'">{{ r.status || '—' }}</span></td>
                <td>{{ slice(r.fajrJamaat) }}</td>
                <td>{{ slice(r.dhuhrJamaat) }}</td>
                <td>{{ slice(r.asrJamaat) }}</td>
                <td>{{ slice(r.maghribJamaat) }}</td>
                <td>{{ slice(r.ishaJamaat) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .ped {
      --ped-ink: #0f172a; --ped-muted: #64748b; --ped-border: #e2e8f0; --ped-primary: #0f4c3a;
      display: flex; flex-direction: column; gap: 1.35rem; padding-bottom: 2rem; color: var(--ped-ink);
    }
    .ped-top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .ped-label { margin: 0; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ped-primary); }
    .ped-title { margin: 0.35rem 0 0; font-size: clamp(1.65rem, 3vw, 2rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; }
    .ped-sub { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--ped-muted); max-width: 36rem; }
    .month-nav { display: flex; align-items: center; gap: 0.45rem; }
    .field { display: flex; flex-direction: column; }
    .ped-input {
      padding: 0.55rem 0.75rem; border-radius: 10px; border: 1px solid var(--ped-border);
      font-size: 0.9rem; font-family: inherit; background: #fff;
    }
    .ped-btn {
      display: inline-flex; align-items: center; justify-content: center; min-width: 2.4rem; height: 2.4rem;
      border-radius: 999px; background: var(--ped-primary); color: #fff; font-size: 1rem; font-weight: 700;
      border: none; cursor: pointer; font-family: inherit;
    }
    .ped-btn--ghost { background: #fff; color: var(--ped-ink); border: 1px solid var(--ped-border); }
    .ped-card {
      background: #fff; border: 1px solid var(--ped-border); border-radius: 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); padding: 1.25rem;
    }
    .note { margin: 0 0 0.85rem; font-size: 0.85rem; color: var(--ped-muted); }
    .table-wrap { overflow: auto; border: 1px solid var(--ped-border); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--ped-border); text-align: center; font-variant-numeric: tabular-nums; }
    th {
      font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--ped-muted); background: #f8fafc; position: sticky; top: 0;
    }
    .date { font-weight: 700; text-align: left; color: var(--ped-primary); white-space: nowrap; }
    .st { font-size: 0.72rem; font-weight: 700; color: #64748b; }
    .st--ok { color: #166534; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
  `],
})
export class PrayerEditorMonthlyComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);

  rows = signal<PrayerTimesDaily[]>([]);
  loading = signal(false);
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  private mosqueId = 1;

  get monthInput(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.load();
    });
  }

  onMonthInput(value: string): void {
    if (!value || value.length < 7) return;
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return;
    this.year = y;
    this.month = m;
    this.load();
  }

  shiftMonth(delta: number): void {
    const d = new Date(this.year, this.month - 1 + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth() + 1;
    this.load();
  }

  slice(t?: string): string {
    return (t || '').slice(0, 5) || '—';
  }

  load(): void {
    this.loading.set(true);
    this.editor.getMonthly(this.mosqueId, this.year, this.month).subscribe({
      next: list => {
        this.rows.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }
}
