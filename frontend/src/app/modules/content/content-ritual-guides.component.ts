import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService, RitualGuide } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

const GUIDE_TYPES = ['Wudu', 'Ghusl', 'Salah', 'Other'] as const;

@Component({
  selector: 'app-content-ritual-guides',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Content Editor" title="Ritual Guides"
      subtitle="Wudu, Ghusl and step-by-step guides for members." />

    <div class="page-layout">
      <aside class="aside">
        <section class="panel">
          <div class="panel__head">
            <span class="panel__icon">📖</span>
            <div>
              <h3 class="panel__title">Create guide</h3>
              <p class="panel__sub">Add a new ritual guide</p>
            </div>
          </div>
          <div class="field">
            <label class="label" for="g-title">Title <span class="req">*</span></label>
            <input id="g-title" class="input" placeholder="How to Perform Wudu" [(ngModel)]="form.title">
          </div>
          <div class="field">
            <span class="label">Type</span>
            <div class="chips">
              <button type="button" *ngFor="let t of guideTypes" class="chip"
                [class.chip--on]="form.type === t" (click)="form.type = t">{{ t }}</button>
            </div>
          </div>
          <button type="button" class="btn-gold" (click)="create()" [disabled]="!form.title.trim()">
            Create guide
          </button>
        </section>

        <section *ngIf="selected() as g" class="panel panel--step">
          <h3 class="panel__title">Add step</h3>
          <p class="panel__sub mb">To: {{ g.title }}</p>
          <div class="field">
            <input class="input" placeholder="Step title" [(ngModel)]="step.title">
          </div>
          <div class="field">
            <textarea class="input textarea" rows="2" placeholder="Instructions"
              [(ngModel)]="step.description"></textarea>
          </div>
          <div class="field">
            <label class="label">Order</label>
            <input class="input input--num" type="number" min="1" [(ngModel)]="step.orderIndex">
          </div>
          <div class="step-actions">
            <button type="button" class="btn-ghost" (click)="selected.set(null)">Cancel</button>
            <button type="button" class="btn-gold" (click)="addStep(g.id)" [disabled]="!step.title.trim()">
              Add step
            </button>
          </div>
        </section>
      </aside>

      <main class="main">
        <div class="toolbar">
          <h3 class="toolbar__title">Guides ({{ guides().length }})</h3>
        </div>
        <div *ngIf="!guides().length" class="empty">No guides yet — create one on the left.</div>
        <div class="guide-grid">
          <article *ngFor="let g of guides()" class="guide-card"
            [class.guide-card--active]="selected()?.id === g.id">
            <div class="guide-card__bar" [ngClass]="typeClass(g.type)"></div>
            <div class="guide-card__body">
              <span class="type-tag" [ngClass]="typeClass(g.type)">{{ g.type }}</span>
              <h4 class="guide-name">{{ g.title }}</h4>
              <button type="button" class="btn-step" (click)="selected.set(g)">+ Add step</button>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page-layout { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .page-layout { grid-template-columns: 280px 1fr; align-items: start; } }

    .panel {
      padding: 1rem; margin-bottom: 0.75rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.75rem;
    }
    .panel--step { border-color: rgba(16,185,129,0.35); }
    .panel__head { display: flex; gap: 0.625rem; align-items: center; margin-bottom: 0.875rem;
      padding-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.12); }
    .panel__icon { font-size: 1.25rem; }
    .panel__title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .panel__sub { margin: 0.1rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.65); }
    .panel__sub.mb { margin-bottom: 0.75rem; }

    .field { margin-bottom: 0.75rem; }
    .label { display: block; margin-bottom: 0.35rem; font-size: 0.625rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: rgba(212,175,55,0.9); }
    .req { color: #fca5a5; }
    .input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35);
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.5rem; padding: 0.55rem 0.65rem;
      font-size: 0.8125rem; color: #fff; outline: none; }
    .input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
    .textarea { resize: vertical; min-height: 3.5rem; }
    .input--num { max-width: 5rem; text-align: center; }

    .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .chip { font-size: 0.6875rem; font-weight: 600; padding: 0.35rem 0.65rem; border-radius: 9999px;
      border: 1px solid rgba(16,185,129,0.25); background: rgba(0,0,0,0.3); color: rgba(167,243,208,0.9); cursor: pointer; }
    .chip--on { color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37); border-color: #D4AF37; }

    .btn-gold { width: 100%; font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: 1px solid rgba(212,175,55,0.6);
      border-radius: 0.5rem; padding: 0.6rem; cursor: pointer; }
    .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .step-actions { display: flex; gap: 0.5rem; }
    .step-actions .btn-gold { flex: 1; }
    .btn-ghost { font-size: 0.75rem; color: rgba(167,243,208,0.8); background: transparent;
      border: 1px solid rgba(16,185,129,0.3); border-radius: 0.5rem; padding: 0.6rem 0.75rem; cursor: pointer; }

    .toolbar__title { margin: 0 0 0.875rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .empty { padding: 2rem; text-align: center; font-size: 0.8125rem; color: rgba(167,243,208,0.6);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; }

    .guide-grid { display: grid; gap: 0.625rem; grid-template-columns: 1fr; }
    @media (min-width: 640px) { .guide-grid { grid-template-columns: repeat(2, 1fr); } }

    .guide-card {
      display: flex; background: linear-gradient(135deg, rgba(6,78,59,0.75), rgba(2,44,34,0.95));
      border: 1px solid rgba(16,185,129,0.18); border-radius: 0.625rem; overflow: hidden;
      transition: border-color 0.2s;
    }
    .guide-card--active { border-color: rgba(212,175,55,0.45); }
    .guide-card:hover { border-color: rgba(212,175,55,0.35); }
    .guide-card__bar { width: 3px; flex-shrink: 0; }
    .type--wudu { background: #10b981; color: #6ee7b7; border-color: rgba(16,185,129,0.35); }
    .type--ghusl { background: #3b82f6; color: #93c5fd; border-color: rgba(59,130,246,0.35); }
    .type--salah { background: #D4AF37; color: #fcd34d; border-color: rgba(212,175,55,0.35); }
    .type--other { background: #64748b; color: #94a3b8; border-color: rgba(100,116,139,0.35); }

    .guide-card__body { flex: 1; padding: 0.75rem 0.875rem; }
    .type-tag { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      padding: 0.15rem 0.4rem; border-radius: 9999px; border: 1px solid; }
    .guide-name { margin: 0.375rem 0 0.625rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .btn-step { font-size: 0.6875rem; font-weight: 600; color: #D4AF37; background: rgba(212,175,55,0.1);
      border: 1px solid rgba(212,175,55,0.3); border-radius: 0.375rem; padding: 0.35rem 0.65rem; cursor: pointer; }
  `]
})
export class ContentRitualGuidesComponent implements OnInit {
  private content = inject(ContentService);
  readonly guideTypes = GUIDE_TYPES;
  guides = signal<RitualGuide[]>([]);
  selected = signal<RitualGuide | null>(null);
  form = { title: '', type: 'Wudu' as string };
  step = { title: '', description: '', orderIndex: 1 };

  ngOnInit(): void { this.load(); }
  load(): void { this.content.getRitualGuides().subscribe(g => this.guides.set(g)); }

  typeClass(type: string): string {
    const t = type.toLowerCase();
    if (t === 'ghusl') return 'type--ghusl';
    if (t === 'salah') return 'type--salah';
    if (t === 'other') return 'type--other';
    return 'type--wudu';
  }

  create(): void {
    if (!this.form.title.trim()) return;
    this.content.createRitualGuide(this.form).subscribe(() => {
      this.form = { title: '', type: 'Wudu' };
      this.load();
    });
  }

  addStep(guideId: number): void {
    if (!this.step.title.trim()) return;
    this.content.addRitualStep(guideId, this.step).subscribe(() => {
      this.step = { title: '', description: '', orderIndex: this.step.orderIndex + 1 };
      this.selected.set(null);
      this.load();
    });
  }
}
