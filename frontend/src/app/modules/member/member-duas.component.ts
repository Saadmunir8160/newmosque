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

    <section class="filters">
      <button type="button" class="chip" [class.chip--active]="!cat()" (click)="filter('')">All</button>
      <button *ngFor="let c of categories()" type="button" class="chip"
        [class.chip--active]="cat() === c" (click)="filter(c)">
        {{ categoryLabel(c) }}
      </button>
    </section>

    <div *ngIf="loading()" class="state">Loading duas...</div>
    <div *ngIf="!loading() && !filtered().length" class="state">No duas in this category yet.</div>

    <article *ngFor="let d of filtered()" class="dua-card">
      <div class="dua-card__head">
        <span class="dua-card__cat">{{ categoryLabel(d.category) }}</span>
        <h3 class="dua-card__title">{{ d.title }}</h3>
      </div>
      <p class="dua-card__arabic" dir="rtl">{{ d.arabicText }}</p>
      <p *ngIf="d.transliteration" class="dua-card__translit">{{ d.transliteration }}</p>
      <p *ngIf="d.translation" class="dua-card__translation">{{ d.translation }}</p>
      <p *ngIf="sourceOf(d)" class="dua-card__source">{{ sourceOf(d) }}</p>
    </article>
  `,
  styles: [`
    .filters {
      display: flex; flex-wrap: wrap; gap: 0.5rem;
      margin-bottom: 1rem; padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(212,175,55,0.15);
    }
    .chip {
      font-size: 0.75rem; font-weight: 600; color: rgba(167,243,208,0.85);
      background: rgba(0,0,0,0.25); border: 1px solid rgba(16,185,129,0.3);
      border-radius: 9999px; padding: 0.35rem 0.75rem; cursor: pointer;
    }
    .chip:hover { border-color: rgba(212,175,55,0.45); color: #fcd34d; }
    .chip--active {
      color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border-color: transparent; font-weight: 700;
    }
    .state {
      padding: 1.5rem; text-align: center; color: rgba(167,243,208,0.7);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; margin-bottom: 1rem;
    }
    .dua-card {
      margin-bottom: 0.875rem; padding: 1rem 1.125rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem;
    }
    .dua-card__head { margin-bottom: 0.75rem; }
    .dua-card__cat {
      display: inline-block; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #fcd34d; background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.28); padding: 0.15rem 0.45rem; border-radius: 9999px;
    }
    .dua-card__title { margin: 0.4rem 0 0; font-size: 1rem; font-weight: 700; color: #fff; }
    .dua-card__arabic {
      margin: 0; font-size: 1.35rem; line-height: 1.85; color: #fff;
      font-family: 'Traditional Arabic', 'Scheherazade New', serif;
    }
    .dua-card__translit {
      margin: 0.65rem 0 0; font-size: 0.8125rem; font-style: italic;
      color: rgba(167,243,208,0.8); line-height: 1.55;
    }
    .dua-card__translation {
      margin: 0.5rem 0 0; font-size: 0.875rem; line-height: 1.6;
      color: rgba(167,243,208,0.92);
    }
    .dua-card__source {
      margin: 0.65rem 0 0; font-size: 0.6875rem; color: rgba(212,175,55,0.75);
    }
  `]
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
