import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Dua } from '../../core/models';

@Component({
  selector: 'app-member-duas',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Duas Library"
      subtitle="Browse supplications by category — Arabic, transliteration, and meaning." />

    <section class="member-filters">
      <button type="button" class="member-chip" [class.member-chip--active]="!cat()" (click)="filter('')">All</button>
      <button *ngFor="let c of categories()" type="button" class="member-chip"
        [class.member-chip--active]="cat() === c" (click)="filter(c)">
        {{ categoryLabel(c) }}
      </button>
    </section>

    <div *ngIf="loading()" class="member-loading">Loading duas...</div>
    <div *ngIf="!loading() && !filtered().length" class="member-empty">No duas in this category yet.</div>

    <article *ngFor="let d of filtered()" class="member-card">
      <div>
        <span class="member-tag">{{ categoryLabel(d.category) }}</span>
        <h3 class="member-title">{{ d.title }}</h3>
      </div>
      <p class="member-arabic" dir="rtl">{{ d.arabicText }}</p>
      <p *ngIf="d.transliteration" class="member-translit">{{ d.transliteration }}</p>
      <p *ngIf="d.translation" class="member-translation">{{ d.translation }}</p>
      <p *ngIf="sourceOf(d)" class="member-source">{{ sourceOf(d) }}</p>
    </article>
  `,
})
export class MemberDuasComponent implements OnInit {
  private content = inject(ContentService);
  duas = signal<Dua[]>([]);
  categories = signal<string[]>([]);
  cat = signal('');
  loading = signal(true);

  filtered = computed(() => this.duas());

  ngOnInit(): void {
    this.content.getDuaCategories().subscribe({
      next: c => this.categories.set(c),
      error: () => this.categories.set([]),
    });
    this.loadDuas('');
  }

  filter(c: string): void {
    this.cat.set(c);
    this.loadDuas(c);
  }

  categoryLabel(c: string): string {
    return c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  }

  sourceOf(d: Dua & { sourceName?: string; sourceRef?: string }): string {
    const parts = [d.sourceName, d.sourceRef].filter(Boolean);
    return parts.join(' · ');
  }

  private loadDuas(category: string): void {
    this.loading.set(true);
    this.content.getDuas(category || undefined).subscribe({
      next: d => { this.duas.set(d); this.loading.set(false); },
      error: () => { this.duas.set([]); this.loading.set(false); },
    });
  }
}
