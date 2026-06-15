import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { Announcement, MosqueEvent } from '../../core/models';

@Component({
  selector: 'app-guest-updates',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guest-page">
      <header class="guest-head">
        <p class="guest-badge">Guest</p>
        <h1 class="guest-title">Announcements & events</h1>
        <p class="guest-sub">Browse public updates from your selected mosque.</p>
      </header>

      <section class="card">
        <h2 class="card-title">Announcements</h2>
        <div *ngFor="let a of announcements()" class="item">
          <h3>{{ a.title }}</h3>
          <p>{{ a.summary }}</p>
        </div>
        <p *ngIf="!announcements().length" class="empty">No public announcements.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Events</h2>
        <div *ngFor="let e of events()" class="item">
          <h3>{{ e.title }}</h3>
          <p>{{ e.date | date:'mediumDate' }}<span *ngIf="e.startTime"> · {{ e.startTime.slice(0,5) }}</span></p>
        </div>
        <p *ngIf="!events().length" class="empty">No upcoming public events.</p>
      </section>
    </div>
  `,
  styles: [`
    .guest-page { display: flex; flex-direction: column; gap: 1rem; }
    .guest-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .guest-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .guest-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .card-title { margin: 0 0 0.75rem; color: #fff; font-size: 1rem; }
    .item { padding: 0.6rem 0; border-bottom: 1px solid rgba(6,95,70,0.6); }
    .item:last-child { border-bottom: none; }
    .item h3 { margin: 0; color: #fff; font-size: 0.95rem; }
    .item p { margin: 0.25rem 0 0; color: #d1fae5; font-size: 0.82rem; }
    .empty { margin: 0; color: #6ee7b7; font-size: 0.82rem; }
  `]
})
export class GuestUpdatesComponent implements OnInit {
  private mosque = inject(MosqueService);
  private mosqueId = environment.defaultMosqueId;
  announcements = signal<Announcement[]>([]);
  events = signal<MosqueEvent[]>([]);

  ngOnInit(): void {
    this.mosque.getAnnouncements(this.mosqueId).subscribe(v => this.announcements.set(v));
    this.mosque.getEvents(this.mosqueId).subscribe(v => this.events.set(v));
  }
}
