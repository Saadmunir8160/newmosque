import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ContentService, Community } from '../../core/services/content.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-member-communities',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, RouterModule],
  template: `
    <app-page-header badge="Member" title="Communities"
      subtitle="Join tariqa circles and study groups at your mosque." />

    <p *ngIf="msg()" class="member-toast" [class.member-toast--err]="msgErr()">{{ msg() }}</p>

    <div *ngIf="loading()" class="member-loading">Loading communities...</div>
    <div *ngIf="!loading() && !communities().length" class="member-empty">No public communities yet.</div>

    <article *ngFor="let c of communities()" class="member-card" [class.member-card--joined]="isJoined(c.id)">
      <div class="member-card__row">
        <div>
          <span class="member-tag">{{ c.type }}</span>
          <h3 class="member-title">{{ c.name }}</h3>
          <p class="member-desc">{{ c.description || 'No description yet.' }}</p>
        </div>
        <span *ngIf="isJoined(c.id)" class="member-badge">Member</span>
        <a *ngIf="isJoined(c.id)" [routerLink]="['/dashboard/member/communities', c.id]" class="ml-2 text-blue-600 hover:underline">View Feed</a>
        <button *ngIf="!isJoined(c.id)" type="button" class="member-btn-primary"
          [disabled]="busyId() === c.id" (click)="join(c)">
          {{ busyId() === c.id ? 'Joining...' : 'Join' }}
        </button>
      </div>
    </article>
  `,
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
      list: this.content.getCommunities(environment.defaultMosqueId),
      mine: this.content.getMyCommunityIds(),
    }).subscribe({
      next: ({ list, mine }) => {
        this.communities.set(list);
        this.joined.set(new Set(mine));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.showErr('Could not load communities.'); },
    });
  }

  isJoined(id: number): boolean {
    return this.joined().has(id);
  }

  join(c: Community): void {
    this.busyId.set(c.id);
    this.msg.set('');
    this.content.joinCommunity(c.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.joined.update(s => new Set([...s, c.id]));
        this.msgErr.set(false);
        this.msg.set(`Joined ${c.name}.`);
      },
      error: () => { this.busyId.set(null); this.showErr('Could not join community.'); },
    });
  }

  private showErr(text: string): void {
    this.msgErr.set(true);
    this.msg.set(text);
  }
}
