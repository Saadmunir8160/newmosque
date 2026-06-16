import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService, AdhkarItem } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

const COUNT_PRESETS = [33, 34, 99, 100] as const;

@Component({
  selector: 'app-content-adhkar',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Content Editor"
      title="Adhkar Library"
      subtitle="Manage dhikr items for the platform — title, Arabic text, and default count." />

    <div class="adhkar-layout">
      <aside class="adhkar-aside">
        <section class="create-panel">
          <div class="create-panel__head">
            <div class="create-icon" aria-hidden="true">📿</div>
            <div>
              <h3 class="create-title">Add adhkar item</h3>
              <p class="create-sub">New entry for member dhikr lists</p>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="adhkar-title">Title <span class="req">*</span></label>
            <input id="adhkar-title" class="form-input" placeholder="e.g. SubhanAllah"
              [(ngModel)]="form.title">
          </div>

          <div class="form-field">
            <label class="form-label" for="adhkar-arabic">Arabic text <span class="req">*</span></label>
            <textarea id="adhkar-arabic" class="form-input form-textarea" dir="rtl"
              placeholder="سبحان الله" [(ngModel)]="form.arabicText"></textarea>
          </div>

          <div class="form-field">
            <span class="form-label">Default count</span>
            <div class="count-row">
              <input class="form-input form-input--count" type="number" min="1"
                [(ngModel)]="form.defaultCount">
              <div class="count-presets">
                <button type="button" *ngFor="let n of countPresets" class="preset-chip"
                  [class.preset-chip--active]="form.defaultCount === n"
                  (click)="form.defaultCount = n">×{{ n }}</button>
              </div>
            </div>
          </div>

          <button type="button" class="btn-create" (click)="create()"
            [disabled]="saving() || !form.title.trim() || !form.arabicText.trim()">
            {{ saving() ? 'Adding…' : 'Add adhkar item' }}
          </button>
          <p *ngIf="msg()" class="form-msg" [class.form-msg--err]="!msgOk()">{{ msg() }}</p>
        </section>

        <div class="aside-stats">
          <div class="mini-stat">
            <span class="mini-stat__val">{{ items().length }}</span>
            <span class="mini-stat__lbl">Items</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat__val">{{ avgCount() }}</span>
            <span class="mini-stat__lbl">Avg count</span>
          </div>
        </div>
      </aside>

      <main class="adhkar-main">
        <div class="list-toolbar">
          <h3 class="list-title">Library ({{ filtered().length }})</h3>
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="list-search" type="search" placeholder="Search title or Arabic…"
              [(ngModel)]="query" (ngModelChange)="applyFilter()">
          </div>
        </div>

        <div *ngIf="loading()" class="list-loading"><span class="pulse-dot"></span> Loading…</div>

        <div *ngIf="!loading() && !filtered().length" class="list-empty">
          <div class="list-empty__icon">📿</div>
          <h3>{{ items().length ? 'No matches' : 'No adhkar items yet' }}</h3>
          <p>{{ items().length ? 'Try a different search.' : 'Add your first item using the form.' }}</p>
        </div>

        <div *ngIf="!loading() && filtered().length" class="adhkar-list">
          <article *ngFor="let a of filtered()" class="adhkar-card">
            <div class="adhkar-card__accent"></div>
            <div class="adhkar-card__body">
              <div class="adhkar-card__top">
                <h4 class="adhkar-title">{{ a.title }}</h4>
                <span class="count-badge">×{{ a.defaultCount }}</span>
              </div>
              <p class="adhkar-arabic" dir="rtl" lang="ar">{{ a.arabicText }}</p>
              <span *ngIf="a.category" class="category-chip">{{ a.category }}</span>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .adhkar-layout {
      display: grid; gap: 1rem; grid-template-columns: 1fr;
    }
    @media (min-width: 900px) {
      .adhkar-layout { grid-template-columns: minmax(260px, 300px) 1fr; align-items: start; }
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
    .create-icon { font-size: 1.25rem; line-height: 1; }
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
    .form-textarea { min-height: 4rem; resize: vertical; line-height: 1.6; font-size: 1rem; }
    .form-input--count { max-width: 5rem; text-align: center; font-weight: 700; }

    .count-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .count-presets { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .preset-chip {
      font-size: 0.6875rem; font-weight: 600; color: rgba(167,243,208,0.85);
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 9999px; padding: 0.3rem 0.55rem; cursor: pointer;
    }
    .preset-chip--active, .preset-chip:hover {
      color: #022c22; background: linear-gradient(180deg, #6ee7b7, #10b981);
      border-color: #10b981;
    }

    .btn-create {
      width: 100%; margin-top: 0.25rem;
      font-size: 0.8125rem; font-weight: 700; color: #022c22;
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
      gap: 0.75rem; margin-bottom: 0.875rem;
    }
    .list-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .search-wrap { flex: 1; min-width: 10rem; max-width: 16rem; position: relative; }
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

    .adhkar-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .adhkar-card {
      position: relative; display: flex;
      background: linear-gradient(135deg, rgba(6,78,59,0.75), rgba(2,44,34,0.95));
      border: 1px solid rgba(16,185,129,0.18); border-radius: 0.625rem;
      overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .adhkar-card:hover {
      border-color: rgba(212,175,55,0.35);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .adhkar-card__accent {
      width: 3px; flex-shrink: 0;
      background: linear-gradient(180deg, #D4AF37, #10b981);
    }
    .adhkar-card__body { flex: 1; padding: 0.75rem 0.875rem; min-width: 0; }
    .adhkar-card__top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.5rem; margin-bottom: 0.375rem;
    }
    .adhkar-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .count-badge {
      flex-shrink: 0; font-size: 0.6875rem; font-weight: 800; color: #D4AF37;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.35);
      padding: 0.15rem 0.45rem; border-radius: 9999px;
    }
    .adhkar-arabic {
      margin: 0; font-size: 1.125rem; line-height: 1.7; color: rgba(236,253,245,0.95);
      font-family: 'Traditional Arabic', 'Scheherazade New', serif;
    }
    .category-chip {
      display: inline-block; margin-top: 0.35rem;
      font-size: 0.5625rem; font-weight: 600; text-transform: uppercase;
      color: rgba(167,243,208,0.7); background: rgba(0,0,0,0.2);
      border: 1px solid rgba(16,185,129,0.2); border-radius: 9999px;
      padding: 0.1rem 0.4rem;
    }
  `]
})
export class ContentAdhkarComponent implements OnInit {
  private content = inject(ContentService);

  readonly countPresets = COUNT_PRESETS;

  items = signal<AdhkarItem[]>([]);
  filtered = signal<AdhkarItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  query = '';

  avgCount = computed(() => {
    const list = this.items();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, a) => s + a.defaultCount, 0) / list.length);
  });

  form = { title: '', arabicText: '', defaultCount: 33 };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.content.getAdhkarItems().subscribe({
      next: i => {
        this.items.set(i);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const list = this.items();
    if (!q) {
      this.filtered.set(list);
      return;
    }
    this.filtered.set(list.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.arabicText.includes(q)
    ));
  }

  create(): void {
    const title = this.form.title.trim();
    const arabicText = this.form.arabicText.trim();
    if (!title || !arabicText) return;
    this.saving.set(true);
    this.msg.set('');
    this.content.createAdhkarItem({ ...this.form, title, arabicText }).subscribe({
      next: () => {
        this.form = { title: '', arabicText: '', defaultCount: 33 };
        this.saving.set(false);
        this.msgOk.set(true);
        this.msg.set('Adhkar item added.');
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.msgOk.set(false);
        this.msg.set('Could not add item.');
      },
    });
  }
}
