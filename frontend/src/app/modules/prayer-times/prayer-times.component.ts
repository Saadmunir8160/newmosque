import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { PrayerTimesDaily, JumuahTime } from '../../core/models';
import { environment } from '../../../environments/environment';
import { formatTime12, getPrayerSlots } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-prayer-times',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="heading-page mb-6 sm:mb-8">Prayer Times</h2>
      <div *ngIf="times() as t" class="bg-[#064e3b] rounded-2xl border border-emerald-800 overflow-x-auto -mx-0">
        <table class="w-full min-w-[280px] text-left text-sm sm:text-base">
          <thead class="bg-emerald-900/50 text-emerald-300 text-xs sm:text-sm uppercase">
            <tr><th class="p-3 sm:p-4">Prayer</th><th class="p-3 sm:p-4">Start</th><th class="p-3 sm:p-4">Jamaat</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of slots(t)" class="border-t border-emerald-800">
              <td class="p-3 sm:p-4 text-white font-bold text-base sm:text-lg">{{ p.name }}</td>
              <td class="p-3 sm:p-4 text-emerald-200 font-mono text-base sm:text-lg">{{ formatTime(p.start) }}</td>
              <td class="p-3 sm:p-4 text-amber-400 font-mono font-bold text-base sm:text-lg">{{ formatTime(p.jamaat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div *ngIf="jumuah().length" class="mt-8">
        <h3 class="text-amber-400 font-bold uppercase text-base mb-4">Jumuah</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          <div *ngFor="let j of jumuah()" class="bg-[#064e3b] p-5 rounded-xl border border-emerald-800 text-center">
            <p class="text-emerald-300 text-base">Slot {{ j.slotNumber }}</p>
            <p class="text-white text-2xl font-bold">{{ formatTime(j.jamaatTime) }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PrayerTimesComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  times = signal<PrayerTimesDaily | null>(null);
  jumuah = signal<JumuahTime[]>([]);
  formatTime = formatTime12;
  slots = getPrayerSlots;

  ngOnInit(): void {
    const id = environment.defaultMosqueId;
    this.mosqueService.getDailyPrayerTimes(id).subscribe(r => this.times.set(r.times));
    this.mosqueService.getJumuahTimes(id).subscribe(j => this.jumuah.set(j));
  }
}
