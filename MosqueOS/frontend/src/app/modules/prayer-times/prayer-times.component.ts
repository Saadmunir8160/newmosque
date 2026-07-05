import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { PrayerTimesDaily, JumuahTime } from '../../core/models';
import { formatTime12, getPrayerSlots } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-prayer-times',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="heading-page mb-6 sm:mb-8">Prayer Times</h2>
      <p *ngIf="loading()" class="text-mos-muted">Loading prayer times…</p>
      <div *ngIf="!loading() && !times()" class="text-mos-muted">No prayer times published for today.</div>
      <div *ngIf="times() as t" class="bg-mos-surface rounded-2xl border border-mos-border overflow-x-auto -mx-0">
        <table class="w-full min-w-[280px] text-left text-sm sm:text-base">
          <thead class="bg-slate-100/50 text-mos-muted text-xs sm:text-sm uppercase">
            <tr><th class="p-3 sm:p-4">Prayer</th><th class="p-3 sm:p-4">Start</th><th class="p-3 sm:p-4">Jamaat</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of slots(t)" class="border-t border-mos-border">
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
    </div>
  `
})
export class PrayerTimesComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  times = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  loading = signal(true);
  formatTime = formatTime12;
  slots = getPrayerSlots;

  ngOnInit(): void {
    this.mosqueContext.resolve().then(id => {
      this.mosqueService.getDailyPrayerTimes(id).subscribe({
        next: r => { this.times.set(r.times); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
      this.mosqueService.getJumuahTimes(id).subscribe(j => this.jumuah.set(j));
    });
  }
}
