import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ContentService, Community } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-member-communities',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Member" title="Communities"
      subtitle="Join tariqa circles and study groups at your mosque." />

    <p *ngIf="msg()" class="toast" [class.toast--err]="msgErr()">{{ msg() }}</p>

    <div *ngIf="loading()" class="loading">Loading communities...</div>
    <div *ngIf="!loading() && !communities().length" class="empty">No public communities yet.</div>

    <article *ngFor="let c of communities()" class="card" [class.card--joined]="isJoined(c.id)">
      <div class="card__main">
        <span class="card__type">{{ c.type }}</span>
        <h3 class="card__title">{{ c.name }}</h3>
        <p class="card__desc">{{ c.description || 'No description yet.' }}</p>
      </div>
      <span *ngIf="isJoined(c.id)" class="joined-badge">Member</span>
      <button *ngIf="!isJoined(c.id)" type="button" class="btn-join"
        [disabled]="busyId() === c.id" (click)="join(c)">
        {{ busyId() === c.id ? 'Joining...' : 'Join' }}
      </button>
    </article>
  `,
  styles: [`
    .toast { margin-bottom: 0.75rem; font-size: 0.8125rem; color: #6ee7b7; }
    .toast--err { color: #fecaca; }
    .loading, .empty {
      padding: 1.5rem; text-align: center; color: rgba(167,243,208,0.7);
      border: 1px dashed rgba(212,175,55,0.25); border-radius: 0.75rem; margin-bottom: 1rem;
    }
    .card {
      display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: flex-start;
      margin-bottom: 0.875rem; padding: 1rem 1.125rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.95), rgba(2,44,34,0.98));
      border: 1px solid rgba(212,175,55,0.25); border-radius: 0.75rem;
    }
    .card--joined { border-color: rgba(110,231,183,0.35); }
    .card__type {
      display: inline-block; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #fcd34d; background: rgba(212,175,55,0.12);
      border: 1px solid rgba(212,175,55,0.3); padding: 0.15rem 0.45rem; border-radius: 9999px; margin-bottom: 0.35rem;
    }
    .card__title { margin: 0; font-size: 1.0625rem; font-weight: 700; color: #fff; }
    .card__desc { margin: 0.4rem 0 0; font-size: 0.8125rem; line-height: 1.5; color: rgba(167,243,208,0.85); max-width: 36rem; }
    .joined-badge {
      font-size: 0.75rem; font-weight: 700; color: #6ee7b7;
      background: rgba(110,231,183,0.15); border: 1px solid rgba(110,231,183,0.4);
      border-radius: 0.5rem; padding: 0.5rem 0.85rem; white-space: nowrap; user-select: none;
    }
    .btn-join {
      font-size: 0.8125rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37); border: none;
      border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; white-space: nowrap;
    }
    .btn-join:disabled { opacity: 0.55; cursor: not-allowed; }
  `]
})
export class MemberCommunitiesComponent implements OnInit {
  private content = inject(ContentService);
  communities = signal<Community[]>([]);
  joined = signal<Set<number>>(new Set());
  loading = signal(true);
  busyId = signal<number | null>(null);
  msg = signal('');
  msgErr = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    forkJoin({
      communities: this.content.getCommunities(environment.defaultMosqueId),
      joined: this.content.getMyCommunityIds(),
    }).subscribe({
      next: ({ communities, joined }) => {
        this.communities.set(communities);
        this.joined.set(new Set(joined));
        this.loading.set(false);
      },
      error: () => {
        this.content.getCommunities(environment.defaultMosqueId).subscribe({
          next: c => { this.communities.set(c); this.loading.set(false); },
          error: () => { this.loading.set(false); this.showErr('Could not load communities.'); },
        });
      },
    });
  }

  isJoined(id: number): boolean {
    return this.joined().has(id);
  }

  join(c: Community): void {
    if (this.isJoined(c.id) || this.busyId() === c.id) return;
    this.busyId.set(c.id);
    this.msg.set('');
    this.content.joinCommunity(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.joined.update(s => new Set([...s, c.id]));
        this.msgErr.set(false);
        this.msg.set(`Joined ${c.name} — welcome!`);
      },
      error: err => {
        this.busyId.set(null);
        if (err.status === 409) {
          this.joined.update(s => new Set([...s, c.id]));
          this.msgErr.set(false);
          this.msg.set('You are already a member.');
        } else if (err.status === 401) {
          this.showErr('Please log in to join a community.');
        } else {
          this.showErr('Could not join. Try again.');
        }
      },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
