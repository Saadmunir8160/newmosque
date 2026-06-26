import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentEditorService, ContentArticle, ContentPublishStatus, LibraryItemType } from '../../core/services/content-editor.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { ContentWorkflowBarComponent } from './content-workflow-bar.component';

const ITEM_TYPES: LibraryItemType[] = ['Article', 'Pdf', 'Book'];

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ContentWorkflowBarComponent],
  template: `
    <div class="lib-dash">
      <app-page-header badge="Content Editor" title="Library"
        subtitle="PDFs, articles, and books — draft through publish workflow." />

      <div class="lib-stats">
        <article class="stat-card">
          <span class="stat-card__icon">📚</span>
          <div>
            <p class="stat-card__label">Total items</p>
            <p class="stat-card__value">{{ items().length }}</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-card__icon">📄</span>
          <div>
            <p class="stat-card__label">Articles</p>
            <p class="stat-card__value">{{ articleCount() }}</p>
          </div>
        </article>
        <article class="stat-card">
          <span class="stat-card__icon">📕</span>
          <div>
            <p class="stat-card__label">Books & PDFs</p>
            <p class="stat-card__value">{{ bookPdfCount() }}</p>
          </div>
        </article>
        <article class="stat-card stat-card--gold">
          <span class="stat-card__icon">✓</span>
          <div>
            <p class="stat-card__label">Published</p>
            <p class="stat-card__value">{{ publishedCount() }}</p>
          </div>
        </article>
      </div>

      <div class="lib-workspace">
        <aside class="sidebar">
          <section class="sidebar-card">
            <div class="sidebar-card__head">
              <div class="sidebar-card__icon" aria-hidden="true">📚</div>
              <div>
                <h3 class="sidebar-card__title">{{ editingId() ? 'Edit item' : 'New library item' }}</h3>
                <p class="sidebar-card__sub">{{ editingId() ? 'Update entry' : 'Create a draft' }}</p>
              </div>
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="lib-title">Title <span class="req">*</span></label>
              <input id="lib-title" class="sidebar-input" [(ngModel)]="form.title" placeholder="Forty Hadith on Good Character">
            </div>

            <div class="sidebar-field">
              <span class="sidebar-label">Type</span>
              <div class="sidebar-chips">
                <button type="button" *ngFor="let t of itemTypes" class="sidebar-chip"
                  [class.sidebar-chip--on]="form.itemType === t"
                  [attr.data-type]="t"
                  (click)="form.itemType = t">{{ t }}</button>
              </div>
            </div>

            <div class="sidebar-field" *ngIf="form.itemType !== 'Article'">
              <label class="sidebar-label" for="lib-url">Resource URL</label>
              <input id="lib-url" class="sidebar-input" placeholder="/uploads/..." [(ngModel)]="form.resourceUrl">
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="lib-summary">Summary</label>
              <textarea id="lib-summary" class="sidebar-input sidebar-textarea" rows="2" [(ngModel)]="form.summary"></textarea>
            </div>

            <div class="sidebar-field">
              <label class="sidebar-label" for="lib-body">Body</label>
              <textarea id="lib-body" class="sidebar-input sidebar-textarea" rows="4" [(ngModel)]="form.body"></textarea>
            </div>

            <div class="sidebar-actions">
              <button type="button" class="btn-gold" (click)="save()" [disabled]="saving() || !form.title.trim()">
                {{ saving() ? 'Saving…' : (editingId() ? 'Save changes' : 'Create draft') }}
              </button>
              <button type="button" *ngIf="editingId()" class="btn-ghost" (click)="resetForm()">Cancel</button>
            </div>
          </section>
        </aside>

        <main class="lib-main">
          <section class="toolbar-card">
            <h3 class="toolbar-title">Items <span class="toolbar-count">{{ filteredItems().length }}</span></h3>
            <select class="toolbar-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
              <option value="">All statuses</option>
              <option *ngFor="let s of statuses" [value]="s">{{ statusLabel(s) }}</option>
            </select>
          </section>

          <div *ngIf="loading()" class="state-msg">
            <span class="pulse-dot"></span> Loading library…
          </div>

          <div *ngIf="!loading() && !filteredItems().length" class="empty-state">
            <div class="empty-state__icon">📚</div>
            <p>{{ items().length ? 'No items match this filter.' : 'No library items yet. Create one using the sidebar.' }}</p>
          </div>

          <div *ngIf="!loading() && filteredItems().length" class="item-list">
            <article *ngFor="let a of filteredItems()" class="item-card">
              <div class="item-card__head">
                <div class="item-card__main">
                  <span class="type-badge" [attr.data-type]="a.itemType">{{ a.itemType }}</span>
                  <h4 class="item-card__title">{{ a.title }}</h4>
                  <p *ngIf="a.summary" class="item-card__summary">{{ a.summary }}</p>
                  <p *ngIf="a.updatedAt" class="item-card__meta">Updated {{ a.updatedAt | date:'mediumDate' }}</p>
                </div>
                <div class="item-card__actions">
                  <button type="button" class="action-btn action-btn--edit" (click)="edit(a)">Edit</button>
                  <button type="button" class="action-btn action-btn--delete" (click)="remove(a.id)">Delete</button>
                </div>
              </div>
              <app-content-workflow-bar
                entityType="ContentArticle"
                [entityId]="a.id"
                [status]="a.status || 'Draft'"
                (changed)="load()" />
            </article>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --lib-primary: var(--mos-primary, #0F4C3A);
      --lib-gold: var(--mos-gold, #D4AF37);
      --lib-bg: var(--mos-bg, #F8FAF9);
      --lib-surface: var(--mos-surface, #fff);
      --lib-text: var(--mos-text-primary, #0F172A);
      --lib-muted: var(--mos-text-secondary, #64748B);
      --lib-border: var(--mos-border, #E2E8F0);
      --lib-radius: var(--mos-radius-card, 16px);
      --lib-shadow: var(--mos-shadow-card);
      display: block;
    }
    :host ::ng-deep app-page-header .text-mos-primary { color: var(--lib-primary) !important; }

    .lib-dash { padding-bottom: 1.5rem; }

    .lib-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    @media (min-width: 768px) { .lib-stats { grid-template-columns: repeat(4, 1fr); } }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--lib-surface);
      border: 1px solid var(--lib-border);
      border-radius: var(--lib-radius);
      box-shadow: var(--lib-shadow);
    }
    .stat-card--gold .stat-card__icon {
      background: #FFFBEB;
      color: var(--lib-gold);
      border-color: rgba(212, 175, 55, 0.35);
    }
    .stat-card__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9375rem;
      background: rgba(15, 76, 58, 0.08);
      color: var(--lib-primary);
      border: 1px solid rgba(15, 76, 58, 0.12);
      flex-shrink: 0;
    }
    .stat-card__label {
      margin: 0;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--lib-muted);
    }
    .stat-card__value {
      margin: 2px 0 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--lib-primary);
      line-height: 1.1;
    }

    .lib-workspace {
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr;
      align-items: start;
    }
    @media (min-width: 960px) { .lib-workspace { grid-template-columns: minmax(260px, 300px) 1fr; } }

    .sidebar-card {
      padding: 14px;
      background: linear-gradient(165deg, #0F4C3A 0%, #08362A 100%);
      border: 1px solid rgba(212, 175, 55, 0.28);
      border-radius: var(--lib-radius);
      box-shadow: 0 8px 28px rgba(8, 54, 42, 0.22);
    }
    .sidebar-card__head {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(212, 175, 55, 0.15);
    }
    .sidebar-card__icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .sidebar-card__title { margin: 0; font-size: 0.8125rem; font-weight: 700; color: #fff; }
    .sidebar-card__sub { margin: 2px 0 0; font-size: 0.625rem; color: rgba(167, 243, 208, 0.65); }

    .sidebar-field { margin-bottom: 10px; }
    .sidebar-label {
      display: block;
      margin-bottom: 4px;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(212, 175, 55, 0.9);
    }
    .req { color: #FCA5A5; }
    .sidebar-input {
      width: 100%;
      box-sizing: border-box;
      padding: 7px 10px;
      font-size: 0.75rem;
      color: #fff;
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(212, 175, 55, 0.22);
      border-radius: 8px;
      outline: none;
    }
    .sidebar-input:focus {
      border-color: var(--lib-gold);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.12);
    }
    .sidebar-textarea { resize: vertical; min-height: 52px; line-height: 1.45; }

    .sidebar-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .sidebar-chip {
      font-size: 0.625rem;
      font-weight: 600;
      color: rgba(167, 243, 208, 0.9);
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(16, 185, 129, 0.22);
      border-radius: 9999px;
      padding: 4px 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sidebar-chip--on {
      color: #08362A;
      background: linear-gradient(180deg, #F5E6A8, var(--lib-gold));
      border-color: var(--lib-gold);
    }

    .sidebar-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
    .btn-gold {
      width: 100%;
      font-size: 0.75rem;
      font-weight: 700;
      color: #08362A;
      background: linear-gradient(180deg, #F5E6A8, var(--lib-gold));
      border: 1px solid rgba(212, 175, 55, 0.5);
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(212, 175, 55, 0.22);
    }
    .btn-gold:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      width: 100%;
      font-size: 0.6875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 7px 12px;
      cursor: pointer;
    }

    .toolbar-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: var(--lib-surface);
      border: 1px solid var(--lib-border);
      border-radius: var(--lib-radius);
      box-shadow: var(--lib-shadow);
    }
    .toolbar-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--lib-text);
    }
    .toolbar-count {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--lib-muted);
    }
    .toolbar-select {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--lib-border);
      background: var(--lib-bg);
      color: var(--lib-text);
      cursor: pointer;
    }
    .toolbar-select:focus {
      outline: none;
      border-color: var(--lib-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 58, 0.1);
    }

    .state-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--lib-muted);
      padding: 1rem;
    }
    .pulse-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--lib-gold);
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }

    .empty-state {
      text-align: center;
      padding: 2.5rem 1rem;
      background: var(--lib-surface);
      border: 1px dashed var(--lib-border);
      border-radius: var(--lib-radius);
      color: var(--lib-muted);
      font-size: 0.875rem;
    }
    .empty-state__icon { font-size: 1.75rem; margin-bottom: 8px; }

    .item-list { display: flex; flex-direction: column; gap: 10px; }

    .item-card {
      padding: 12px 14px;
      background: var(--lib-surface);
      border: 1px solid var(--lib-border);
      border-radius: var(--lib-radius);
      box-shadow: var(--lib-shadow);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .item-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--mos-shadow-card-hover);
      border-color: rgba(212, 175, 55, 0.35);
    }

    .item-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 4px;
    }
    .item-card__main { min-width: 0; flex: 1; }

    .type-badge {
      display: inline-block;
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 6px;
      background: rgba(15, 76, 58, 0.08);
      color: var(--lib-primary);
      border: 1px solid rgba(15, 76, 58, 0.12);
    }
    .type-badge[data-type="Article"] { background: #F0FDFA; color: #047857; border-color: #A7F3D0; }
    .type-badge[data-type="Pdf"] { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
    .type-badge[data-type="Book"] { background: #FFFBEB; color: #92680A; border-color: rgba(212,175,55,0.35); }

    .item-card__title {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--lib-text);
      line-height: 1.35;
    }
    .item-card__summary {
      margin: 4px 0 0;
      font-size: 0.75rem;
      color: var(--lib-muted);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .item-card__meta {
      margin: 4px 0 0;
      font-size: 0.6875rem;
      color: var(--lib-muted);
    }

    .item-card__actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }
    .action-btn {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--lib-border);
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s;
      white-space: nowrap;
    }
    .action-btn--edit {
      color: var(--lib-primary);
      background: #F0FDFA;
      border-color: rgba(15, 76, 58, 0.25);
    }
    .action-btn--edit:hover { background: rgba(15, 76, 58, 0.08); }
    .action-btn--delete {
      color: #B91C1C;
      background: #FEF2F2;
      border-color: #FECACA;
    }
    .action-btn--delete:hover { background: #FEE2E2; }
  `]
})
export class ContentLibraryComponent implements OnInit {
  private editor = inject(ContentEditorService);

