import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { MosqueService } from '../../core/services/mosque.service';
import { JanazaAnnouncement } from '../../core/models';

@Component({
  selector: 'app-guest-janaza',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guest-page">
      <header class="guest-head">
        <p class="guest-badge">Guest</p>
        <h1 class="guest-title">Janaza</h1>
        <p class="guest-sub">View public janaza announcements.</p>
      </header>

      <section class="card">
        <div *ngFor="let j of janaza()" class="item">
          <h3>{{ j.name }}</h3>
          <p>{{ j.janazaDate | date:'mediumDate' }} · {{ j.janazaTime.slice(0,5) }}</p>
          <p>{{ j.location }}</p>
        </div>
        <p *ngIf="!janaza().length" class="empty">No janaza announcements currently.</p>
      </section>
    </div>
  `,
  styles: [`
    .guest-page { display: flex; flex-direction: column; gap: 1rem; }
    .guest-badge { margin: 0; font-size: 0.7rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; }
    .guest-title { margin: 0.25rem 0 0; color: #fff; font-size: 1.5rem; }
    .guest-sub { margin: 0.25rem 0 0; color: #6ee7b7; font-size: 0.85rem; }
    .card { background: #064e3b; border: 1px solid #065f46; border-radius: 0.75rem; padding: 1rem; }
    .item { padding: 0.6rem 0; border-bottom: 1px solid rgba(6,95,70,0.6); }
    .item:last-child { border-bottom: none; }
    .item h3 { margin: 0; color: #fff; font-size: 0.95rem; }
    .item p { margin: 0.25rem 0 0; color: #d1fae5; font-size: 0.82rem; }
    .empty { margin: 0; color: #6ee7b7; font-size: 0.82rem; }
  `]
})
export class GuestJanazaComponent implements OnInit {
  private mosque = inject(MosqueService);
  private mosqueId = environment.defaultMosqueId;
  janaza = signal<JanazaAnnouncement[]>([]);

  ngOnInit(): void {
    this.mosque.getJanaza(this.mosqueId).subscribe(v => this.janaza.set(v));
  }
}
