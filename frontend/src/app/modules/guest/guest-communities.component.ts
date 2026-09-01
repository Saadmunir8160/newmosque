import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { GuestLoginCtaComponent } from './guest-login-cta.component';
import { Community } from '../../core/services/content.service';

@Component({
  selector: 'app-guest-communities',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, GuestLoginCtaComponent],
  template: `
    <app-page-header badge="" title="Communities"
      subtitle="Public spiritual circles — login to join." />
    <app-guest-login-cta />
    <article *ngFor="let c of items()" class="card">
      <span class="type">{{ c.type }}</span>
      <h2>{{ c.name }}</h2>
      <p>{{ c.description || 'No description provided.' }}</p>
    </article>
    <p *ngIf="!items().length" class="empty">No public communities listed.</p>
  `,
  styles: [`
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; }
    .type { font-size: 0.5625rem; text-transform: uppercase; color: #fcd34d; }
    h2 { margin: 0.25rem 0 0; font-size: 1rem; color: #fff; }
    p { margin: 0.35rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); line-height: 1.5; }
    .empty { color: rgba(167,243,208,0.65); }
  `]
})
export class GuestCommunitiesComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  items = signal<Community[]>([]);

  ngOnInit(): void {
    this.seo.setPage('Communities', 'Browse public tariqa circles and study groups.');
    this.guest.getCommunities(this.guest.defaultMosqueId).subscribe(v => this.items.set(v));
  }
}
