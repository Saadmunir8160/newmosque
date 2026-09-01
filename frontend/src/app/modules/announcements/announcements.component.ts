import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MosqueService } from '../../core/services/mosque.service';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { Announcement } from '../../core/models';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wrap">
      <h2 class="heading-page mb-2">Announcements</h2>
      <p class="sub">Module 3.3 · Published mosque updates</p>
      <p *ngIf="loading()" class="text-mos-muted">Loading announcements…</p>
      <p *ngIf="!loading() && !items().length" class="text-mos-muted">No announcements yet.</p>

      <article *ngIf="featured() as f" class="featured">
        <span class="pill">Featured</span>
        <img *ngIf="f.imageUrl" [src]="f.imageUrl" [alt]="f.title" />
        <h3>{{ f.title }}</h3>
        <p>{{ f.summary }}</p>
        <time *ngIf="f.publishedAt || f.createdAt">{{ (f.publishedAt || f.createdAt) | date:'mediumDate' }}</time>
        <a class="link" [routerLink]="['/dashboard/guest/announcements', f.id]">Read more</a>
      </article>

      <div class="grid">
        <a *ngFor="let a of rest()" class="card" [routerLink]="['/dashboard/guest/announcements', a.id]">
          <img *ngIf="a.imageUrl" [src]="a.imageUrl" [alt]="a.title" />
          <div class="card__body">
            <h3>{{ a.title }}</h3>
            <p>{{ a.summary }}</p>
            <time *ngIf="a.publishedAt || a.createdAt">{{ (a.publishedAt || a.createdAt) | date:'mediumDate' }}</time>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .wrap { width: 100%; }
    .sub { margin: 0 0 1.25rem; color: #94a3b8; font-size: 0.875rem; }
    .featured {
      background: #0f172a; border: 1px solid rgba(245,158,11,0.35); border-radius: 16px;
      padding: 1.1rem; margin-bottom: 1.25rem;
    }
    .featured img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; margin: 0.75rem 0; }
    .pill { display: inline-block; background: rgba(245,158,11,0.2); color: #fbbf24; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 999px; }
    .featured h3, .card h3 { margin: 0.4rem 0 0; color: #fff; }
    .featured p, .card p { margin: 0.35rem 0; color: #94a3b8; }
    .link { color: #f59e0b; font-weight: 700; font-size: 0.85rem; }
    .grid { display: grid; gap: 0.85rem; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .card { text-decoration: none; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; overflow: hidden; color: inherit; }
    .card img { width: 100%; height: 120px; object-fit: cover; display: block; }
    .card__body { padding: 0.85rem; }
    time { font-size: 0.72rem; color: #64748b; }
  `],
})
export class AnnouncementsComponent implements OnInit {
  private mosqueService = inject(MosqueService);
  private mosqueContext = inject(MosqueContextService);
  items = signal<Announcement[]>([]);
  loading = signal(true);

  featured = computed(() => this.items().find(a => a.isFeatured) ?? this.items()[0] ?? null);
  rest = computed(() => {
    const f = this.featured();
    return this.items().filter(a => a.id !== f?.id);
  });

  ngOnInit(): void {
    this.mosqueContext.resolve().then(id => {
      this.mosqueService.getAnnouncements(id).subscribe({
        next: a => { this.items.set(a ?? []); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }
}
