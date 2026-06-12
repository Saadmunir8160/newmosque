import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { Announcement } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="heading-page mb-6 sm:mb-8">Announcements</h2>
      <div class="space-y-4">
        <article *ngFor="let a of items()" class="bg-[#064e3b] p-5 sm:p-6 rounded-2xl border border-emerald-800">
          <span *ngIf="a.isFeatured" class="text-sm bg-amber-400 text-emerald-950 px-2 py-0.5 rounded font-bold">Featured</span>
          <h3 class="text-xl sm:text-2xl font-bold text-white mt-2">{{ a.title }}</h3>
          <p class="text-body-muted mt-2">{{ a.summary }}</p>
          <p class="text-emerald-100 mt-4 text-base whitespace-pre-line">{{ a.body }}</p>
        </article>
      </div>
    </div>
  `
})
export class AnnouncementsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  items = signal<Announcement[]>([]);

  ngOnInit(): void {
    this.mosqueService.getAnnouncements(environment.defaultMosqueId)
      .subscribe(a => this.items.set(a));
  }
}
