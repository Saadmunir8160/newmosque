import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { Announcement } from '../../core/models';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <h2 class="heading-page mb-6 sm:mb-8">Announcements</h2>
      <p *ngIf="loading()" class="text-mos-muted">Loading announcements…</p>
      <p *ngIf="!loading() && !items().length" class="text-mos-muted">No announcements yet.</p>
      <div class="space-y-4">
        <article *ngFor="let a of items()" class="bg-mos-surface p-5 sm:p-6 rounded-2xl border border-mos-border">
          <span *ngIf="a.isFeatured" class="text-sm bg-amber-400 text-mos-text px-2 py-0.5 rounded font-bold">Featured</span>
          <h3 class="text-xl sm:text-2xl font-bold text-white mt-2">{{ a.title }}</h3>
          <p class="text-body-muted mt-2">{{ a.summary }}</p>
          <p class="text-mos-text mt-4 text-base whitespace-pre-line">{{ a.body }}</p>
        </article>
      </div>
    </div>
  `
})
export class AnnouncementsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  items = signal<Announcement[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.mosqueContext.resolve().then(id => {
      this.mosqueService.getAnnouncements(id).subscribe({
        next: a => { this.items.set(a); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }
}
