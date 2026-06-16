import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { WirdCollection } from '../../core/models';

interface RecommendedWird {
  slot: string;
  collection: WirdCollection;
  mode?: string;
}

@Component({
  selector: 'app-member-wird',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="My Wird"
      subtitle="Recommended reading and guided collections for your tariqa path." />

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <section *ngIf="recommended() as rec" class="hero">
      <span class="hero__badge">Recommended now</span>
      <h3 class="hero__title">{{ rec.collection.name }}</h3>
      <p class="hero__meta">{{ slotLabel(rec.slot) }} · {{ rec.collection.tariqa }} · {{ rec.collection.type }}</p>
      <p *ngIf="rec.collection.description" class="hero__desc">{{ rec.collection.description }}</p>
      <button type="button" class="btn-gold" [disabled]="busy()" (click)="complete(rec.collection.id)">
        {{ busy() ? 'Saving…' : (completedToday(rec.collection.id) ? '✓ Completed today' : 'Mark complete') }}
      </button>
    </section>

    <h3 class="section-title">All collections</h3>
    <div *ngIf="!otherCollections().length" class="empty">No other collections in the library yet.</div>

    <article *ngFor="let c of otherCollections()" class="card">
      <div class="card__main">
        <h4 class="card__title">{{ c.name }}</h4>
        <p class="card__meta">{{ c.tariqa }} · {{ c.type }}</p>
        <p *ngIf="c.recommendedTime" class="card__time">{{ c.recommendedTime }}</p>
      </div>
      <button type="button" class="btn-ghost" [disabled]="busy()" (click)="complete(c.id)">
        {{ completedToday(c.id) ? '✓ Done' : 'Complete' }}
      </button>
    </article>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .hero {
      margin-bottom: 1.25rem; padding: 1.125rem;
      background: linear-gradient(145deg, rgba(6,95,70,0.5), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.35); border-radius: 0.75rem;
    }
    .hero__badge { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fcd34d; }
    .hero__title { margin: 0.5rem 0 0.25rem; font-size: 1.25rem; font-weight: 700; color: #fff; }
    .hero__meta { margin: 0; font-size: 0.75rem; color: rgba(167,243,208,0.75); }
    .hero__desc { margin: 0.5rem 0 0.75rem; font-size: 0.8125rem; color: rgba(167,243,208,0.85); line-height: 1.5; }
    .section-title { margin: 0 0 0.75rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(212,175,55,0.85); }
    .empty { padding: 1.25rem; text-align: center; color: rgba(167,243,208,0.65); border: 1px dashed rgba(212,175,55,0.2); border-radius: 0.75rem; }
    .card {
      display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: center;
      margin-bottom: 0.625rem; padding: 0.875rem 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.9), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.18); border-radius: 0.75rem;
    }
    .card__title { margin: 0; font-size: 0.9375rem; font-weight: 700; color: #fff; }
    .card__meta { margin: 0.2rem 0 0; font-size: 0.75rem; color: rgba(167,243,208,0.7); }
    .card__time { margin: 0.15rem 0 0; font-size: 0.6875rem; color: rgba(212,175,55,0.75); }
    .btn-gold {
      margin-top: 0.75rem; font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: none;
      border-radius: 0.5rem; padding: 0.55rem 1rem; cursor: pointer;
    }
    .btn-gold:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      font-size: 0.75rem; font-weight: 700; color: #ecfdf5;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.35);
      border-radius: 0.5rem; padding: 0.4rem 0.75rem; cursor: pointer;
    }
    .btn-ghost:disabled { opacity: 0.5; }
  `]
})
export class MemberWirdComponent implements OnInit {
  private content = inject(ContentService);
  recommended = signal<RecommendedWird | null>(null);
  collections = signal<WirdCollection[]>([]);
  completedIds = signal<Set<number>>(new Set());
  busy = signal(false);
  msg = signal('');
  msgErr = signal(false);

  otherCollections = computed(() => {
    const recId = this.recommended()?.collection.id;
    return this.collections().filter(c => c.id !== recId);
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.content.getRecommendedWird().subscribe({
      next: r => this.recommended.set(r),
      error: () => this.showErr('Could not load recommended wird. Log in to sync your schedule.'),
    });
    this.content.getCollections().subscribe({
      next: c => this.collections.set(c),
      error: () => this.showErr('Could not load wird collections.'),
    });
    this.content.getWirdCompletedToday().subscribe({
      next: ids => this.completedIds.set(new Set(ids)),
      error: () => { /* guest */ },
    });
  }

  slotLabel(slot: string): string {
    return slot.replace(/([A-Z])/g, ' $1').trim();
  }

  completedToday(id: number): boolean {
    return this.completedIds().has(id);
  }

  complete(id: number): void {
    if (this.completedIds().has(id)) return;
    this.busy.set(true);
    this.msg.set('');
    this.content.markWirdComplete(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.completedIds.update(s => new Set([...s, id]));
        this.msgErr.set(false);
        this.msg.set('Wird marked complete — jazakAllah khair.');
      },
      error: () => { this.busy.set(false); this.showErr('Could not save progress. Log in and try again.'); },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
