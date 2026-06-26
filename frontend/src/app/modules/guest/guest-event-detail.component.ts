import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { GuestLoginCtaComponent } from './guest-login-cta.component';
import { MosqueEvent } from '../../core/models';
import { formatTime12 } from '../../core/utils/prayer.utils';

@Component({
  selector: 'app-guest-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, GuestLoginCtaComponent],
  template: `
    <a routerLink="/dashboard/guest/events" class="back">← Back to events</a>
    <app-page-header *ngIf="event() as e" badge="Guest" [title]="e.title" subtitle="Event details" />
    <app-guest-login-cta />
    <section *ngIf="event() as e" class="card">
      <p><strong>Date:</strong> {{ e.date | date:'fullDate' }}</p>
      <p><strong>Time:</strong> {{ formatTime(e.startTime) }}<span *ngIf="e.endTime"> – {{ formatTime(e.endTime) }}</span></p>
      <p *ngIf="e.location"><strong>Location:</strong> {{ e.location }}</p>
      <p><strong>Type:</strong> {{ e.eventType }}</p>
      <div class="body">{{ e.description }}</div>
    </section>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 0.75rem; color: #fcd34d; font-size: 0.8125rem; text-decoration: none; }
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; }
    p { margin: 0 0 0.5rem; color: rgba(167,243,208,0.9); font-size: 0.875rem; }
    .body { margin-top: 1rem; color: #ecfdf5; line-height: 1.6; white-space: pre-wrap; }
  `]
})
export class GuestEventDetailComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  event = signal<MosqueEvent | null>(null);
  formatTime = formatTime12;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.guest.getEvent(this.guest.defaultMosqueId, id).subscribe(e => {
      this.event.set(e);
      this.seo.setPage(e.title, e.description || 'Mosque event details.');
    });
  }
}
