import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { WirdCollection } from '../../core/models';

const TARIQA_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'BaAlawi', label: "Ba'Alawi" },
  { value: 'Shadhili', label: 'Shadhili' },
] as const;
const TYPE_OPTIONS = ['Daily', 'Weekly', 'Event'] as const;

@Component({
  selector: 'app-content-awrad',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header
      [useAuthRole]="true"
      title="Awrad & Wird Collections"
      subtitle="Create and manage spiritual wird collections for the platform." />

    <div class="awrad-layout">
      <aside class="awrad-aside">
        <section class="create-panel">
          <div class="create-panel__head">
            <div class="create-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div>
              <h3 class="create-title">New collection</h3>
              <p class="create-sub">Build a wird set for members</p>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="coll-name">Name <span class="req">*</span></label>
            <input id="coll-name" class="form-input" placeholder="Khulasa Wird (Morning)"
              [(ngModel)]="form.name">
          </div>

          <div class="form-field">
            <span class="form-label">Tariqa</span>
            <div class="chip-group">
              <button type="button" *ngFor="let t of tariqaOptions"
                class="chip" [class.chip--active]="form.tariqa === t.value"
                (click)="form.tariqa = t.value">{{ t.label }}</button>
            </div>
          </div>

          <div class="form-field">
            <span class="form-label">Schedule</span>
            <div class="chip-group chip-group--stack">
              <button type="button" *ngFor="let t of typeOptions"
                class="chip chip--block" [class.chip--active]="form.type === t"
                [ngClass]="typeClass(t)" (click)="form.type = t">
                <span class="chip__icon">{{ typeIcon(t) }}</span>
                {{ t }}
              </button>
            </div>
          </div>

          <button type="button" class="btn-create" (click)="create()"
            [disabled]="saving() || !form.name.trim()">
            {{ saving() ? 'Creating…' : 'Create collection' }}
          </button>
          <p *ngIf="msg()" class="form-msg" [class.form-msg--err]="!msgOk()">{{ msg() }}</p>
        </section>

        <div class="aside-stats">
          <div class="mini-stat">
            <span class="mini-stat__val">{{ collections().length }}</span>
            <span class="mini-stat__lbl">Total</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat__val">{{ dailyCount() }}</span>
            <span class="mini-stat__lbl">Daily</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat__val">{{ weeklyCount() }}</span>
            <span class="mini-stat__lbl">Weekly</span>
          </div>
        </div>
      </aside>

      <main class="awrad-main">
        <div class="list-toolbar">
          <h3 class="list-title">All collections</h3>
          <div class="filter-chips">
            <button type="button" class="fchip" [class.fchip--on]="!typeFilter" (click)="typeFilter = ''">All</button>
            <button type="button" *ngFor="let t of typeOptions" class="fchip"
              [class.fchip--on]="typeFilter === t" [ngClass]="typeClass(t)"
              (click)="typeFilter = typeFilter === t ? '' : t">{{ t }}</button>
          </div>
        </div>

        <div *ngIf="loading()" class="list-loading"><span class="pulse-dot"></span> Loading…</div>

        <div *ngIf="!loading() && !filteredCollections().length" class="list-empty">
          <div class="list-empty__icon">📿</div>
          <h3>{{ collections().length ? 'No matches' : 'No collections yet' }}</h3>
          <p>{{ collections().length ? 'Try another filter.' : 'Create one using the form on the left.' }}</p>
        </div>

        <div *ngIf="!loading() && filteredCollections().length" class="collections-grid">
          <article *ngFor="let c of filteredCollections()" class="collection-card">
            <div class="collection-card__accent" [ngClass]="typeClass(c.type)"></div>
            <div class="collection-card__top">
              <div class="collection-card__icon" [ngClass]="typeClass(c.type)">{{ typeIcon(c.type) }}</div>
              <span class="type-badge" [ngClass]="typeClass(c.type)">{{ c.type }}</span>
            </div>
            <h4 class="collection-name">{{ c.name }}</h4>
            <p class="collection-tariqa">{{ tariqaLabel(c.tariqa) }}</p>
            <p *ngIf="c.recommendedTime" class="collection-time">{{ c.recommendedTime }}</p>
            <p *ngIf="c.description" class="collection-desc">{{ c.description }}</p>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .awrad-layout {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 900px) {
      .awrad-layout { grid-template-columns: minmax(260px, 300px) 1fr; align-items: start; }
    }

    .create-panel {
      padding: 1rem; margin-bottom: 0.75rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 0.75rem;
      box-shadow: 0 10px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04);
    }
    .create-panel__head {
      display: flex; gap: 0.625rem; align-items: center;
      margin-bottom: 1rem; padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(212,175,55,0.15);
    }
    .create-icon {
      width: 2rem; height: 2rem; border-radius: 0.5rem;
      background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.4);
      color: #D4AF37; display: flex; align-items: center; justify-content: center;
    }
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

    .chip-group { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .chip-group--stack { flex-direction: column; }
    .chip {
      font-size: 0.6875rem; font-weight: 600; color: rgba(167,243,208,0.9);
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.25);
      border-radius: 9999px; padding: 0.35rem 0.65rem; cursor: pointer;
      transition: all 0.15s;
    }
    .chip--block {
      display: flex; align-items: center; gap: 0.4rem;
      border-radius: 0.5rem; width: 100%; text-align: left;
      padding: 0.45rem 0.65rem;
    }
    .chip__icon { font-size: 0.875rem; }
    .chip:hover { border-color: rgba(212,175,55,0.45); }
    .chip--active { color: #022c22; background: linear-gradient(180deg, #fcd34d, #D4AF37); border-color: #D4AF37; }
    .type--daily.chip--active { background: linear-gradient(180deg, #6ee7b7, #059669); color: #022c22; }
    .type--weekly.chip--active { background: linear-gradient(180deg, #93c5fd, #2563eb); color: #fff; }
    .type--event.chip--active { background: linear-gradient(180deg, #fcd34d, #d97706); color: #022c22; }

    .btn-create {
      width: 100%; margin-top: 0.25rem;
      font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d 0%, #D4AF37 100%);
      border: 1px solid rgba(212,175,55,0.6); border-radius: 0.5rem;
      padding: 0.65rem; cursor: pointer;
      box-shadow: 0 4px 16px rgba(212,175,55,0.25);
    }
    .btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-msg { margin: 0.5rem 0 0; font-size: 0.6875rem; color: #6ee7b7; }
    .form-msg--err { color: #fecaca; }

    .aside-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem;
    }
    .mini-stat {
      text-align: center; padding: 0.5rem 0.25rem;
      background: rgba(2,44,34,0.8); border: 1px solid rgba(16,185,129,0.15);
      border-radius: 0.5rem;
    }
    .mini-stat__val { display: block; font-size: 1.125rem; font-weight: 800; color: #fff; }
    .mini-stat__lbl { font-size: 0.5rem; text-transform: uppercase; color: rgba(167,243,208,0.6); letter-spacing: 0.04em; }

    .list-toolbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem; margin-bottom: 0.875rem;
    }
    .list-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .filter-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .fchip {
      font-size: 0.625rem; font-weight: 600; padding: 0.3rem 0.6rem;
      border-radius: 9999px; border: 1px solid rgba(16,185,129,0.25);
      background: rgba(0,0,0,0.25); color: rgba(167,243,208,0.85); cursor: pointer;
    }
    .fchip--on { border-color: rgba(212,175,55,0.5); background: rgba(212,175,55,0.12); color: #fcd34d; }

    .list-loading { font-size: 0.8125rem; color: rgba(110,231,183,0.7); display: flex; gap: 0.5rem; align-items: center; }
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

    .collections-grid {
      display: grid; gap: 0.625rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) { .collections-grid { grid-template-columns: repeat(2, 1fr); } }

    .collection-card {
      position: relative; padding: 0.875rem 0.875rem 0.875rem 1rem;
      background: linear-gradient(145deg, rgba(6,78,59,0.75), rgba(2,44,34,0.95));
      border: 1px solid rgba(16,185,129,0.18); border-radius: 0.625rem;
      overflow: hidden; transition: border-color 0.2s, transform 0.15s;
    }
    .collection-card:hover { border-color: rgba(212,175,55,0.35); transform: translateY(-2px); }
    .collection-card__accent {
      position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    }
    .type--daily.collection-card__accent { background: #10b981; }
    .type--weekly.collection-card__accent { background: #3b82f6; }
    .type--event.collection-card__accent { background: #f59e0b; }

    .collection-card__top {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;
    }
    .collection-card__icon {
      width: 2rem; height: 2rem; border-radius: 0.5rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; border: 1px solid;
    }
    .type--daily { color: #6ee7b7; background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); }
    .type--weekly { color: #93c5fd; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.35); }
    .type--event { color: #fcd34d; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); }

    .type-badge {
      font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      padding: 0.15rem 0.4rem; border-radius: 9999px; border: 1px solid;
    }
    .collection-name { margin: 0 0 0.25rem; font-size: 0.875rem; font-weight: 700; color: #fff; line-height: 1.3; }
    .collection-tariqa { margin: 0; font-size: 0.6875rem; color: #D4AF37; font-weight: 600; }
    .collection-time { margin: 0.25rem 0 0; font-size: 0.625rem; color: rgba(167,243,208,0.6); }
    .collection-desc { margin: 0.35rem 0 0; font-size: 0.6875rem; color: rgba(167,243,208,0.55); line-height: 1.4; }
  `]
})
export class ContentAwradComponent implements OnInit {
  private content = inject(ContentService);

  readonly tariqaOptions = TARIQA_OPTIONS;
  readonly typeOptions = TYPE_OPTIONS;

  collections = signal<WirdCollection[]>([]);
  loading = signal(true);
  saving = signal(false);
  msg = signal('');
  msgOk = signal(true);
  typeFilter = '';

  dailyCount = computed(() => this.collections().filter(c => c.type === 'Daily').length);
  weeklyCount = computed(() => this.collections().filter(c => c.type === 'Weekly').length);

  filteredCollections = computed(() => {
    const f = this.typeFilter;
    if (!f) return this.collections();
    return this.collections().filter(c => c.type === f);
  });

  form = { name: '', tariqa: 'General' as string, type: 'Daily' as string };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.content.getCollections().subscribe({
      next: c => { this.collections.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  typeClass(type: string): string {
    const t = type.toLowerCase();
    if (t === 'weekly') return 'type--weekly';
    if (t === 'event') return 'type--event';
    return 'type--daily';
  }

  typeIcon(type: string): string {
    const t = type.toLowerCase();
    if (t === 'weekly') return '📅';
    if (t === 'event') return '✨';
    return '☀️';
  }

  tariqaLabel(tariqa: string): string {
    return TARIQA_OPTIONS.find(t => t.value === tariqa)?.label ?? tariqa;
  }

  create(): void {
    const name = this.form.name.trim();
    if (!name) return;
    this.saving.set(true);
    this.msg.set('');
    this.content.createCollection({ ...this.form, name }).subscribe({
      next: () => {
        this.form.name = '';
        this.saving.set(false);
        this.msgOk.set(true);
        this.msg.set('Collection created.');
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.msgOk.set(false);
        this.msg.set('Could not create collection.');
      },
    });
  }
}
