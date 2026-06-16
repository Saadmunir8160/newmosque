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

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <div *ngIf="loading()" class="loading">Loading your dhikr list…</div>

    <div *ngIf="!loading() && !mine().length" class="empty">
      No counters yet — add dhikr from the library below.
    </div>

    <article *ngFor="let item of mine()" class="counter" [class.counter--done]="isDone(item)">
      <div class="counter__head">
        <div>
          <h3 class="counter__title">{{ titleOf(item) }}</h3>
          <p *ngIf="item.userAdhkar.adhkarItem?.arabicText" class="counter__arabic" dir="rtl">
            {{ item.userAdhkar.adhkarItem!.arabicText }}
          </p>
        </div>
        <button type="button" class="counter__remove" title="Remove" (click)="remove(item.userAdhkar.id)">✕</button>
      </div>
      <div class="counter__nums">
        <span class="counter__count">{{ item.todayCount }}</span>
        <span class="counter__sep">/</span>
        <span class="counter__target">{{ item.userAdhkar.targetCount }}</span>
      </div>
      <div class="counter__bar">
        <div class="counter__fill" [style.width.%]="progress(item)"></div>
      </div>
      <div class="counter__actions">
        <button type="button" class="btn-step" [disabled]="busyId() === item.userAdhkar.id || isDone(item)"
          (click)="inc(item.userAdhkar.id, 1)">+1</button>
        <button type="button" class="btn-step" [disabled]="busyId() === item.userAdhkar.id || isDone(item)"
          (click)="inc(item.userAdhkar.id, 10)">+10</button>
        <span *ngIf="isDone(item)" class="counter__done">✓ Complete</span>
      </div>
    </article>

    <section class="library">
      <h3 class="library__title">Add from library</h3>
      <div class="library__chips">
        <button *ngFor="let a of availableLibrary()" type="button" class="lib-chip" (click)="add(a)">
          <span class="lib-chip__name">{{ a.title }}</span>
          <span class="lib-chip__count">×{{ a.defaultCount }}</span>
        </button>
      </div>
      <p *ngIf="!availableLibrary().length && library().length" class="library__hint">
        All library items are already on your list.
      </p>
    </section>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .loading, .empty {
      padding: 1.5rem; text-align: center; color: rgba(167,243,208,0.7);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; margin-bottom: 1rem;
    }
    .counter {
      margin-bottom: 0.875rem; padding: 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.28); border-radius: 0.75rem;
    }
    .counter--done { border-color: rgba(110,231,183,0.45); }
    .counter__head { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
    .counter__title { margin: 0; font-size: 1rem; font-weight: 700; color: #fff; }
    .counter__arabic { margin: 0.25rem 0 0; font-size: 1.1rem; color: rgba(167,243,208,0.9); }
    .counter__remove { background: transparent; border: none; color: rgba(167,243,208,0.6); cursor: pointer; font-size: 0.875rem; }
    .counter__nums { display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 0.5rem; }
    .counter__count { font-size: 1.75rem; font-weight: 800; color: #fcd34d; font-family: ui-monospace, monospace; }
    .counter__sep, .counter__target { font-size: 1rem; color: rgba(167,243,208,0.75); font-family: ui-monospace, monospace; }
    .counter__bar { height: 0.375rem; background: rgba(0,0,0,0.35); border-radius: 9999px; overflow: hidden; margin-bottom: 0.75rem; }
    .counter__fill { height: 100%; background: linear-gradient(90deg, #d97706, #fcd34d); border-radius: 9999px; transition: width 0.25s ease; }
    .counter__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .btn-step {
      font-size: 0.8125rem; font-weight: 700; color: #ecfdf5;
      background: rgba(0,0,0,0.35); border: 1px solid rgba(16,185,129,0.4);
      border-radius: 0.5rem; padding: 0.45rem 0.85rem; cursor: pointer;
    }
    .btn-step:disabled { opacity: 0.45; cursor: not-allowed; }
    .counter__done { font-size: 0.8125rem; font-weight: 700; color: #6ee7b7; margin-left: auto; }
    .library {
      margin-top: 1rem; padding: 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.85), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.22); border-radius: 0.75rem;
    }
    .library__title { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .library__chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .lib-chip {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.35);
      border-radius: 9999px; padding: 0.4rem 0.75rem; cursor: pointer; color: #ecfdf5;
    }
    .lib-chip:hover { border-color: rgba(212,175,55,0.6); color: #fcd34d; }
    .lib-chip__name { font-size: 0.8125rem; font-weight: 600; }
    .lib-chip__count { font-size: 0.6875rem; color: rgba(212,175,55,0.9); font-weight: 700; }
    .library__hint { margin: 0.75rem 0 0; font-size: 0.75rem; color: rgba(167,243,208,0.65); }
  `]
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
