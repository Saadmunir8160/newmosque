import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { PrayerTimesDaily } from '../../core/models';

@Component({
  selector: 'app-prayer-editor-monthly',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-page">
      <header class="editor-head">
        <p class="editor-badge">Prayer Times Editor</p>
        <h1 class="editor-title">Monthly view</h1>
        <p class="editor-sub">Forward planning view for the next 30 days (based on current timetable).</p>
      </header>

      <section class="card" *ngIf="times() as t">
        <p class="note">Phase 1 note: monthly grid uses today's jamaah template for planning preview.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Fajr</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of dates()">
                <td>{{ d }}</td>
                <td>{{ t.fajrJamaat.slice(0,5) }}</td>
                <td>{{ t.dhuhrJamaat.slice(0,5) }}</td>
                <td>{{ t.asrJamaat.slice(0,5) }}</td>
                <td>{{ t.maghribJamaat.slice(0,5) }}</td>
                <td>{{ t.ishaJamaat.slice(0,5) }}</td>
              </tr>
            </tbody>
          </table>
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
    .note { margin: 0 0 0.75rem; font-size: 0.8rem; color: #6ee7b7; }
    .table-wrap { overflow: auto; border: 1px solid #065f46; border-radius: 0.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; color: #d1fae5; }
    th, td { padding: 0.45rem 0.6rem; border-bottom: 1px solid rgba(6,95,70,0.6); text-align: center; }
    th { color: #6ee7b7; position: sticky; top: 0; background: #022c22; }
  `]
})
export class PrayerEditorMonthlyComponent implements OnInit {
  private mosque = inject(MosqueService);
  private mosqueId = environment.defaultMosqueId;
  times = signal<PrayerTimesDaily | null>(null);

  dates = computed(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    }
    return out;
  });

  ngOnInit(): void {
    this.mosque.getDailyPrayerTimes(this.mosqueId).subscribe(r => this.times.set(r.times));
  }
}
