import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdhkarItem } from '../../core/services/content.service';

@Component({
  selector: 'app-guest-adhkar',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header badge="Guest" title="Adhkar Library"
      subtitle="Public dhikr and remembrance — read only (no counter)." />

    <article *ngFor="let a of items()" class="card">
      <div class="head">
        <h2>{{ a.title }}</h2>
        <span class="count">×{{ a.defaultCount }}</span>
      </div>
      <p class="arabic" dir="rtl">{{ a.arabicText }}</p>
      <p *ngIf="a.translation" class="trans">{{ a.translation }}</p>
    </article>
    <p *ngIf="!items().length" class="empty">No adhkar items published yet.</p>
  `,
  styles: [`
    .card { background: rgba(2,44,34,0.85); border: 1px solid rgba(16,185,129,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 0.75rem; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    h2 { margin: 0; font-size: 0.9375rem; color: #fff; }
    .count { font-size: 0.6875rem; color: #fcd34d; font-weight: 700; }
    .arabic { margin: 0.5rem 0 0; font-size: 1.0625rem; line-height: 1.75; color: #fff; }
    .trans { margin: 0.35rem 0 0; font-size: 0.8125rem; color: rgba(167,243,208,0.85); }
    .empty { color: rgba(167,243,208,0.65); }
  `]
})
export class GuestAdhkarComponent implements OnInit {
  private guest = inject(GuestService);
  private seo = inject(SeoService);
  items = signal<AdhkarItem[]>([]);

  ngOnInit(): void {
    this.seo.setPage('Adhkar Library', 'Browse daily dhikr and remembrance from the public library.');
    this.guest.getAdhkar().subscribe(v => this.items.set(v));
  }
}
