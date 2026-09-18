import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PrayerEditorService } from '../../core/services/prayer-editor.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PrayerTimesDaily } from '../../core/models';
import { appDateString } from '../../core/utils/date.utils';

@Component({
  selector: 'app-prayer-editor-daily',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="ped">
      <header class="ped-top">
        <div>
          <p class="ped-label">Prayer Times Editor</p>
          <h1 class="ped-title">Daily Prayers</h1>
          <p class="ped-sub">Fajr, Dhuhr, Asr, Maghrib, Isha — start and jamaat times.</p>
        </div>
      </header>

      <div class="ped-toolbar">
        <label class="ped-field">
          <span class="ped-field__label">Date</span>
          <input
            class="ped-input"
            type="date"
            [(ngModel)]="selectedDate"
            (ngModelChange)="load()"
            aria-label="Select date" />
        </label>
        <button type="button" class="ped-btn ped-btn--ghost ped-btn--sm" (click)="goToday()">Today</button>
        <span
          *ngIf="times()?.status as st"
          class="ped-badge"
          [class.ped-badge--ok]="st === 'Published'"
          [class.ped-badge--draft]="st === 'Draft'">
          {{ st }}
        </span>
        <p class="ped-toolbar__hint" *ngIf="mosqueName()">{{ mosqueName() }}</p>
      </div>

      <section class="ped-card" *ngIf="times() as t">
        <div class="ped-card__head">
          <div>
            <h2 class="ped-card__title">Schedule for {{ selectedDate | date:'mediumDate' }}</h2>
            <p class="ped-card__sub">Edit start and jamaat, then save as draft or publish.</p>
          </div>
        </div>

        <div class="ped-table-head" aria-hidden="true">
          <span>Prayer</span>
          <span>Start Time</span>
          <span>Jamaat Time</span>
        </div>

        <div class="ped-row" *ngFor="let p of prayers">
          <div class="ped-row__prayer">
            <span class="ped-icon" [attr.data-prayer]="p.key" aria-hidden="true">{{ p.icon }}</span>
            <span class="ped-row__name">{{ p.label }}</span>
          </div>
          <label class="ped-time">
            <span class="ped-time__label">Start</span>
            <input
              class="ped-input ped-input--time"
              type="time"
              [ngModel]="toInput(t[p.start])"
              (ngModelChange)="setTime(t, p.start, $event)"
              [attr.aria-label]="p.label + ' start time'" />
          </label>
          <label class="ped-time">
            <span class="ped-time__label">Jamaat</span>
            <input
              class="ped-input ped-input--time"
              type="time"
              [ngModel]="toInput(t[p.jamaat])"
              (ngModelChange)="setTime(t, p.jamaat, $event)"
              [attr.aria-label]="p.label + ' jamaat time'" />
          </label>
        </div>

        <footer class="ped-actions">
          <button type="button" class="ped-btn ped-btn--ghost" [disabled]="busy()" (click)="save(false)">
            Save draft
          </button>
          <button type="button" class="ped-btn" [disabled]="busy()" (click)="save(true)">
            Save &amp; publish
          </button>
          <button type="button" class="ped-btn ped-btn--outline" [disabled]="busy()" (click)="publish()">
            Publish
          </button>
        </footer>
      </section>

      <p *ngIf="!times()" class="ped-empty">Loading timetable…</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    .ped {
      --ped-card: #ffffff;
      --ped-ink: #0f172a;
      --ped-muted: #64748b;
      --ped-border: #e2e8f0;
      --ped-primary: #0f4c3a;
      --ped-primary-hover: #0a3d2e;
      --ped-radius: 16px;
      --ped-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
      padding-bottom: 2rem;
      color: var(--ped-ink);
    }

    .ped-label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ped-primary);
    }

    .ped-title {
      margin: 0.35rem 0 0;
      font-size: clamp(1.65rem, 3vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--ped-ink);
      line-height: 1.15;
    }

    .ped-sub {
      margin: 0.4rem 0 0;
      font-size: 0.9rem;
      color: var(--ped-muted);
      max-width: 36rem;
    }

    .ped-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.85rem;
    }

    .ped-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .ped-field__label,
    .ped-time__label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ped-muted);
    }

    @media (min-width: 720px) {
      .ped-time__label { display: none; }
    }

    .ped-input {
      min-width: 10.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 12px;
      border: 1px solid var(--ped-border);
      background: #fff;
      color: var(--ped-ink);
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
      box-sizing: border-box;
    }

    .ped-input:focus {
      border-color: var(--ped-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12);
    }

    .ped-input--time {
      min-width: 0;
      width: 100%;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .ped-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #f1f5f9;
      color: #475569;
      margin-bottom: 0.15rem;
    }

    .ped-badge--ok {
      background: rgba(22, 101, 52, 0.12);
      color: #166534;
    }

    .ped-badge--draft {
      background: rgba(180, 83, 9, 0.12);
      color: #92400e;
    }

    .ped-toolbar__hint {
      margin: 0 0 0.35rem auto;
      font-size: 0.8rem;
      color: var(--ped-muted);
      font-weight: 600;
    }

    .ped-card {
      background: var(--ped-card);
      border: 1px solid var(--ped-border);
      border-radius: var(--ped-radius);
      box-shadow: var(--ped-shadow);
      padding: 1.25rem 1.25rem 1.35rem;
    }

    .ped-card__head { margin-bottom: 1.1rem; }

    .ped-card__title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--ped-ink);
      letter-spacing: -0.02em;
    }

    .ped-card__sub {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--ped-muted);
    }

    .ped-table-head {
      display: none;
      grid-template-columns: 1.35fr 1fr 1fr;
      gap: 0.75rem;
      padding: 0 1rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ped-muted);
    }

    @media (min-width: 720px) {
      .ped-table-head { display: grid; }
    }

    .ped-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.55rem;
      padding: 0.9rem 1rem;
      margin-bottom: 0.55rem;
      border-radius: 14px;
      border: 1px solid var(--ped-border);
      background: #fff;
      transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .ped-row:hover {
      background: #f8fafc;
      border-color: rgba(15, 76, 58, 0.22);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }

    @media (min-width: 720px) {
      .ped-row {
        grid-template-columns: 1.35fr 1fr 1fr;
        align-items: center;
        gap: 0.75rem;
      }
    }

    .ped-row__prayer {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .ped-icon {
      width: 2.15rem;
      height: 2.15rem;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .ped-icon[data-prayer='fajr'] { background: #e0f2fe; }
    .ped-icon[data-prayer='dhuhr'] { background: #fef3c7; }
    .ped-icon[data-prayer='asr'] { background: #ffedd5; }
    .ped-icon[data-prayer='maghrib'] { background: #fce7f3; }
    .ped-icon[data-prayer='isha'] { background: #ede9fe; }

    .ped-row__name {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--ped-ink);
    }

    .ped-time {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .ped-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-top: 1.15rem;
      padding-top: 1.1rem;
      border-top: 1px solid var(--ped-border);
    }

    .ped-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.15rem;
      border-radius: 999px;
      background: var(--ped-primary);
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.18s ease, transform 0.18s ease, opacity 0.18s;
    }

    .ped-btn:hover:not(:disabled) {
      background: var(--ped-primary-hover);
      transform: translateY(-1px);
    }

    .ped-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }

    .ped-btn--ghost {
      background: #fff;
      color: var(--ped-ink);
      border: 1px solid var(--ped-border);
    }

    .ped-btn--ghost:hover:not(:disabled) {
      background: #f8fafc;
    }

    .ped-btn--sm {
      padding: 0.4rem 0.85rem;
      font-size: 0.75rem;
    }

    .ped-btn--outline {
      background: #fff;
      color: var(--ped-primary);
      border: 1px solid rgba(15, 76, 58, 0.28);
    }

    .ped-btn--outline:hover:not(:disabled) {
      background: rgba(15, 76, 58, 0.06);
    }

    .ped-empty {
      margin: 0;
      padding: 1.5rem 0;
      color: var(--ped-muted);
      font-size: 0.9rem;
    }
  `],
})
export class PrayerEditorDailyComponent implements OnInit {
  private editor = inject(PrayerEditorService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  times = signal<PrayerTimesDaily | null>(null);
  selectedDate = appDateString();
  busy = signal(false);
  private mosqueId = 1;

  prayers = [
    { key: 'fajr', label: 'Fajr', icon: '🌅', start: 'fajrStart' as const, jamaat: 'fajrJamaat' as const },
    { key: 'dhuhr', label: 'Dhuhr', icon: '☀️', start: 'dhuhrStart' as const, jamaat: 'dhuhrJamaat' as const },
    { key: 'asr', label: 'Asr', icon: '🌤', start: 'asrStart' as const, jamaat: 'asrJamaat' as const },
    { key: 'maghrib', label: 'Maghrib', icon: '🌇', start: 'maghribStart' as const, jamaat: 'maghribJamaat' as const },
    { key: 'isha', label: 'Isha', icon: '🌙', start: 'ishaStart' as const, jamaat: 'ishaJamaat' as const },
  ];

  mosqueName(): string {
    return this.mosqueCtx.mosque()?.name ?? '';
  }

  ngOnInit(): void {
    const qId = parseInt(this.route.snapshot.queryParamMap.get('mosqueId') || '', 10);
    if (!isNaN(qId) && qId > 0) {
      this.mosqueId = qId;
      this.load();
    } else {
      this.mosqueCtx.resolve().then(id => { this.mosqueId = id; this.load(); });
    }
  }

  load(): void {
    this.editor.getDaily(this.mosqueId, this.selectedDate).subscribe({
      next: r => this.times.set(r.times ?? this.emptyTimes()),
      error: () => this.times.set(this.emptyTimes()),
    });
  }

  goToday(): void {
    this.selectedDate = appDateString();
    this.load();
  }

  toInput(t: string): string { return t?.slice(0, 5) || ''; }

  setTime(t: PrayerTimesDaily, field: keyof PrayerTimesDaily, val: string): void {
    if (!val) return;
    const full = val.length === 5 ? val + ':00' : val;
    if (field === 'fajrStart') t.fajrStart = full;
    else if (field === 'fajrJamaat') t.fajrJamaat = full;
    else if (field === 'dhuhrStart') t.dhuhrStart = full;
    else if (field === 'dhuhrJamaat') t.dhuhrJamaat = full;
    else if (field === 'asrStart') t.asrStart = full;
    else if (field === 'asrJamaat') t.asrJamaat = full;
    else if (field === 'maghribStart') t.maghribStart = full;
    else if (field === 'maghribJamaat') t.maghribJamaat = full;
    else if (field === 'ishaStart') t.ishaStart = full;
    else if (field === 'ishaJamaat') t.ishaJamaat = full;
  }

  save(publish: boolean): void {
    const t = this.times();
    if (!t) return;
    this.busy.set(true);
    this.editor.saveDaily(this.mosqueId, { ...t, date: this.selectedDate }, publish).subscribe({
      next: row => {
        this.busy.set(false);
        this.times.set(row);
        this.snack.open(publish ? 'Published' : 'Draft saved', 'OK', { duration: 3000 });
      },
      error: () => { this.busy.set(false); this.snack.open('Save failed', 'OK', { duration: 4000 }); },
    });
  }

  publish(): void {
    this.busy.set(true);
    this.editor.publishDaily(this.mosqueId, this.selectedDate).subscribe({
      next: row => {
        this.busy.set(false);
        this.times.set(row);
        this.snack.open('Published', 'OK', { duration: 3000 });
      },
      error: () => { this.busy.set(false); this.snack.open('Publish failed — save draft first', 'OK', { duration: 4000 }); },
    });
  }

  private emptyTimes(): PrayerTimesDaily {
    const base = '00:00:00';
    return {
      id: 0, mosqueId: this.mosqueId, date: this.selectedDate, status: 'Draft',
      fajrStart: base, fajrJamaat: base,
      dhuhrStart: base, dhuhrJamaat: base,
      asrStart: base, asrJamaat: base,
      maghribStart: base, maghribJamaat: base,
      ishaStart: base, ishaJamaat: base,
    };
  }
}
