import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Dua } from '../../core/models';

@Component({
  selector: 'app-guest-duas',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Duas Library"
      subtitle="Public supplications — Arabic, transliteration and meaning." />

    <div class="filters">
      <button type="button" class="chip" [class.chip--on]="!cat()" (click)="filter('')">All</button>
      <button *ngFor="let c of categories()" type="button" class="chip"
        [class.chip--on]="cat() === c" (click)="filter(c)">{{ label(c) }}</button>
    </div>

    <article *ngFor="let d of filtered()" class="card">
      <span class="cat">{{ label(d.category) }}</span>
      <h2>{{ d.title }}</h2>
      <p class="arabic" dir="rtl">{{ d.arabicText }}</p>
      <p *ngIf="d.translation" class="trans">{{ d.translation }}</p>
    </article>
    <p *ngIf="!filtered().length" class="empty">No duas in this category.</p>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
    .chip { font-size: 0.6875rem; padding: 0.3rem 0.55rem; border-radius: 9999px; border: 1px solid #d1d5db; background: #ffffff; color: #4b5563; cursor: pointer; }
    .chip--on { background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .cat { font-size: 0.5625rem; text-transform: uppercase; color: #b45309; font-weight: 800; }
    h2 { margin: 0.25rem 0 0; font-size: 0.9375rem; color: #111827; }
    .arabic { margin: 0.5rem 0 0; font-size: 1.125rem; line-height: 1.75; color: #111827; }
    .trans { margin: 0.35rem 0 0; font-size: 0.8125rem; color: #4b5563; font-style: italic; }
    .empty { color: #6b7280; font-size: 0.8125rem; }
  `]
})
export class GuestDuasComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  all = signal<Dua[]>([]);
  filtered = signal<Dua[]>([]);
  categories = signal<string[]>([]);
  cat = signal('');

  ngOnInit(): void {
    this.seo.setPage('Duas Library', 'Browse Islamic supplications with Arabic text and translation.');
    this.guest.getDuaCategories().subscribe(c => { if (c.length) this.categories.set(c); });
    this.guest.getDuas().subscribe(d => { this.all.set(d); this.filtered.set(d); });
  }

  filter(c: string): void {
    this.cat.set(c);
    this.filtered.set(c ? this.all().filter(d => d.category === c) : this.all());
  }

  label(c: string): string {
    return c.replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
  }
}
