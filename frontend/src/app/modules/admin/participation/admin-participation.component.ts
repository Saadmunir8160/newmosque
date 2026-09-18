import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { MosqueService } from '../../../core/services/mosque.service';
import { MosqueAdminService, PendingParticipation } from '../../../core/services/mosque-admin.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ParticipationOpportunity } from '../../../core/models';

@Component({
  selector: 'app-admin-participation',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Participation" subtitle="Volunteer requests and event participation" />

    <app-card *ngIf="pending().length" class="block mb-4">
      <h3 class="section">Pending requests</h3>
      <div *ngFor="let p of pending()" class="pending-row">
        <div>
          <p class="title">{{ p.opportunityTitle }}</p>
          <p class="meta">{{ p.userName }} · {{ p.registeredAt | date:'short' }}</p>
        </div>
        <div class="actions">
          <button class="btn-ok" (click)="setStatus(p.id, 'approved')">Approve</button>
          <button class="btn-no" (click)="setStatus(p.id, 'rejected')">Reject</button>
        </div>
      </div>
    </app-card>

    <app-card>
      <h3 class="section">Create opportunity</h3>
      <input class="input mb-2" placeholder="Title" [(ngModel)]="form.title">
      <select class="input mb-2" [(ngModel)]="form.type">
        <option value="Volunteering">Volunteering</option>
        <option value="Class">Class</option>
        <option value="Project">Project</option>
        <option value="Event">Event</option>
      </select>
      <textarea class="input mb-2" rows="2" placeholder="Description" [(ngModel)]="form.description"></textarea>
      <button class="btn" (click)="create()">Post Opportunity</button>
    </app-card>

    <app-card *ngFor="let o of items()" class="block mt-3">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h4 class="text-white font-bold">
            {{ o.title }}
            <span *ngIf="!o.isActive" style="color: #ef4444; font-size: 0.75rem; margin-left: 0.5rem; font-weight: normal;">(Inactive)</span>
          </h4>
          <p class="text-mos-muted text-sm">{{ o.type }} · {{ o.description }}</p>
        </div>
        <div class="actions">
          <button class="btn-outline" (click)="toggleActive(o)">{{ o.isActive ? 'Deactivate' : 'Activate' }}</button>
          <button class="btn-no" (click)="deleteOpp(o.id)">Delete</button>
        </div>
      </div>
    </app-card>
  `,
  styles: [`
    .section { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 600; color: #fcd34d; }
    .pending-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .title { margin: 0; font-weight: 600; color: #fff; }
    .meta { margin: 0.125rem 0 0; font-size: 0.75rem; color: #6ee7b7; }
    .actions { display: flex; gap: 0.5rem; }
    .btn-ok { background: #10b981; color: #0F172A; font-weight: 700; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .btn-no { background: #ef4444; color: #fff; font-weight: 700; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .btn-outline { background: transparent; border: 1px solid #94a3b8; color: #f8fafc; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .input{background:#0F172A;border:1px solid #F8FAFC;border-radius:8px;padding:10px;color:#fff;width:100%}
    .btn{background:#f59e0b;color:#0F172A;font-weight:700;padding:8px 16px;border-radius:8px;border:none;cursor:pointer}
  `]
})
export class AdminParticipationComponent implements OnInit {
  private admin = inject(AdminService);
  private mosqueAdmin = inject(MosqueAdminService);
  private mosque = inject(MosqueService);
  private mosqueCtx = inject(MosqueContextService);
  items = signal<ParticipationOpportunity[]>([]);
  pending = signal<PendingParticipation[]>([]);
  form = { title: '', type: 'Volunteering', description: '' };
  mid = 1;

  ngOnInit(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mid = id;
      this.reload();
    });
  }

  reload(): void {
    this.mosque.getParticipation(this.mid, true).subscribe(o => this.items.set(o));
    this.mosqueAdmin.getPendingParticipation(this.mid).subscribe(p => this.pending.set(p));
  }

  create(): void {
    if (!this.form.title) return;
    this.admin.createParticipation(this.mid, { ...this.form, isActive: true }).subscribe(() => {
      this.form = { title: '', type: 'Volunteering', description: '' };
      this.reload();
    });
  }

  toggleActive(o: ParticipationOpportunity): void {
    this.admin.updateParticipation(this.mid, o.id, { ...o, isActive: !o.isActive }).subscribe(() => this.reload());
  }

  deleteOpp(id: number): void {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;
    this.admin.deleteParticipation(this.mid, id).subscribe(() => this.reload());
  }

  setStatus(id: number, status: string): void {
    this.mosqueAdmin.updateParticipationStatus(this.mid, id, status).subscribe(() => this.reload());
  }
}
