import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NextPrayer, PrayerTimesDaily, JumuahTime } from '../../core/models';
import {
  countdownToJamaat,
  DEFAULT_PRAYER_TIMEZONE,
  formatTime12,
  getPrayerSlots,
  resolveNextPrayer,
} from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-guest-prayer-times',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Prayer Times"
      subtitle="Daily jamaat times, next-prayer countdown, and monthly timetable." />

    <div class="tabs">
      <button type="button" class="tab" [class.tab--on]="view() === 'daily'" (click)="view.set('daily')">Daily</button>
      <button type="button" class="tab" [class.tab--on]="view() === 'monthly'" (click)="loadMonthly()">Monthly</button>
    </div>

    <div *ngIf="view() === 'daily'">
      <div *ngIf="daily() as t" class="next" aria-live="polite">
        <div>
          <p class="next__label">Next prayer</p>
          <p class="next__name" *ngIf="nextPrayer() as np">{{ np.name }} · {{ formatTime(np.jamaat) }}</p>
        </div>
        <div class="next__count">{{ countdown() }}</div>
      </div>

      <div *ngIf="daily() as t" class="table-wrap">
        <table>
          <thead><tr><th>Prayer</th><th>Start</th><th>Jamaat</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of slots(t)" [class.row--next]="isNext(p.name)">
              <td>{{ p.name }}</td>
              <td>{{ formatTime(p.start) }}</td>
              <td class="jamaat">{{ formatTime(p.jamaat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="jumuah().length" class="jumuah">
        <h3>Jumuah</h3>
        <div class="jumuah-grid">
          <div *ngFor="let j of jumuah()" class="j-slot">
            Slot {{ j.slotNumber }}:
            <span *ngIf="j.khutbahTime">Khutbah {{ formatTime(j.khutbahTime) }} · </span>
            Jamaah {{ formatTime(j.jamaatTime) }}
          </div>
        </div>
      </div>
      <p *ngIf="!daily()" class="empty">No published prayer times for today.</p>
    </div>

    <div *ngIf="view() === 'monthly'">
      <div class="month-nav">
        <button type="button" (click)="shiftMonth(-1)">←</button>
        <span>{{ monthLabel() }}</span>
        <button type="button" (click)="shiftMonth(1)">→</button>
      </div>
      <div class="table-wrap scroll">
        <table>
          <thead><tr><th>Date</th><th>Fajr</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of monthly()">
              <td>{{ d.date }}</td>
              <td>{{ formatTime(d.fajrJamaat) }}</td>
              <td>{{ formatTime(d.dhuhrJamaat) }}</td>
              <td>{{ formatTime(d.asrJamaat) }}</td>
              <td>{{ formatTime(d.maghribJamaat) }}</td>
              <td>{{ formatTime(d.ishaJamaat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p *ngIf="!monthly().length" class="empty">No monthly timetable published.</p>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 0.35rem; margin-bottom: 1rem; }
    .tab { padding: 0.4rem 0.85rem; border-radius: 9999px; border: 1px solid #d1d5db; background: #ffffff; color: #4b5563; font-size: 0.75rem; cursor: pointer; }
    .tab--on { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .next {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      margin-bottom: 1rem; padding: 0.85rem 1rem; border-radius: 0.75rem;
      background: #eff6ff; border: 1px solid #bfdbfe;
    }
    .next__label { margin: 0; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: #1e40af; }
    .next__name { margin: 0.2rem 0 0; color: #1e3a8a; font-weight: 700; }
    .next__count { font-variant-numeric: tabular-nums; font-size: 1.35rem; font-weight: 800; color: #1d4ed8; }
    .table-wrap { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .table-wrap.scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { padding: 0.55rem 0.65rem; text-align: left; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
    th { color: #4b5563; font-size: 0.6875rem; text-transform: uppercase; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .row--next td { background: #fffbeb; }
    .jamaat { color: #047857; font-weight: 700; }
    .jumuah { margin-top: 1rem; }
    .jumuah h3 { color: #111827; font-size: 0.875rem; }
    .jumuah-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .j-slot { padding: 0.5rem 0.75rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem; color: #1f2937; font-size: 0.8125rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .month-nav { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; color: #111827; }
    .month-nav button { background: #f3f4f6; border: 1px solid #d1d5db; color: #374151; border-radius: 0.375rem; padding: 0.25rem 0.5rem; cursor: pointer; }
    .month-nav button:hover { background: #e5e7eb; }
    .empty { color: #6b7280; font-size: 0.8125rem; }
  `]
})
export class GuestPrayerTimesComponent implements OnInit, OnDestroy {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  private mosqueId = this.guest.defaultMosqueId;
  private timer?: ReturnType<typeof setInterval>;

  view = signal<'daily' | 'monthly'>('daily');
  daily = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  monthly = signal<PrayerTimesDaily[]>([]);
  nextPrayer = signal<NextPrayer | null>(null);
  countdown = signal('');
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  formatTime = formatTime12;
  slots = getPrayerSlots;

  ngOnInit(): void {
    this.seo.setPage('Prayer Times', 'View daily and monthly mosque prayer timetables.');
    this.guest.getDailyPrayer(this.mosqueId).subscribe(r => {
      this.daily.set(r.times);
      this.jumuah.set(r.jumuah || []);
      this.tick();
    });
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  isNext(name: string): boolean {
    const current = this.nextPrayer()?.name?.replace(' (tomorrow)', '') ?? '';
    return current === name;
  }

  monthLabel(): string {
    return new Date(this.year, this.month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  }

  loadMonthly(): void {
    this.view.set('monthly');
    this.guest.getMonthlyPrayer(this.mosqueId, this.year, this.month).subscribe(r => this.monthly.set(r.days));
  }

  shiftMonth(delta: number): void {
    this.month += delta;
    if (this.month > 12) { this.month = 1; this.year++; }
    if (this.month < 1) { this.month = 12; this.year--; }
    this.loadMonthly();
  }

  private tick(): void {
    const t = this.daily();
    if (!t) {
      this.nextPrayer.set(null);
      this.countdown.set('');
      return;
    }
    const next = resolveNextPrayer(t, DEFAULT_PRAYER_TIMEZONE);
    this.nextPrayer.set(next);
    this.countdown.set(countdownToJamaat(next.jamaat, DEFAULT_PRAYER_TIMEZONE));
  }
}
