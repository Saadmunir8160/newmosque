import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { JanazaAnnouncement } from '../../core/models';

@Component({
  selector: 'app-guest-janaza',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Janaza Notices"
      subtitle="Active funeral prayer announcements — read only." />

    <article *ngFor="let j of items()" class="card">
      <h2>{{ j.name }}</h2>
      <p><strong>Janaza:</strong> {{ j.janazaDate | date:'fullDate' }} at {{ j.janazaTime?.slice(0,5) }}</p>
      <p><strong>Location:</strong> {{ j.location }}</p>
      <p *ngIf="j.burialLocation"><strong>Burial:</strong> {{ j.burialLocation }}</p>
      <p *ngIf="j.notes" class="notes">{{ j.notes }}</p>
    </article>
    <p *ngIf="!items().length" class="empty">No active janaza notices at this time.</p>
  `,
  styles: [`
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; }
    h2 { margin: 0; font-size: 1rem; color: #fff; }
    p { margin: 0.35rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); }
    .notes { margin-top: 0.5rem; font-style: italic; }
    .empty { color: rgba(167,243,208,0.65); }
  `]
})
export class GuestJanazaComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  items = signal<JanazaAnnouncement[]>([]);

  ngOnInit(): void {
    this.seo.setPage('Janaza Notices', 'Active janaza funeral prayer announcements.');
    this.guest.getJanaza(this.guest.defaultMosqueId).subscribe(v => this.items.set(v));
  }
}
