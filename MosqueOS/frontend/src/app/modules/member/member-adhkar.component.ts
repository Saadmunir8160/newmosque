import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, AdhkarItem } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

interface MyAdhkarRow {
  userAdhkar: {
    id: number;
    targetCount: number;
    adhkarItem?: AdhkarItem;
    customTitle?: string;
  };
  todayCount: number;
}

@Component({
  selector: 'app-member-adhkar',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Adhkar Counter"
      subtitle="Tap +1 or +10 — build your daily dhikr list from the library." />

    <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()">{{ msg() }}</p>

    <div *ngIf="loading()" class="member-loading">Loading your dhikr list…</div>

    <div *ngIf="!loading() && !mine().length" class="member-empty">
      No counters yet — add dhikr from the library below.
    </div>

    <article *ngFor="let item of mine()" class="member-card" [class.member-card--done]="isDone(item)">
      <div class="member-counter__head">
        <div>
          <h3 class="member-title">{{ titleOf(item) }}</h3>
          <p *ngIf="item.userAdhkar.adhkarItem?.arabicText" class="member-arabic" dir="rtl">
            {{ item.userAdhkar.adhkarItem!.arabicText }}
          </p>
        </div>
        <button type="button" class="member-counter__remove" title="Remove" (click)="remove(item.userAdhkar.id)">✕</button>
      </div>
      <div class="member-counter__nums">
        <span class="member-counter__count">{{ item.todayCount }}</span>
        <span class="member-counter__sep">/</span>
        <span class="member-counter__target">{{ item.userAdhkar.targetCount }}</span>
      </div>
      <div class="member-progress__bar">
        <div class="member-progress__fill" [style.width.%]="progress(item)"></div>
      </div>
      <div class="member-counter__actions">
        <button type="button" class="member-btn-secondary" [disabled]="busyId() === item.userAdhkar.id || isDone(item)"
          (click)="inc(item.userAdhkar.id, 1)">+1</button>
        <button type="button" class="member-btn-secondary" [disabled]="busyId() === item.userAdhkar.id || isDone(item)"
          (click)="inc(item.userAdhkar.id, 10)">+10</button>
        <span *ngIf="isDone(item)" class="member-counter__done">✓ Complete</span>
      </div>
    </article>

    <section class="member-card">
      <h3 class="member-section-title">Add from library</h3>
      <div class="member-chips">
        <button *ngFor="let a of availableLibrary()" type="button" class="member-lib-chip" (click)="add(a)">
          <span class="member-lib-chip__name">{{ a.title }}</span>
          <span class="member-lib-chip__count">×{{ a.defaultCount }}</span>
        </button>
      </div>
      <p *ngIf="!availableLibrary().length && library().length" class="member-hint">
        All library items are already on your list.
      </p>
    </section>
  `,
})
export class MemberAdhkarComponent implements OnInit {
  private content = inject(ContentService);
  mine = signal<MyAdhkarRow[]>([]);
  library = signal<AdhkarItem[]>([]);
  loading = signal(true);
  busyId = signal<number | null>(null);
  msg = signal('');
  msgErr = signal(false);

  availableLibrary = computed(() => {
    const onList = new Set(
      this.mine().map(m => m.userAdhkar.adhkarItem?.id).filter((id): id is number => id != null)
    );
    return this.library().filter(a => a.title?.trim() && !onList.has(a.id));
  });

  ngOnInit(): void {
    this.load();
    this.content.getAdhkarItems().subscribe({
      next: l => this.library.set(l.filter(a => a.title?.trim())),
      error: () => this.showErr('Could not load adhkar library.'),
    });
  }

  load(): void {
    this.loading.set(true);
    this.content.getMyAdhkar().subscribe({
      next: m => { this.mine.set(m); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showErr('Could not load your counters. Log in and try again.'); },
    });
  }

  titleOf(item: MyAdhkarRow): string {
    return item.userAdhkar.adhkarItem?.title?.trim()
      || item.userAdhkar.customTitle?.trim()
      || 'Dhikr';
  }

  progress(item: MyAdhkarRow): number {
    const t = item.userAdhkar.targetCount || 1;
    return Math.min(100, (item.todayCount / t) * 100);
  }

  isDone(item: MyAdhkarRow): boolean {
    return item.todayCount >= item.userAdhkar.targetCount;
  }

  inc(id: number, by: number): void {
    this.busyId.set(id);
    this.msg.set('');
    this.content.incrementAdhkar(id, by).subscribe({
      next: res => {
        this.busyId.set(null);
        this.mine.update(list => list.map(row =>
          row.userAdhkar.id === id ? { ...row, todayCount: res.completed } : row
        ));
        if (res.isComplete) {
          this.msgErr.set(false);
          this.msg.set('Target reached — mashaAllah!');
        }
      },
      error: () => { this.busyId.set(null); this.showErr('Could not update counter.'); },
    });
  }

  add(a: AdhkarItem): void {
    this.msg.set('');
    this.content.addToMyAdhkar(a.id, a.defaultCount).subscribe({
      next: () => { this.msgErr.set(false); this.msg.set(`${a.title} added to your list.`); this.load(); },
      error: err => this.showErr(err.error?.message ?? 'Could not add dhikr.'),
    });
  }

  remove(id: number): void {
    this.content.removeFromMyAdhkar(id).subscribe({
      next: () => this.load(),
      error: () => this.showErr('Could not remove dhikr.'),
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
