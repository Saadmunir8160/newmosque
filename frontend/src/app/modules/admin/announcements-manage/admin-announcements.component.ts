import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { environment } from '../../../../environments/environment';
import { Announcement } from '../../../core/models';

@Component({
  selector: 'app-admin-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Manage Announcements" />
    <app-card>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <input class="input mb-2" placeholder="Summary" [(ngModel)]="form.summary">
      <textarea class="input mb-2" rows="3" placeholder="Body" [(ngModel)]="form.body"></textarea>
      <button class="btn" (click)="create()">Create Draft</button>
    </app-card>
    <div class="mt-4 space-y-3">
      <app-card *ngFor="let a of items()">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div class="min-w-0 flex-1">
            <h4 class="text-white font-bold break-anywhere">{{ a.title }} <span class="text-sm text-emerald-400">({{ a.status }})</span></h4>
            <p class="text-emerald-200 text-sm break-anywhere">{{ a.summary }}</p>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <button *ngIf="a.status !== 'Published'" class="btn-sm" (click)="publish(a.id)">Publish</button>
            <button class="btn-sm danger" (click)="del(a.id)">Delete</button>
          </div>
        </div>
      </app-card>
    </div>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}.btn-sm{background:#10b981;color:#022c22;font-weight:700;padding:4px 10px;border-radius:6px;border:none;font-size:11px;cursor:pointer}.danger{background:#ef4444;color:#fff}`]
})
export class AdminAnnouncementsComponent implements OnInit {
  private admin = inject(AdminService);
  private mosque = inject(MosqueService);
  items = signal<Announcement[]>([]);
  form = { title: '', summary: '', body: '' };
  mid = environment.defaultMosqueId;

  ngOnInit(): void { this.load(); }
  load(): void { this.mosque.getAnnouncements(this.mid, true).subscribe(a => this.items.set(a)); }

  create(): void {
    this.admin.createAnnouncement(this.mid, this.form).subscribe(() => { this.form = { title: '', summary: '', body: '' }; this.load(); });
  }
  publish(id: number): void { this.admin.publishAnnouncement(this.mid, id).subscribe(() => this.load()); }
  del(id: number): void { this.admin.deleteAnnouncement(this.mid, id).subscribe(() => this.load()); }
}
