import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueEvent } from '../../core/models';
import { environment } from '../../../environments/environment';
import { formatTime12 } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="heading-page mb-6 sm:mb-8">Events</h2>
      <div class="space-y-4">
        <article *ngFor="let e of items()" class="bg-[#064e3b] p-4 sm:p-6 rounded-2xl border border-emerald-800 flex gap-3 sm:gap-4">
          <div class="bg-emerald-900 rounded-xl p-3 sm:p-4 text-center min-w-[64px] sm:min-w-[80px] h-fit shrink-0">
            <p class="text-amber-400 text-xs sm:text-sm font-bold">{{ e.date | date:'MMM' }}</p>
            <p class="text-2xl sm:text-4xl font-bold text-white">{{ e.date | date:'d' }}</p>
          </div>
          <div class="min-w-0">
            <span class="text-sm bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded uppercase">{{ e.eventType }}</span>
            <h3 class="text-xl sm:text-2xl font-bold text-white mt-2">{{ e.title }}</h3>
            <p class="text-emerald-300 text-base">{{ formatTime(e.startTime) }} · {{ e.location }}</p>
            <p class="text-emerald-100 mt-3 text-base">{{ e.description }}</p>
          </div>
        </article>
      </div>
    </div>
  `
})
export class EventsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  items = signal<MosqueEvent[]>([]);
  formatTime = formatTime12;

  ngOnInit(): void {
    this.mosqueService.getEvents(environment.defaultMosqueId)
      .subscribe(e => this.items.set(e));
  }
}
