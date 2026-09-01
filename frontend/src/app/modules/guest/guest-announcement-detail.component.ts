import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GuestService } from '../../core/services/guest.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { Announcement } from '../../core/models';

@Component({
  selector: 'app-guest-announcement-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header badge="" title="Announcement" subtitle="Public announcement detail." />
    <a routerLink="/dashboard/guest/announcements" class="back">← All announcements</a>

    <article *ngIf="item() as a" class="detail">
      <span class="feat" *ngIf="a.isFeatured">Featured</span>
      <h1>{{ a.title }}</h1>
      <time *ngIf="a.publishedAt || a.createdAt">{{ (a.publishedAt || a.createdAt) | date:'mediumDate' }}</time>
      <img *ngIf="a.imageUrl" [src]="a.imageUrl" [alt]="a.title" class="hero" />
      <p class="summary" *ngIf="a.summary">{{ a.summary }}</p>
      <div class="body" *ngIf="a.body">{{ a.body }}</div>
    </article>
    <p *ngIf="!item() && !loading()" class="empty">Announcement not found.</p>
    <p *ngIf="loading()" class="empty">Loading…</p>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 1rem; color: #ed1919ff; text-decoration: none; font-size: 0.85rem; }
    .detail { background: rgba(255, 5, 5, 0.9); border: 1px solid rgba(75, 32, 32, 1); border-radius: 12px; padding: 1.25rem; }
    .feat { display: inline-block; background: rgba(255, 0, 0, 0.25); color: #fcd34d; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 999px; text-transform: uppercase; }
    h1 { margin: 0.5rem 0 0.25rem; color: #ff1e12ff; font-size: 1.5rem; }
    time { color: rgba(226, 35, 35, 0.7); font-size: 0.8rem; }
    .hero { width: 100%; max-height: 280px; object-fit: cover; border-radius: 10px; margin: 1rem 0; display: block; }
    .summary { color: #fe0000ff; font-size: 1rem; line-height: 1.5; }
    .body { margin-top: 1rem; color: #ed2f16ff; white-space: pre-wrap; line-height: 1.6; }
    .empty { color: rgba(227, 26, 26, 0.7); }
  `],
})
export class GuestAnnouncementDetailComponent implements OnInit {
  private guest = inject(GuestService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  item = signal<Announcement | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.guest.getAnnouncement(this.guest.defaultMosqueId, id).subscribe({
      next: a => {
        this.item.set(a);
        this.loading.set(false);
        this.seo.setPage(a.title, a.summary || 'Mosque announcement');
      },
      error: () => this.loading.set(false),
    });
  }
}
