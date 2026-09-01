import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Announcement } from '../../core/models';

@Component({
  selector: 'app-guest-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Announcements" subtitle="Latest mosque news — title, summary, image and date." />
    <input class="search" type="search" placeholder="Search announcements…" [(ngModel)]="query" (ngModelChange)="load()">

    <div class="grid">
      <a *ngFor="let a of items()" class="card" [routerLink]="['/dashboard/guest/announcements', a.id]">
        <img *ngIf="a.imageUrl" [src]="a.imageUrl" [alt]="a.title" />
        <div class="card__body">
          <span class="feat" *ngIf="a.isFeatured">Featured</span>
          <h2>{{ a.title }}</h2>
          <p class="summary">{{ a.summary }}</p>
          <time *ngIf="a.publishedAt || a.createdAt">{{ (a.publishedAt || a.createdAt) | date:'mediumDate' }}</time>
        </div>
      </a>
    </div>
    <p *ngIf="!items().length" class="empty">No announcements found.</p>
  `,
  styles: [`
    .search { width: 100%; box-sizing: border-box; margin-bottom: 1rem; padding: 0.55rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #ffffff; color: #1f2937; }
    .search::placeholder { color: #9ca3af; }
    .grid { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
    .card { display: flex; flex-direction: column; text-decoration: none; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; color: inherit; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .card:hover { border-color: #d1d5db; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .card img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .card__body { padding: 0.85rem; }
    .feat { display: inline-block; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #b45309; background: rgba(245,158,11,0.15); padding: 0.15rem 0.4rem; border-radius: 999px; margin-bottom: 0.35rem; }
    h2 { margin: 0; font-size: 1rem; color: #111827; }
    .summary { margin: 0.35rem 0; color: #4b5563; font-size: 0.8125rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    time { font-size: 0.72rem; color: #6b7280; }
    .empty { color: #6b7280; }
  `],
})
export class GuestAnnouncementsComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  items = signal<Announcement[]>([]);
  query = '';

  ngOnInit(): void {
    this.seo.setPage('Announcements', 'Latest mosque announcements and community updates.');
    this.load();
  }

  load(): void {
    this.guest.getAnnouncements(this.guest.defaultMosqueId, this.query).subscribe(v => this.items.set(v));
  }
}
