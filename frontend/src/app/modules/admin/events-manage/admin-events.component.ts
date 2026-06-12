import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { MosqueEvent } from '../../../core/models';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Manage Events" />
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
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div class="min-w-0"><h4 class="text-white font-bold break-anywhere">{{ e.title }}</h4><p class="text-emerald-300 text-sm">{{ e.date }} · {{ e.eventType }}</p></div>
        <button class="btn-sm danger shrink-0 self-start sm:self-center" (click)="del(e.id)">Delete</button>
      </div>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}.btn-sm{background:#ef4444;color:#fff;padding:4px 10px;border-radius:6px;border:none;font-size:11px;cursor:pointer}`]
})
export class AdminEventsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  items = signal<MosqueEvent[]>([]);
  form = { title: '', date: '', startTime: '19:00', location: '', description: '', eventType: 'General' };
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.mosque.getEvents(this.mid).subscribe(e => this.items.set(e)); }

  create(): void {
    const data = { ...this.form, startTime: this.form.startTime + ':00', status: 'Scheduled' };
    this.admin.createEvent(this.mid, data).subscribe(() => this.mosque.getEvents(this.mid).subscribe(e => this.items.set(e)));
  }
  del(id: number): void { this.admin.deleteEvent(this.mid, id).subscribe(() => this.items.update(l => l.filter(e => e.id !== id))); }
}
