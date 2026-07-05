import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PrayerTimesDaily, JumuahTime } from '../../core/models';
import { formatTime12, getPrayerSlots } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-guest-prayer-times',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Guest" title="Prayer Times"
      subtitle="Daily jamaat times and monthly timetable — read only." />

    <div class="tabs">
      <button type="button" class="tab" [class.tab--on]="view() === 'daily'" (click)="view.set('daily')">Daily</button>
      <button type="button" class="tab" [class.tab--on]="view() === 'monthly'" (click)="loadMonthly()">Monthly</button>
    </div>

    <div *ngIf="view() === 'daily'">
      <div *ngIf="daily() as t" class="table-wrap">
        <table>
          <thead><tr><th>Prayer</th><th>Start</th><th>Jamaat</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of slots(t)">
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
          <div *ngFor="let j of jumuah()" class="j-slot">Slot {{ j.slotNumber }}: {{ formatTime(j.jamaatTime) }}</div>
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
    .tab { padding: 0.4rem 0.85rem; border-radius: 9999px; border: 1px solid rgba(16,185,129,0.3); background: transparent; color: #a7f3d0; font-size: 0.75rem; cursor: pointer; }
    .tab--on { background: rgba(212,175,55,0.2); color: #fcd34d; border-color: rgba(212,175,55,0.5); }
    .table-wrap { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; overflow: hidden; }
    .table-wrap.scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { padding: 0.55rem 0.65rem; text-align: left; border-bottom: 1px solid rgba(16,185,129,0.12); color: #ecfdf5; }
    th { color: #6ee7b7; font-size: 0.6875rem; text-transform: uppercase; }
    .jamaat { color: #fcd34d; font-weight: 700; }
    .jumuah { margin-top: 1rem; }
    .jumuah h3 { color: #fcd34d; font-size: 0.875rem; }
    .jumuah-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .j-slot { padding: 0.5rem 0.75rem; background: rgba(2,44,34,0.85); border-radius: 0.5rem; color: #fff; font-size: 0.8125rem; }
    .month-nav { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; color: #fff; }
    .month-nav button { background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.3); color: #fcd34d; border-radius: 0.375rem; padding: 0.25rem 0.5rem; cursor: pointer; }
    .empty { color: rgba(167,243,208,0.65); font-size: 0.8125rem; }
  `]
})
export class GuestPrayerTimesComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  private mosqueId = this.guest.defaultMosqueId;

  view = signal<'daily' | 'monthly'>('daily');
  daily = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  monthly = signal<PrayerTimesDaily[]>([]);
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  formatTime = formatTime12;
  slots = getPrayerSlots;

  ngOnInit(): void {
    this.seo.setPage('Prayer Times', 'View daily and monthly mosque prayer timetables.');
    this.guest.getDailyPrayer(this.mosqueId).subscribe(r => {
      this.daily.set(r.times);
      this.jumuah.set(r.jumuah || []);
    });
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
}
