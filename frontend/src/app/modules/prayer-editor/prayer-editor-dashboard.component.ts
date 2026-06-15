import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { PrayerTimesDaily } from '../../core/models';

@Component({
  selector: 'app-prayer-editor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Dashboard</h1>
        <p class="editor-sub">Quick view of today's start and jamaah times.</p>
      </header>

      <section class="card" *ngIf="times() as t">
        <h2 class="card-title">Today's timetable</h2>
        <div class="rows">
          <div class="row"><span>Fajr</span><span>{{ t.fajrStart.slice(0,5) }} / {{ t.fajrJamaat.slice(0,5) }}</span></div>
          <div class="row"><span>Dhuhr</span><span>{{ t.dhuhrStart.slice(0,5) }} / {{ t.dhuhrJamaat.slice(0,5) }}</span></div>
          <div class="row"><span>Asr</span><span>{{ t.asrStart.slice(0,5) }} / {{ t.asrJamaat.slice(0,5) }}</span></div>
          <div class="row"><span>Maghrib</span><span>{{ t.maghribStart.slice(0,5) }} / {{ t.maghribJamaat.slice(0,5) }}</span></div>
          <div class="row"><span>Isha</span><span>{{ t.ishaStart.slice(0,5) }} / {{ t.ishaJamaat.slice(0,5) }}</span></div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .editor-page { display: flex; flex-direction: column; gap: 1rem; }
    .editor-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .editor-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .editor-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .card-title { margin: 0 0 0.75rem; color: #fff; font-size: 1rem; }
    .rows { display: flex; flex-direction: column; gap: 0.5rem; }
    .row { display: flex; justify-content: space-between; color: #d1fae5; font-size: 0.875rem; border-bottom: 1px solid rgba(6,95,70,0.6); padding-bottom: 0.4rem; }
  `]
})
export class PrayerEditorDashboardComponent implements OnInit {
  private mosque = inject(MosqueService);
  times = signal<PrayerTimesDaily | null>(null);
  private mosqueId = environment.defaultMosqueId;

  ngOnInit(): void {
    this.mosque.getDailyPrayerTimes(this.mosqueId).subscribe(r => this.times.set(r.times));
  }
}
