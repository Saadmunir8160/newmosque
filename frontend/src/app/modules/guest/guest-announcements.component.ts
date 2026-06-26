import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Announcement } from '../../core/models';

@Component({
  selector: 'app-guest-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Guest" title="Announcements" subtitle="Latest mosque news — read only." />
    <input class="search" type="search" placeholder="Search announcements…" [(ngModel)]="query" (ngModelChange)="load()">
    <article *ngFor="let a of items()" class="card">
      <h2>{{ a.title }}</h2>
      <p class="summary">{{ a.summary }}</p>
      <div *ngIf="a.body" class="body">{{ a.body }}</div>
    </article>
    <p *ngIf="!items().length" class="empty">No announcements found.</p>
  `,
  styles: [`
    .search { width: 100%; box-sizing: border-box; margin-bottom: 1rem; padding: 0.55rem; border-radius: 0.5rem; border: 1px solid rgba(212,175,55,0.25); background: rgba(0,0,0,0.35); color: #fff; }
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; }
    h2 { margin: 0; font-size: 1rem; color: #fff; }
    .summary { margin: 0.35rem 0 0; color: rgba(167,243,208,0.85); font-size: 0.8125rem; }
    .body { margin-top: 0.5rem; font-size: 0.8125rem; color: rgba(236,253,245,0.9); line-height: 1.55; white-space: pre-wrap; }
    .empty { color: rgba(167,243,208,0.65); }
  `]
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
