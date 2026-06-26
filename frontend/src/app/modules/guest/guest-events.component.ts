import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { GuestLoginCtaComponent } from './guest-login-cta.component';
import { MosqueEvent } from '../../core/models';
import { formatTime12 } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-guest-events',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, GuestLoginCtaComponent],
  template: `
    <app-page-header badge="Guest" title="Events" subtitle="Upcoming mosque programmes — view only." />
    <app-guest-login-cta />
    <input class="search" type="search" placeholder="Search events…" [(ngModel)]="query" (ngModelChange)="load()">
    <article *ngFor="let e of items()" class="card" [routerLink]="['/dashboard/guest/events', e.id]">
      <span class="type">{{ e.eventType }}</span>
      <h2>{{ e.title }}</h2>
      <p>{{ e.date | date:'fullDate' }} · {{ formatTime(e.startTime) }}</p>
      <p *ngIf="e.location" class="loc">{{ e.location }}</p>
      <p class="excerpt">{{ e.description }}</p>
    </article>
    <p *ngIf="!items().length" class="empty">No upcoming events.</p>
  `,
  styles: [`
    .search { width: 100%; box-sizing: border-box; margin-bottom: 1rem; padding: 0.55rem; border-radius: 0.5rem; border: 1px solid rgba(212,175,55,0.25); background: rgba(0,0,0,0.35); color: #fff; }
    .card { display: block; text-decoration: none; background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; }
    .card:hover { border-color: rgba(212,175,55,0.4); }
    .type { font-size: 0.5625rem; text-transform: uppercase; color: #fcd34d; }
    h2 { margin: 0.25rem 0 0; font-size: 1rem; color: #fff; }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); }
    .excerpt { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .empty { color: rgba(167,243,208,0.65); }
  `]
})
export class GuestEventsComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  items = signal<MosqueEvent[]>([]);
  query = '';
  formatTime = formatTime12;

  ngOnInit(): void {
    this.seo.setPage('Events', 'Upcoming mosque events and community programmes.');
    this.load();
  }

  load(): void {
    this.guest.getEvents(this.guest.defaultMosqueId, this.query).subscribe(v => this.items.set(v));
  }
}
