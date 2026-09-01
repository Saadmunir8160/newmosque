import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { Announcement } from '../../../core/models';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, MatSnackBarModule],
  template: `
    <app-page-header
      badge="Module 3.3"
      title="Announcements"
      subtitle="Create, edit, publish, unpublish and feature mosque announcements." />

    <div class="toolbar">
      <input class="input" placeholder="Search…" [(ngModel)]="search" (ngModelChange)="load()" />
      <select class="input w-auto" [(ngModel)]="statusFilter" (ngModelChange)="load()">
        <option value="">All statuses</option>
        <option value="Draft">Draft</option>
        <option value="Published">Published</option>
        <option value="Unpublished">Unpublished</option>
      </select>
    </div>

    <section class="panel">
      <h2 class="panel__title">{{ editingId() ? 'Edit announcement' : 'Create announcement' }}</h2>
      <input class="input mb" placeholder="Title" [(ngModel)]="form.title" />
      <input class="input mb" placeholder="Summary" [(ngModel)]="form.summary" />
      <textarea class="input mb" rows="4" placeholder="Body" [(ngModel)]="form.body"></textarea>
      <input class="input mb" placeholder="Image URL (optional)" [(ngModel)]="form.imageUrl" />
      <label class="check mb">
        <input type="checkbox" [(ngModel)]="form.isFeatured" />
        Featured on homepage / mosque profile
      </label>
      <div class="actions">
        <button type="button" class="btn" (click)="save()">{{ editingId() ? 'Save changes' : 'Create draft' }}</button>
        <button *ngIf="editingId()" type="button" class="btn btn--ghost" (click)="cancelEdit()">Cancel</button>
      </div>
    </section>

    <div class="list">
      <article class="card" *ngFor="let a of items()">
        <div class="card__media" *ngIf="a.imageUrl">
          <img [src]="a.imageUrl" [alt]="a.title" />
        </div>
        <div class="card__body">
          <div class="card__meta">
            <span class="badge" [attr.data-status]="a.status">{{ a.status }}</span>
            <span class="badge badge--feat" *ngIf="a.isFeatured">Featured</span>
            <time *ngIf="a.publishedAt || a.createdAt">{{ (a.publishedAt || a.createdAt) | date:'mediumDate' }}</time>
          </div>
          <h3>{{ a.title }}</h3>
          <p>{{ a.summary }}</p>
          <div class="card__actions">
            <button type="button" class="btn-sm" (click)="startEdit(a)">Edit</button>
            <button *ngIf="a.status !== 'Published'" type="button" class="btn-sm" (click)="publish(a.id)">Publish</button>
            <button *ngIf="a.status === 'Published'" type="button" class="btn-sm btn-sm--warn" (click)="unpublish(a.id)">Unpublish</button>
            <button type="button" class="btn-sm btn-sm--danger" (click)="del(a.id)">Delete</button>
          </div>
        </div>
      </article>
      <p *ngIf="!items().length" class="empty">No announcements yet.</p>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .panel {
      background: #0f172a; border: 1px solid rgba(248,250,252,0.12); border-radius: 12px;
      padding: 1rem; margin-bottom: 1.25rem;
    }
    .panel__title { margin: 0 0 0.75rem; color: #fff; font-size: 1rem; font-weight: 800; }
    .input {
      background: #020617; border: 1px solid rgba(248,250,252,0.2); border-radius: 8px;
      padding: 10px; color: #fff; width: 100%; box-sizing: border-box; font-family: inherit;
    }
    .w-auto { width: auto; min-width: 140px; }
    .mb { margin-bottom: 0.55rem; display: block; }
    .check { display: flex; align-items: center; gap: 0.45rem; color: #cbd5e1; font-size: 0.85rem; font-weight: 600; }
    .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.35rem; }
    .btn {
      background: #f59e0b; color: #0f172a; font-weight: 700; padding: 8px 16px;
      border-radius: 8px; border: none; cursor: pointer; font-family: inherit;
    }
    .btn--ghost { background: transparent; color: #e2e8f0; border: 1px solid rgba(248,250,252,0.25); }
    .list { display: flex; flex-direction: column; gap: 0.75rem; }
    .card {
      display: grid; grid-template-columns: auto 1fr; gap: 0.85rem;
      background: #0f172a; border: 1px solid rgba(248,250,252,0.12); border-radius: 12px; padding: 0.85rem;
    }
    @media (max-width: 640px) { .card { grid-template-columns: 1fr; } }
    .card__media img { width: 120px; height: 80px; object-fit: cover; border-radius: 8px; display: block; }
    .card__meta { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.35rem; }
    .card__meta time { font-size: 0.72rem; color: #94a3b8; }
    .badge {
      display: inline-flex; padding: 0.15rem 0.45rem; border-radius: 999px;
      font-size: 0.65rem; font-weight: 800; text-transform: uppercase; background: #1e293b; color: #cbd5e1;
    }
    .badge[data-status="Published"] { background: rgba(16,185,129,0.2); color: #6ee7b7; }
    .badge[data-status="Draft"] { background: rgba(245,158,11,0.2); color: #fcd34d; }
    .badge[data-status="Unpublished"] { background: rgba(148,163,184,0.2); color: #94a3b8; }
    .badge--feat { background: rgba(245,158,11,0.25); color: #fbbf24; }
    h3 { margin: 0; color: #fff; font-size: 1.05rem; }
    .card__body p { margin: 0.35rem 0 0; color: #94a3b8; font-size: 0.85rem; }
    .card__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.65rem; }
    .btn-sm {
      background: #10b981; color: #0f172a; font-weight: 700; padding: 4px 10px;
      border-radius: 6px; border: none; font-size: 11px; cursor: pointer; font-family: inherit;
    }
    .btn-sm--warn { background: #f59e0b; }
    .btn-sm--danger { background: #ef4444; color: #fff; }
    .empty { color: #94a3b8; }
  `],
})
export class AdminAnnouncementsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);
  private snack = inject(MatSnackBar);

  items = signal<Announcement[]>([]);
  form = { title: '', summary: '', body: '', imageUrl: '', isFeatured: false };
  editingId = signal<number | null>(null);
  search = '';
  statusFilter = '';
  mid = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mid = id;
      this.load();
    });
  }

  load(): void {
    this.mosque.getAnnouncements(this.mid, true, this.search, this.statusFilter || undefined)
      .subscribe(a => this.items.set(a ?? []));
  }

  save(): void {
    if (!this.form.title.trim()) {
      this.snack.open('Title is required.', 'OK', { duration: 2500 });
      return;
    }
    const payload = {
      title: this.form.title.trim(),
      summary: this.form.summary.trim(),
      body: this.form.body.trim(),
      imageUrl: this.form.imageUrl.trim() || undefined,
      isFeatured: this.form.isFeatured,
    };
    const id = this.editingId();
    const req = id
      ? this.admin.updateAnnouncement(this.mid, id, payload)
      : this.admin.createAnnouncement(this.mid, payload);

    req.subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
        this.snack.open(id ? 'Announcement updated.' : 'Draft created.', 'OK', { duration: 2500 });
      },
      error: () => this.snack.open('Could not save announcement.', 'OK', { duration: 3500 }),
    });
  }

  startEdit(a: Announcement): void {
    this.editingId.set(a.id);
    this.form = {
      title: a.title,
      summary: a.summary ?? '',
      body: a.body ?? '',
      imageUrl: a.imageUrl ?? '',
      isFeatured: !!a.isFeatured,
    };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form = { title: '', summary: '', body: '', imageUrl: '', isFeatured: false };
  }

  publish(id: number): void {
    this.admin.publishAnnouncement(this.mid, id).subscribe({
      next: () => { this.load(); this.snack.open('Published.', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Publish failed.', 'OK', { duration: 3000 }),
    });
  }

  unpublish(id: number): void {
    this.admin.unpublishAnnouncement(this.mid, id).subscribe({
      next: () => { this.load(); this.snack.open('Unpublished.', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Unpublish failed.', 'OK', { duration: 3000 }),
    });
  }

  del(id: number): void {
    if (!confirm('Delete this announcement?')) return;
    this.admin.deleteAnnouncement(this.mid, id).subscribe({
      next: () => { this.load(); this.snack.open('Deleted.', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Delete failed.', 'OK', { duration: 3000 }),
    });
  }
}
