import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { MosqueEvent } from '../../../core/models';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Events" subtitle="Schedule and manage mosque events" />

    <div class="toolbar">
      <input class="input" placeholder="Search events…" [(ngModel)]="search" (ngModelChange)="load()" />
      <select class="input w-auto" [(ngModel)]="typeFilter" (ngModelChange)="load()">
        <option value="">All types</option>
        <option value="General">General</option>
        <option value="Mawlid">Mawlid</option>
        <option value="Dhikr">Dhikr</option>
        <option value="Class">Class</option>
      </select>
      <label class="chk"><input type="checkbox" [(ngModel)]="upcomingOnly" (ngModelChange)="load()" /> Upcoming only</label>
    </div>

    <app-card>
      <div class="grid md:grid-cols-2 gap-2">
        <input class="input" placeholder="Title" [(ngModel)]="form.title">
        <input class="input" type="date" [(ngModel)]="form.date">
        <input class="input" type="time" [(ngModel)]="form.startTime">
        <input class="input" placeholder="Location" [(ngModel)]="form.location">
        <select class="input" [(ngModel)]="form.eventType">
          <option value="General">General</option><option value="Mawlid">Mawlid</option>
          <option value="Dhikr">Dhikr</option><option value="Class">Class</option>
        </select>
        <textarea class="input md:col-span-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      </div>
      <button class="btn mt-3" (click)="create()">Create Event</button>
    </app-card>

    <app-card *ngFor="let e of items()" class="block mt-3">
      <div *ngIf="editingId() !== e.id; else editTpl">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div class="min-w-0">
            <h4 class="text-white font-bold">{{ e.title }}</h4>
            <p class="text-mos-muted text-sm">{{ e.date }} · {{ e.eventType }} · {{ e.status }}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-sm edit" (click)="startEdit(e)">Edit</button>
            <button class="btn-sm danger" (click)="del(e.id)">Delete</button>
          </div>
        </div>
      </div>
      <ng-template #editTpl>
        <div class="grid md:grid-cols-2 gap-2">
          <input class="input" [(ngModel)]="editForm.title" />
          <input class="input" type="date" [(ngModel)]="editForm.date" />
          <input class="input" type="time" [(ngModel)]="editForm.startTime" />
          <input class="input" [(ngModel)]="editForm.location" />
        </div>
        <div class="flex gap-2 mt-2">
          <button class="btn-sm edit" (click)="saveEdit(e.id)">Save</button>
          <button class="btn-sm" (click)="editingId.set(null)">Cancel</button>
        </div>
      </ng-template>
    </app-card>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
    .chk { color: #a7f3d0; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.35rem; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .w-auto { width: auto; min-width: 120px; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
    .btn-sm { padding: 4px 10px; border-radius: 6px; border: none; font-size: 11px; cursor: pointer; font-weight: 700; }
    .edit { background: #10b981; color: #0F172A; }
    .danger { background: #ef4444; color: #fff; }
  `]
})
export class AdminEventsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);
  items = signal<MosqueEvent[]>([]);
  form = { title: '', date: '', startTime: '19:00', location: '', description: '', eventType: 'General' };
  editForm = { title: '', date: '', startTime: '19:00', location: '', description: '', eventType: 'General', status: 'Scheduled' };
  editingId = signal<number | null>(null);
  search = '';
  typeFilter = '';
  upcomingOnly = false;
  mid = 1;

  ngOnInit(): void { this.mosqueCtx.resolve().then(id => { this.mid = id; this.load(); }); }

  load(): void {
    this.mosque.getEvents(this.mid, this.search, this.typeFilter || undefined, this.upcomingOnly)
      .subscribe(e => this.items.set(e));
  }

  create(): void {
    const data = { ...this.form, startTime: this.form.startTime + ':00', status: 'Scheduled' };
    this.admin.createEvent(this.mid, data).subscribe(() => this.load());
  }

  startEdit(e: MosqueEvent): void {
    this.editingId.set(e.id);
    this.editForm = {
      title: e.title, date: e.date, startTime: e.startTime.slice(0, 5),
      location: e.location ?? '', description: e.description ?? '',
      eventType: e.eventType, status: e.status ?? 'Scheduled',
    };
  }

  saveEdit(id: number): void {
    this.admin.updateEvent(this.mid, id, {
      ...this.editForm,
      startTime: this.editForm.startTime.length === 5 ? this.editForm.startTime + ':00' : this.editForm.startTime,
    }).subscribe(() => { this.editingId.set(null); this.load(); });
  }

  del(id: number): void { this.admin.deleteEvent(this.mid, id).subscribe(() => this.load()); }
}
