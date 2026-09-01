import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { NextPrayer, PrayerTimesDaily, JumuahTime } from '../../core/models';
import {
  countdownToJamaat,
  formatTime12,
  getPrayerSlots,
  resolveNextPrayer,
  DEFAULT_PRAYER_TIMEZONE,
} from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-prayer-times',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pt-page">
      <header class="pt-head">
        <h2 class="heading-page">Prayer Times</h2>
        <p class="pt-sub">Daily jamaat timetable{{ timezoneLabel ? ' · ' + timezoneLabel : '' }}</p>
      </header>

      <div class="pt-tabs" role="tablist">
        <button type="button" class="pt-tab" [class.pt-tab--on]="view() === 'daily'" (click)="view.set('daily')">Daily</button>
        <button type="button" class="pt-tab" [class.pt-tab--on]="view() === 'monthly'" (click)="showMonthly()">Monthly</button>
      </div>

      <p *ngIf="loading()" class="text-mos-muted">Loading prayer times…</p>

      <ng-container *ngIf="view() === 'daily' && !loading()">
        <div *ngIf="nextPrayer() as np" class="pt-next">
          <div>
            <p class="pt-next__label">Next prayer</p>
            <p class="pt-next__name">{{ np.name }} · {{ formatTime(np.jamaat) }}</p>
          </div>
          <div class="pt-next__count" aria-live="polite">{{ countdown() }}</div>
        </div>

        <div *ngIf="!times()" class="pt-empty">No prayer times published for today.</div>
        <div *ngIf="times() as t" class="bg-mos-surface rounded-2xl border border-mos-border overflow-x-auto">
          <table class="w-full min-w-[280px] text-left text-sm sm:text-base">
            <thead class="bg-slate-100/50 text-mos-muted text-xs sm:text-sm uppercase">
              <tr><th class="p-3 sm:p-4">Prayer</th><th class="p-3 sm:p-4">Start</th><th class="p-3 sm:p-4">Jamaat</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of slots(t)" class="border-t border-mos-border"
                [class.pt-row--next]="isNextPrayer(p.name)">
                <td class="p-3 sm:p-4 text-white font-bold text-base sm:text-lg">{{ p.name }}</td>
                <td class="p-3 sm:p-4 text-mos-muted font-mono text-base sm:text-lg">{{ formatTime(p.start) }}</td>
                <td class="p-3 sm:p-4 text-mos-accent font-mono font-bold text-base sm:text-lg">{{ formatTime(p.jamaat) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="jumuah().length" class="mt-8">
          <h3 class="text-mos-accent font-bold uppercase text-base mb-4">Jumuah</h3>
          <div class="grid sm:grid-cols-2 gap-4">
            <div *ngFor="let j of jumuah()" class="bg-mos-surface p-5 rounded-xl border border-mos-border text-center">
              <p class="text-mos-muted text-base">Slot {{ j.slotNumber }}</p>
              <p class="text-white text-2xl font-bold">{{ formatTime(j.jamaatTime) }}</p>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="view() === 'monthly' && !loading()">
        <div class="pt-month-nav">
          <button type="button" class="pt-nav-btn" (click)="shiftMonth(-1)">←</button>
          <span>{{ monthLabel() }}</span>
          <button type="button" class="pt-nav-btn" (click)="shiftMonth(1)">→</button>
        </div>
        <div *ngIf="!monthly().length" class="pt-empty">No monthly timetable published for this month.</div>
        <div *ngIf="monthly().length" class="bg-mos-surface rounded-2xl border border-mos-border overflow-x-auto">
          <table class="w-full min-w-[520px] text-left text-sm">
            <thead class="bg-slate-100/50 text-mos-muted text-xs uppercase">
              <tr>
                <th class="p-3">Date</th><th class="p-3">Fajr</th><th class="p-3">Dhuhr</th>
                <th class="p-3">Asr</th><th class="p-3">Maghrib</th><th class="p-3">Isha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of monthly()" class="border-t border-mos-border">
                <td class="p-3 text-white font-semibold">{{ d.date | date:'mediumDate' }}</td>
                <td class="p-3 text-mos-accent font-mono">{{ formatTime(d.fajrJamaat) }}</td>
                <td class="p-3 text-mos-accent font-mono">{{ formatTime(d.dhuhrJamaat) }}</td>
                <td class="p-3 text-mos-accent font-mono">{{ formatTime(d.asrJamaat) }}</td>
                <td class="p-3 text-mos-accent font-mono">{{ formatTime(d.maghribJamaat) }}</td>
                <td class="p-3 text-mos-accent font-mono">{{ formatTime(d.ishaJamaat) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .pt-page { width: 100%; }
    .pt-head { margin-bottom: 1.25rem; }
    .pt-sub { margin: 0.35rem 0 0; color: var(--mos-text-secondary, #94a3b8); font-size: 0.9rem; }
    .pt-tabs { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
    .pt-tab {
      padding: 0.45rem 0.95rem; border-radius: 999px; border: 1px solid var(--mos-border, #334155);
      background: transparent; color: var(--mos-text-secondary, #94a3b8); font-size: 0.8rem; font-weight: 700; cursor: pointer;
    }
    .pt-tab--on { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); }
    .pt-next {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
      margin-bottom: 1rem; padding: 0.9rem 1.1rem; border-radius: 14px;
      background: linear-gradient(120deg, rgba(15,76,58,0.35), rgba(245,158,11,0.12));
      border: 1px solid rgba(245,158,11,0.25);
    }
    .pt-next__label { margin: 0; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #6ee7b7; }
    .pt-next__name { margin: 0.2rem 0 0; font-size: 1.15rem; font-weight: 800; color: #fff; }
    .pt-next__count { font-family: ui-monospace, monospace; font-size: 1.5rem; font-weight: 800; color: #fbbf24; }
    .pt-empty { color: var(--mos-text-secondary, #94a3b8); padding: 1rem 0; }
    .pt-row--next td { background: rgba(245, 158, 11, 0.08); }
    .pt-month-nav { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.85rem; color: #fff; font-weight: 700; }
    .pt-nav-btn {
      background: rgba(0,0,0,0.25); border: 1px solid rgba(245,158,11,0.35); color: #fbbf24;
      border-radius: 8px; padding: 0.25rem 0.65rem; cursor: pointer;
    }
  `],
})
export class PrayerTimesComponent implements OnInit, OnDestroy {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  times = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  monthly = signal<PrayerTimesDaily[]>([]);
  nextPrayer = signal<NextPrayer | null>(null);
  countdown = signal('');
  loading = signal(true);
  view = signal<'daily' | 'monthly'>('daily');
  formatTime = formatTime12;
  slots = getPrayerSlots;
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  timezoneLabel = '';
  private mosqueId = 1;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.mosqueContext.resolve().then(id => {
      this.mosqueId = id;
      this.timezoneLabel = this.mosqueContext.mosque()?.timezone || DEFAULT_PRAYER_TIMEZONE;
      this.loadDaily();
    });
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  monthLabel(): string {
    return new Date(this.year, this.month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  }

  showMonthly(): void {
    this.view.set('monthly');
    this.loadMonthly();
  }

  shiftMonth(delta: number): void {
    this.month += delta;
    if (this.month > 12) { this.month = 1; this.year++; }
    if (this.month < 1) { this.month = 12; this.year--; }
    this.loadMonthly();
  }

  private loadDaily(): void {
    this.loading.set(true);
    this.mosqueService.getDailyPrayerTimes(this.mosqueId).subscribe({
      next: r => {
        this.times.set(r.times);
        this.loading.set(false);
        this.tick();
      },
      error: () => this.loading.set(false),
    });
    this.mosqueService.getJumuahTimes(this.mosqueId).subscribe(j => this.jumuah.set(j));
  }

  private loadMonthly(): void {
    this.loading.set(true);
    this.mosqueService.getMonthlyPrayerTimes(this.mosqueId, this.year, this.month).subscribe({
      next: rows => {
        this.monthly.set(rows ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.monthly.set([]);
        this.loading.set(false);
      },
    });
  }

  isNextPrayer(name: string): boolean {
    const current = this.nextPrayer()?.name?.replace(' (tomorrow)', '') ?? '';
    return current === name;
  }

  private tick(): void {
    const t = this.times();
    if (!t) {
      this.nextPrayer.set(null);
      this.countdown.set('');
      return;
    }
    const tz = this.mosqueContext.mosque()?.timezone || DEFAULT_PRAYER_TIMEZONE;
    const next = resolveNextPrayer(t, tz);
    this.nextPrayer.set(next);
    this.countdown.set(countdownToJamaat(next.jamaat, tz));
  }
}
