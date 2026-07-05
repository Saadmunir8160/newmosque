import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentEditorService } from '../../core/services/content-editor.service';
import { ContentWorkflowBarComponent } from './content-workflow-bar.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdhkarItem } from '../../core/services/content.service';

const COUNT_PRESETS = [33, 34, 99, 100] as const;
type StatusFilter = 'all' | 'Published' | 'Draft' | 'InReview' | 'Approved' | 'Unpublished';

@Component({
  selector: 'app-content-adhkar',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ContentWorkflowBarComponent],
  template: `
    <div class="adhkar-dash">
      <app-page-header
        badge="Content Editor"
        title="Adhkar Library"
        subtitle="Manage dhikr items for the platform — title, Arabic text, and default count." />

      <!-- Stats -->
      <div class="adhkar-stats">
        <article class="stat-card">
          <span class="stat-card__icon">📿</span>
          <div>
            <p class="stat-card__label">Total items</p>
            <p class="stat-card__value">{{ items().length }}</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-card__icon">✓</span>
          <div>
            <p class="stat-card__label">Published</p>
            <p class="stat-card__value">{{ publishedCount() }}</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-card__icon">◎</span>
          <div>
            <p class="stat-card__label">In review</p>
            <p class="stat-card__value">{{ inReviewCount() }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--gold">
          <span class="stat-card__icon">×</span>
          <div>
            <p class="stat-card__label">Avg count</p>
            <p class="stat-card__value">{{ avgCount() }}</p>
          </div>
        </article>
      </div>

      <!-- Search & filters -->
      <section class="toolbar-card">
        <div class="toolbar-card__row">
          <div class="search-field">
            <svg class="search-field__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="search-field__input" type="search" placeholder="Search title or Arabic…"
              [(ngModel)]="query" (ngModelChange)="applyFilter()">
          </div>
          <div class="filter-chips" role="group" aria-label="Filter by status">
            <button type="button" *ngFor="let f of statusFilters" class="filter-chip"
              [class.filter-chip--on]="statusFilter() === f.id"
              (click)="setStatusFilter(f.id)">
              {{ f.label }}
            </button>
          </div>
        </div>
        <p class="toolbar-card__meta">
          Showing <strong>{{ filtered().length }}</strong> of {{ items().length }} adhkar items
        </p>
      </section>

      <div class="adhkar-body">
        <!-- Add form -->
        <aside class="adhkar-aside">
          <section class="form-card">
            <div class="form-card__head">
              <div class="form-card__icon" aria-hidden="true">📿</div>
              <div>
                <h3 class="form-card__title">Add adhkar item</h3>
                <p class="form-card__sub">New entry for member dhikr lists</p>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label" for="adhkar-title">Title <span class="req">*</span></label>
              <input id="adhkar-title" class="form-input" placeholder="e.g. SubhanAllah"
                [(ngModel)]="form.title">
            </div>

            <div class="form-field">
              <label class="form-label" for="adhkar-arabic">Arabic text <span class="req">*</span></label>
              <textarea id="adhkar-arabic" class="form-input form-textarea" dir="rtl" lang="ar"
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

            <button type="button" class="btn-primary" (click)="create()"
              [disabled]="saving() || !form.title.trim() || !form.arabicText.trim()">
              {{ saving() ? 'Adding…' : 'Add adhkar item' }}
            </button>
            <p *ngIf="msg()" class="form-msg" [class.form-msg--err]="!msgOk()">{{ msg() }}</p>
          </section>
        </aside>

        <!-- Library grid -->
        <main class="adhkar-main">
          <div *ngIf="loading()" class="state-card">
            <span class="pulse-dot"></span> Loading library…
          </div>

          <div *ngIf="!loading() && !filtered().length" class="state-card state-card--empty">
            <div class="state-card__icon">📿</div>
            <h3>{{ items().length ? 'No matches' : 'No adhkar items yet' }}</h3>
            <p>{{ items().length ? 'Try a different search or filter.' : 'Add your first item using the form.' }}</p>
          </div>

          <div *ngIf="!loading() && filtered().length" class="adhkar-grid">
            <article *ngFor="let a of filtered()" class="item-card">
              <div class="item-card__header">
                <h4 class="item-card__title">{{ a.title }}</h4>
                <span class="count-badge">×{{ a.defaultCount }}</span>
              </div>

              <div class="item-card__arabic-wrap">
                <p class="item-card__arabic" dir="rtl" lang="ar">{{ a.arabicText }}</p>
              </div>

              <div class="item-card__footer">
                <span *ngIf="a.category" class="category-chip">{{ a.category }}</span>
                <span *ngIf="!a.category" class="category-chip category-chip--muted">General</span>
              </div>

              <app-content-workflow-bar
                class="item-card__workflow"
                entityType="Adhkar"
                [entityId]="a.id"
                [status]="a.status || 'Published'"
                (changed)="load()" />
            </article>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --adhkar-primary: #0F4C3A;
      --adhkar-primary-hover: #0D3D2F;
      --adhkar-primary-soft: #E8F5F0;
      --adhkar-gold: #D4AF37;
      --adhkar-gold-soft: #FBF6E8;
      --adhkar-surface: #FFFFFF;
      --adhkar-bg: #F4F7F5;
      --adhkar-border: #E2E8E6;
      --adhkar-text: #0F172A;
      --adhkar-muted: #64748B;
      --adhkar-radius: 12px;
      --adhkar-shadow: 0 1px 3px rgba(15, 76, 58, 0.06), 0 4px 16px rgba(15, 76, 58, 0.05);
      --adhkar-shadow-hover: 0 8px 24px rgba(15, 76, 58, 0.1), 0 2px 8px rgba(15, 76, 58, 0.06);
      display: block;
    }

    .adhkar-dash {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 24px;
    }

    :host ::ng-deep app-page-header .text-mos-primary {
      color: var(--adhkar-primary) !important;
    }

    /* Stats */
    .adhkar-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (min-width: 768px) {
      .adhkar-stats { grid-template-columns: repeat(4, 1fr); }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--adhkar-surface);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      box-shadow: var(--adhkar-shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--adhkar-shadow-hover);
      border-color: rgba(15, 76, 58, 0.2);
    }
    .stat-card--gold .stat-card__icon {
      background: var(--adhkar-gold-soft);
      color: var(--adhkar-gold);
      border-color: rgba(212, 175, 55, 0.35);
    }
    .stat-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      background: var(--adhkar-primary-soft);
      color: var(--adhkar-primary);
      border: 1px solid rgba(15, 76, 58, 0.12);
      flex-shrink: 0;
    }
    .stat-card__label {
      margin: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--adhkar-muted);
    }
    .stat-card__value {
      margin: 4px 0 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--adhkar-primary);
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    /* Toolbar */
    .toolbar-card {
      padding: 16px;
      background: var(--adhkar-surface);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      box-shadow: var(--adhkar-shadow);
    }
    .toolbar-card__row {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    @media (min-width: 900px) {
      .toolbar-card__row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .toolbar-card__meta {
      margin: 16px 0 0;
      font-size: 0.8125rem;
      color: var(--adhkar-muted);
    }
    .toolbar-card__meta strong {
      color: var(--adhkar-primary);
      font-weight: 700;
    }

    .search-field {
      position: relative;
      flex: 1;
      max-width: 100%;
    }
    @media (min-width: 900px) {
      .search-field { max-width: 320px; }
    }
    .search-field__icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--adhkar-muted);
      pointer-events: none;
    }
    .search-field__input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px 10px 36px;
      font-size: 0.875rem;
      color: var(--adhkar-text);
      background: var(--adhkar-bg);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-field__input:focus {
      border-color: var(--adhkar-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12);
      background: var(--adhkar-surface);
    }

    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .filter-chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 9999px;
      border: 1px solid var(--adhkar-border);
      background: var(--adhkar-bg);
      color: var(--adhkar-muted);
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s;
    }
    .filter-chip:hover {
      border-color: rgba(15, 76, 58, 0.25);
      color: var(--adhkar-primary);
    }
    .filter-chip--on {
      background: var(--adhkar-primary);
      border-color: var(--adhkar-primary);
      color: #fff;
    }

    /* Body layout */
    .adhkar-body {
      display: grid;
      gap: 24px;
      grid-template-columns: 1fr;
      align-items: start;
    }
    @media (min-width: 1100px) {
      .adhkar-body { grid-template-columns: 300px 1fr; }
    }

    /* Form card */
    .form-card {
      padding: 16px;
      background: var(--adhkar-surface);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      box-shadow: var(--adhkar-shadow);
      position: sticky;
      top: 16px;
    }
    .form-card__head {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--adhkar-border);
    }
    .form-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      background: linear-gradient(135deg, var(--adhkar-primary) 0%, #157A5C 100%);
      flex-shrink: 0;
    }
    .form-card__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--adhkar-text);
    }
    .form-card__sub {
      margin: 4px 0 0;
      font-size: 0.75rem;
      color: var(--adhkar-muted);
    }

    .form-field { margin-bottom: 16px; }
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--adhkar-primary);
    }
    .req { color: #DC2626; }
    .form-input {
      width: 100%;
      box-sizing: border-box;
      background: var(--adhkar-bg);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      padding: 10px 12px;
      font-size: 0.875rem;
      color: var(--adhkar-text);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .form-input:focus {
      border-color: var(--adhkar-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.12);
      background: var(--adhkar-surface);
    }
    .form-textarea {
      min-height: 88px;
      resize: vertical;
      line-height: 1.8;
      font-size: 1.25rem;
      font-family: 'Traditional Arabic', 'Scheherazade New', 'Noto Naskh Arabic', serif;
      color: var(--adhkar-primary);
      font-weight: 600;
    }
    .form-input--count {
      max-width: 72px;
      text-align: center;
      font-weight: 700;
      color: var(--adhkar-primary);
    }

    .count-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .count-presets { display: flex; flex-wrap: wrap; gap: 8px; }
    .preset-chip {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--adhkar-muted);
      background: var(--adhkar-bg);
      border: 1px solid var(--adhkar-border);
      border-radius: 9999px;
      padding: 6px 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s;
    }
    .preset-chip:hover { border-color: var(--adhkar-gold); color: var(--adhkar-primary); }
    .preset-chip--active {
      color: var(--adhkar-text);
      background: var(--adhkar-gold-soft);
      border-color: var(--adhkar-gold);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
    }

    .btn-primary {
      width: 100%;
      margin-top: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, var(--adhkar-primary) 0%, #157A5C 100%);
      border: none;
      border-radius: var(--adhkar-radius);
      padding: 12px 16px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 76, 58, 0.22);
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(15, 76, 58, 0.28);
    }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .form-msg { margin: 8px 0 0; font-size: 0.75rem; font-weight: 600; color: #16A34A; }
    .form-msg--err { color: #DC2626; }

    /* 3-column grid */
    .adhkar-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 640px) {
      .adhkar-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1100px) {
      .adhkar-grid { grid-template-columns: repeat(3, 1fr); }
    }

    .item-card {
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: var(--adhkar-surface);
      border: 1px solid var(--adhkar-border);
      border-radius: var(--adhkar-radius);
      box-shadow: var(--adhkar-shadow);
      transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s;
      min-height: 200px;
    }
    .item-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--adhkar-shadow-hover);
      border-color: rgba(212, 175, 55, 0.45);
    }
    .item-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 16px;
    }
    .item-card__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--adhkar-text);
      line-height: 1.3;
    }
    .count-badge {
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--adhkar-primary);
      background: var(--adhkar-primary-soft);
      border: 1px solid rgba(15, 76, 58, 0.15);
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .item-card__arabic-wrap {
      flex: 1;
      padding: 16px;
      margin-bottom: 16px;
      background: linear-gradient(180deg, var(--adhkar-gold-soft) 0%, var(--adhkar-primary-soft) 100%);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: var(--adhkar-radius);
      border-right: 3px solid var(--adhkar-gold);
    }
    .item-card__arabic {
      margin: 0;
      font-size: 1.5rem;
      line-height: 1.85;
      font-weight: 600;
      color: var(--adhkar-primary);
      font-family: 'Traditional Arabic', 'Scheherazade New', 'Noto Naskh Arabic', serif;
      text-align: right;
    }

    .item-card__footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .category-chip {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--adhkar-primary);
      background: var(--adhkar-primary-soft);
      border: 1px solid rgba(15, 76, 58, 0.12);
      border-radius: 9999px;
      padding: 4px 10px;
    }
    .category-chip--muted { color: var(--adhkar-muted); background: var(--adhkar-bg); }

    .item-card__workflow { margin-top: auto; }

    /* Workflow bar — light card variant */
    :host ::ng-deep .item-card .workflow-bar {
      padding-top: 8px;
      border-top: 1px solid var(--adhkar-border);
      margin-top: 0;
    }
    :host ::ng-deep .item-card .status-pill {
      font-size: 0.625rem;
      border-radius: 9999px;
      padding: 3px 8px;
    }
    :host ::ng-deep .item-card .status-pill[data-status="Published"] {
      color: #166534;
      background: #DCFCE7;
      border-color: rgba(22, 163, 74, 0.25);
    }
    :host ::ng-deep .item-card .status-pill[data-status="Draft"] {
      color: #475569;
      background: #F1F5F9;
      border-color: #E2E8F0;
    }
    :host ::ng-deep .item-card .status-pill[data-status="InReview"] {
      color: #92400E;
      background: #FEF3C7;
      border-color: rgba(217, 119, 6, 0.25);
    }
    :host ::ng-deep .item-card .status-pill[data-status="Approved"] {
      color: #0F4C3A;
      background: #E8F5F0;
      border-color: rgba(15, 76, 58, 0.2);
    }
    :host ::ng-deep .item-card .wf-btn {
      font-size: 0.6875rem;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid var(--adhkar-border);
      background: var(--adhkar-bg);
      color: var(--adhkar-primary);
      font-weight: 600;
      transition: background 0.2s, border-color 0.2s;
    }
    :host ::ng-deep .item-card .wf-btn:hover:not(:disabled) {
      background: var(--adhkar-primary-soft);
      border-color: rgba(15, 76, 58, 0.25);
    }
    :host ::ng-deep .item-card .wf-msg {
      color: var(--adhkar-muted);
      font-size: 0.6875rem;
    }
    :host ::ng-deep .item-card .wf-msg--err { color: #DC2626; }

    /* Empty / loading */
    .state-card {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 48px 24px;
      font-size: 0.875rem;
      color: var(--adhkar-muted);
      background: var(--adhkar-surface);
      border: 1px dashed var(--adhkar-border);
      border-radius: var(--adhkar-radius);
    }
    .state-card--empty {
      flex-direction: column;
      text-align: center;
    }
    .state-card__icon { font-size: 2.5rem; margin-bottom: 8px; }
    .state-card h3 {
      margin: 0 0 8px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--adhkar-text);
    }
    .state-card p { margin: 0; font-size: 0.875rem; color: var(--adhkar-muted); }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--adhkar-gold);
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }
  `]
})
export class ContentAdhkarComponent implements OnInit {
  private editor = inject(ContentEditorService);

  readonly countPresets = COUNT_PRESETS;
  readonly statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'Published', label: 'Published' },
    { id: 'Draft', label: 'Draft' },
    { id: 'InReview', label: 'In review' },
    { id: 'Approved', label: 'Approved' },
  ];

  items = signal<AdhkarItem[]>([]);
  filtered = signal<AdhkarItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  query = '';
  statusFilter = signal<StatusFilter>('all');

  publishedCount = computed(() =>
    this.items().filter(a => (a.status || 'Published') === 'Published').length
  );

  inReviewCount = computed(() =>
    this.items().filter(a => a.status === 'InReview').length
  );

  avgCount = computed(() => {
    const list = this.items();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, a) => s + a.defaultCount, 0) / list.length);
  });

  form = { title: '', arabicText: '', defaultCount: 33 };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.editor.getAdhkar().subscribe({
      next: i => {
        this.items.set(i);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatusFilter(id: StatusFilter): void {
    this.statusFilter.set(id);
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const status = this.statusFilter();
    let list = this.items();

    if (status !== 'all') {
      list = list.filter(a => (a.status || 'Published') === status);
    }

    if (q) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.arabicText.includes(q)
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
    this.editor.createAdhkar({ ...this.form, title, arabicText }).subscribe({
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
