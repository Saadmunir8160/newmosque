import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Dua } from '../../core/models';

const DEFAULT_CATEGORIES = [
  'general', 'morning', 'wudu', 'after_prayer', 'mosque', 'food', 'sleep', 'travel'
] as const;

@Component({
  selector: 'app-content-duas',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Content Editor"
      title="Duas Library"
      subtitle="Manage duas with Arabic text, translation, and category for member browsing." />

    <div class="duas-layout">
      <aside class="duas-aside">
        <section class="create-panel">
          <div class="create-panel__head">
            <div class="create-icon" aria-hidden="true">🤲</div>
            <div>
              <h3 class="create-title">Add dua</h3>
              <p class="create-sub">New entry for the library</p>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="dua-title">Title <span class="req">*</span></label>
            <input id="dua-title" class="form-input" placeholder="Upon Waking"
              [(ngModel)]="form.title">
          </div>

          <div class="form-field">
            <span class="form-label">Category</span>
            <div class="chip-group">
              <button type="button" *ngFor="let c of categories()"
                class="chip" [class.chip--active]="form.category === c"
                (click)="form.category = c">{{ categoryLabel(c) }}</button>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="dua-arabic">Arabic <span class="req">*</span></label>
            <textarea id="dua-arabic" class="form-input form-textarea" dir="rtl" rows="3"
              placeholder="الْحَمْدُ لِلَّهِ..." [(ngModel)]="form.arabicText"></textarea>
          </div>

          <div class="form-field">
            <label class="form-label" for="dua-trans">Translation</label>
            <textarea id="dua-trans" class="form-input form-textarea" rows="2"
              placeholder="All praise is for Allah…" [(ngModel)]="form.translation"></textarea>
          </div>

          <button type="button" class="btn-create" (click)="create()"
            [disabled]="saving() || !form.title.trim() || !form.arabicText.trim()">
            {{ saving() ? 'Adding…' : 'Add dua' }}
          </button>
          <p *ngIf="msg()" class="form-msg" [class.form-msg--err]="!msgOk()">{{ msg() }}</p>
        </section>

        <div class="aside-stats">
          <div class="mini-stat">
            <span class="mini-stat__val">{{ duas().length }}</span>
            <span class="mini-stat__lbl">Duas</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat__val">{{ categories().length }}</span>
            <span class="mini-stat__lbl">Categories</span>
          </div>
        </div>
      </aside>

      <main class="duas-main">
        <div class="list-toolbar">
          <h3 class="list-title">Library ({{ filtered().length }})</h3>
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="list-search" type="search" placeholder="Search title, Arabic, translation…"
              [(ngModel)]="query" (ngModelChange)="applyFilter()">
          </div>
        </div>

        <div class="filter-chips" *ngIf="categories().length">
          <button type="button" class="fchip" [class.fchip--on]="!categoryFilter"
            (click)="setCategoryFilter('')">All</button>
          <button type="button" *ngFor="let c of categories()" class="fchip"
            [class.fchip--on]="categoryFilter === c"
            (click)="setCategoryFilter(c)">{{ categoryLabel(c) }}</button>
        </div>

        <div *ngIf="loading()" class="list-loading"><span class="pulse-dot"></span> Loading…</div>

        <div *ngIf="!loading() && !filtered().length" class="list-empty">
          <div class="list-empty__icon">🤲</div>
          <h3>{{ duas().length ? 'No matches' : 'No duas yet' }}</h3>
          <p>{{ duas().length ? 'Try another search or category.' : 'Add your first dua using the form.' }}</p>
        </div>

        <div *ngIf="!loading() && filtered().length" class="duas-list">
          <article *ngFor="let d of filtered()" class="dua-card">
            <div class="dua-card__accent"></div>
            <div class="dua-card__body">
              <div class="dua-card__top">
                <h4 class="dua-title">{{ d.title }}</h4>
                <span class="cat-badge">{{ categoryLabel(d.category) }}</span>
              </div>
              <p class="dua-arabic" dir="rtl" lang="ar">{{ d.arabicText }}</p>
              <p *ngIf="d.translation" class="dua-translation">{{ d.translation }}</p>
              <p *ngIf="d.transliteration" class="dua-translit">{{ d.transliteration }}</p>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .duas-layout { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) {
      .duas-layout { grid-template-columns: minmax(280px, 320px) 1fr; align-items: start; }
    }

    .create-panel {
      padding: 1rem; margin-bottom: 0.75rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 0.75rem;
      box-shadow: 0 10px 32px rgba(0,0,0,0.25);
    }
    .create-panel__head {
      display: flex; gap: 0.625rem; align-items: center;
      margin-bottom: 1rem; padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(212,175,55,0.15);
    }
    .create-icon { font-size: 1.25rem; }
    .create-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .create-sub { margin: 0.1rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.65); }

    .form-field { margin-bottom: 0.75rem; }
    .form-label {
      display: block; margin-bottom: 0.35rem;
      font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: rgba(212,175,55,0.9);
    }
    .req { color: #fca5a5; }
    .form-input {
      width: 100%; box-sizing: border-box;
      background: rgba(0,0,0,0.35); border: 1px solid rgba(212,175,55,0.25);
      border-radius: 0.5rem; padding: 0.55rem 0.65rem;
      font-size: 0.8125rem; color: #fff; outline: none;
    }
    .form-input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.12); }
    .form-textarea { resize: vertical; line-height: 1.5; }
    .form-textarea[dir="rtl"] { font-size: 1rem; line-height: 1.7; }

    .chip-group { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .chip {
      font-size: 0.625rem; font-weight: 600; color: rgba(167,243,208,0.85);
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 9999px; padding: 0.3rem 0.55rem; cursor: pointer;
    }
    .chip--active {
      color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border-color: rgba(212,175,55,0.6);
    }

    .btn-create {
      width: 100%; font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border: 1px solid rgba(212,175,55,0.6); border-radius: 0.5rem;
      padding: 0.65rem; cursor: pointer;
      box-shadow: 0 4px 16px rgba(212,175,55,0.25);
    }
    .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-msg { margin: 0.5rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }
    .form-msg--err { color: #fecaca; }

    .aside-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
    .mini-stat {
      text-align: center; padding: 0.5rem;
      background: rgba(2,44,34,0.8); border: 1px solid rgba(16,185,129,0.15);
      border-radius: 0.5rem;
    }
    .mini-stat__val { display: block; font-size: 1.125rem; font-weight: 800; color: #fff; }
    .mini-stat__lbl { font-size: 0.5rem; text-transform: uppercase; color: rgba(167,243,208,0.6); }

    .list-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; margin-bottom: 0.625rem;
    }
    .list-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .search-wrap { flex: 1; min-width: 10rem; max-width: 18rem; position: relative; }
    .search-icon {
      position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%);
      color: rgba(212,175,55,0.6); pointer-events: none;
    }
    .list-search {
      width: 100%; box-sizing: border-box;
      background: rgba(2,44,34,0.9); border: 1px solid rgba(212,175,55,0.2);
      border-radius: 0.5rem; padding: 0.5rem 0.65rem 0.5rem 2rem;
      font-size: 0.75rem; color: #f0fdf4; outline: none;
    }
    .list-search:focus { border-color: #D4AF37; }

    .filter-chips {
      display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.875rem;
    }
    .fchip {
      font-size: 0.625rem; font-weight: 600; padding: 0.3rem 0.6rem;
      border-radius: 9999px; border: 1px solid rgba(16,185,129,0.25);
      background: rgba(0,0,0,0.25); color: rgba(167,243,208,0.85); cursor: pointer;
    }
    .fchip--on { border-color: rgba(212,175,55,0.5); background: rgba(212,175,55,0.12); color: #fcd34d; }

    .list-loading { display: flex; gap: 0.5rem; align-items: center; font-size: 0.8125rem; color: rgba(110,231,183,0.7); }
    .pulse-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #D4AF37; animation: pulse 1s infinite; }
    @keyframes pulse { 50% { opacity: 0.3; } }

    .list-empty {
      text-align: center; padding: 2.5rem 1rem;
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem;
      background: rgba(2,44,34,0.5);
    }
    .list-empty__icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .list-empty h3 { margin: 0 0 0.25rem; color: #fff; font-size: 1rem; }
    .list-empty p { margin: 0; font-size: 0.8125rem; color: rgba(167,243,208,0.65); }

    .duas-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .dua-card {
      display: flex; background: linear-gradient(135deg, rgba(6,78,59,0.75), rgba(2,44,34,0.95));
      border: 1px solid rgba(16,185,129,0.18); border-radius: 0.625rem;
      overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .dua-card:hover {
      border-color: rgba(212,175,55,0.35);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .dua-card__accent {
      width: 3px; flex-shrink: 0;
      background: linear-gradient(180deg, #D4AF37, #10b981);
    }
    .dua-card__body { flex: 1; padding: 0.75rem 0.875rem; min-width: 0; }
    .dua-card__top {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 0.5rem; margin-bottom: 0.5rem;
    }
    .dua-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; line-height: 1.3; }
    .cat-badge {
      flex-shrink: 0; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      color: #D4AF37; background: rgba(212,175,55,0.1);
      border: 1px solid rgba(212,175,55,0.3);
      padding: 0.15rem 0.4rem; border-radius: 9999px;
    }
    .dua-arabic {
      margin: 0 0 0.375rem; font-size: 1.0625rem; line-height: 1.75;
      color: rgba(236,253,245,0.95);
      font-family: 'Traditional Arabic', 'Scheherazade New', serif;
    }
    .dua-translation {
      margin: 0; font-size: 0.75rem; line-height: 1.5;
      color: rgba(167,243,208,0.85); font-style: italic;
    }
    .dua-translit {
      margin: 0.25rem 0 0; font-size: 0.6875rem; color: rgba(110,231,183,0.55);
    }
  `]
})
export class ContentDuasComponent implements OnInit {
  private content = inject(ContentService);

  duas = signal<Dua[]>([]);
  filtered = signal<Dua[]>([]);
  categories = signal<string[]>([...DEFAULT_CATEGORIES]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  query = '';
  categoryFilter = '';

  ngOnInit(): void {
    this.content.getDuaCategories().subscribe({
      next: cats => {
        if (cats.length) this.categories.set(cats);
      },
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.content.getDuas().subscribe({
      next: d => {
        this.duas.set(d);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  categoryLabel(cat: string): string {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  setCategoryFilter(cat: string): void {
    this.categoryFilter = this.categoryFilter === cat ? '' : cat;
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const cat = this.categoryFilter;
    let list = this.duas();
    if (cat) list = list.filter(d => d.category === cat);
    if (q) {
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.arabicText.includes(q) ||
        (d.translation?.toLowerCase().includes(q))
      );
    }
    this.filtered.set(list);
  }

  create(): void {
    const title = this.form.title.trim();
    const arabicText = this.form.arabicText.trim();
    if (!title || !arabicText) return;
    this.saving.set(true);
    this.msg.set('');
    this.content.createDua({
      ...this.form,
      title,
      arabicText,
      translation: this.form.translation.trim() || undefined,
    }).subscribe({
      next: () => {
        this.form = { title: '', category: 'general', arabicText: '', translation: '' };
        this.saving.set(false);
        this.msgOk.set(true);
        this.msg.set('Dua added successfully.');
        this.load();
        this.content.getDuaCategories().subscribe(cats => {
          if (cats.length) this.categories.set(cats);
        });
      },
      error: () => {
        this.saving.set(false);
        this.msgOk.set(false);
        this.msg.set('Could not add dua.');
      },
    });
  }

  form = { title: '', category: 'general', arabicText: '', translation: '' };
}
