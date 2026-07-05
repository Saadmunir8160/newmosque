import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { Announcement } from '../../../core/models';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Announcements" subtitle="Create, publish and manage mosque announcements" />

    <div class="toolbar">
      <input class="input" placeholder="Search…" [(ngModel)]="search" (ngModelChange)="load()" />
      <select class="input w-auto" [(ngModel)]="statusFilter" (ngModelChange)="load()">
        <option value="">All statuses</option>
        <option value="Draft">Draft</option>
        <option value="Published">Published</option>
        <option value="Unpublished">Unpublished</option>
      </select>
    </div>

    <app-card>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <input class="input mb-2" placeholder="Summary" [(ngModel)]="form.summary">
      <textarea class="input mb-2" rows="3" placeholder="Body" [(ngModel)]="form.body"></textarea>
      <button class="btn" (click)="create()">Create Draft</button>
    </app-card>

    <div class="mt-4 space-y-3">
      <app-card *ngFor="let a of items()">
        <div *ngIf="editingId() !== a.id; else editTpl">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div class="min-w-0 flex-1">
              <h4 class="text-white font-bold">{{ a.title }} <span class="text-sm text-mos-muted">({{ a.status }})</span></h4>
              <p class="text-mos-muted text-sm">{{ a.summary }}</p>
            </div>
            <div class="flex flex-wrap gap-2 shrink-0">
              <button class="btn-sm" (click)="startEdit(a)">Edit</button>
              <button *ngIf="a.status !== 'Published'" class="btn-sm" (click)="publish(a.id)">Publish</button>
              <button class="btn-sm danger" (click)="del(a.id)">Delete</button>
            </div>
          </div>
        </div>
        <ng-template #editTpl>
          <input class="input mb-2" [(ngModel)]="editForm.title" />
          <input class="input mb-2" [(ngModel)]="editForm.summary" />
          <textarea class="input mb-2" rows="3" [(ngModel)]="editForm.body"></textarea>
          <div class="flex gap-2">
            <button class="btn-sm" (click)="saveEdit(a.id)">Save</button>
            <button class="btn-sm" (click)="editingId.set(null)">Cancel</button>
          </div>
        </ng-template>
      </app-card>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .w-auto { width: auto; min-width: 140px; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
    .btn-sm { background: #10b981; color: #0F172A; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: none; font-size: 11px; cursor: pointer; }
    .danger { background: #ef4444; color: #fff; }
  `]
})
export class AdminAnnouncementsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);
  items = signal<Announcement[]>([]);
  form = { title: '', summary: '', body: '' };
  editForm = { title: '', summary: '', body: '' };
  editingId = signal<number | null>(null);
  search = '';
  statusFilter = '';
  mid = 1;

  ngOnInit(): void { this.mosqueCtx.resolve().then(id => { this.mid = id; this.load(); }); }

  load(): void {
    this.mosque.getAnnouncements(this.mid, true, this.search, this.statusFilter || undefined)
      .subscribe(a => this.items.set(a));
  }

  create(): void {
    this.admin.createAnnouncement(this.mid, this.form).subscribe(() => {
      this.form = { title: '', summary: '', body: '' };
      this.load();
    });
  }

  startEdit(a: Announcement): void {
    this.editingId.set(a.id);
    this.editForm = { title: a.title, summary: a.summary ?? '', body: a.body ?? '' };
  }

  saveEdit(id: number): void {
    this.admin.updateAnnouncement(this.mid, id, this.editForm).subscribe(() => {
      this.editingId.set(null);
      this.load();
    });
  }

  publish(id: number): void { this.admin.publishAnnouncement(this.mid, id).subscribe(() => this.load()); }
  del(id: number): void { this.admin.deleteAnnouncement(this.mid, id).subscribe(() => this.load()); }
}
