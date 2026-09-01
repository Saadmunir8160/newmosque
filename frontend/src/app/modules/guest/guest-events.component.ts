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
    <app-page-header badge="" title="Events" subtitle="Upcoming mosque programmes — view only." />
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
    .search { width: 100%; box-sizing: border-box; margin-bottom: 1rem; padding: 0.55rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #ffffff; color: #1f2937; }
    .search::placeholder { color: #9ca3af; }
    .card { display: block; text-decoration: none; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .card:hover { border-color: #d1d5db; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .type { font-size: 0.5625rem; font-weight: 800; text-transform: uppercase; color: #b45309; }
    h2 { margin: 0.25rem 0 0; font-size: 1rem; color: #111827; }
    p { margin: 0.25rem 0 0; font-size: 0.8125rem; color: #4b5563; }
    .excerpt { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .empty { color: #6b7280; }
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