  items = signal<ContentArticle[]>([]);
  filteredItems = signal<ContentArticle[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<number | null>(null);
  statusFilter = '';
  itemTypes = ITEM_TYPES;
  statuses: ContentPublishStatus[] = ['Draft', 'InReview', 'Approved', 'Published', 'Unpublished'];

  articleCount = computed(() => this.items().filter(i => i.itemType === 'Article').length);
  bookPdfCount = computed(() => this.items().filter(i => i.itemType === 'Book' || i.itemType === 'Pdf').length);
  publishedCount = computed(() => this.items().filter(i => (i.status || 'Draft') === 'Published').length);

  form = { title: '', itemType: 'Article' as LibraryItemType, summary: '', body: '', resourceUrl: '' };

  ngOnInit(): void { this.load(); }

  statusLabel(s: ContentPublishStatus): string {
    return s === 'InReview' ? 'In Review' : s;
  }

  load(): void {
    this.loading.set(true);
    this.editor.getArticles().subscribe({
      next: v => {
        this.items.set(v);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(): void {
    const f = this.statusFilter;
    let list = this.items();
    if (f) list = list.filter(i => (i.status || 'Draft') === f);
    this.filteredItems.set(list);
  }

  save(): void {
    this.saving.set(true);
    const payload = { ...this.form, body: this.form.body || this.form.summary || this.form.title };
    const id = this.editingId();
    const req = id
      ? this.editor.updateArticle(id, payload)
      : this.editor.createArticle(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.resetForm(); this.load(); },
      error: () => this.saving.set(false),
    });
  }

  edit(a: ContentArticle): void {
    this.editingId.set(a.id);
    this.form = {
      title: a.title,
      itemType: a.itemType,
      summary: a.summary || '',
      body: a.body,
      resourceUrl: a.resourceUrl || '',
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form = { title: '', itemType: 'Article', summary: '', body: '', resourceUrl: '' };
  }

  remove(id: number): void {
    if (!confirm('Delete this library item?')) return;
    this.editor.deleteArticle(id).subscribe(() => this.load());
  }
}
