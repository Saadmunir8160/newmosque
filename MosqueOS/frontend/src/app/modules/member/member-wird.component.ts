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

    <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()">{{ msg() }}</p>

    <section *ngIf="recommended() as rec" class="member-card member-card--hero">
      <span class="member-tag">Recommended now</span>
      <h3 class="member-title member-title--lg">{{ rec.collection.name }}</h3>
      <p class="member-meta">{{ slotLabel(rec.slot) }} · {{ rec.collection.tariqa }} · {{ rec.collection.type }}</p>
      <p *ngIf="rec.collection.description" class="member-desc">{{ rec.collection.description }}</p>
      <button type="button" class="member-btn-primary member-btn-primary--block" [disabled]="busy()" (click)="complete(rec.collection.id)">
        {{ busy() ? 'Saving…' : (completedToday(rec.collection.id) ? '✓ Completed today' : 'Mark complete') }}
      </button>
    </section>

    <h3 class="member-section-title">All collections</h3>
    <div *ngIf="!otherCollections().length" class="member-empty">No other collections in the library yet.</div>

    <article *ngFor="let c of otherCollections()" class="member-card">
      <div class="member-card__row member-card__row--center">
        <div>
          <h4 class="member-title">{{ c.name }}</h4>
          <p class="member-meta">{{ c.tariqa }} · {{ c.type }}</p>
          <p *ngIf="c.recommendedTime" class="member-meta" style="color: var(--mos-gold-deep);">{{ c.recommendedTime }}</p>
        </div>
        <button type="button" class="member-btn-ghost" [disabled]="busy()" (click)="complete(c.id)">
          {{ completedToday(c.id) ? '✓ Done' : 'Complete' }}
        </button>
      </div>
    </article>
  `,
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
