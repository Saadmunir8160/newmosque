import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-owner-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Owner" title="Appoint Staff" subtitle="Assign mosque admins, teachers, editors and more" />

    <app-card>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-label text-emerald-300">User email or username</label>
          <input class="input mt-1" placeholder="e.g. teacher@mosqueos.uk" [(ngModel)]="email">
        </div>
        <div>
          <label class="text-label text-emerald-300">Role to assign</label>
          <select class="input mt-1" [(ngModel)]="role">
            <option *ngFor="let r of assignableRoles" [value]="r">{{ r }}</option>
          </select>
        </div>
      </div>
      <button class="btn" (click)="assign()">Assign Role</button>
      <p *ngIf="msg()" class="text-emerald-300 text-sm mt-3">{{ msg() }}</p>
      <p class="text-emerald-500 text-sm mt-4">User must already be registered on the platform.</p>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:10px;color:#fff;width:100%}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:10px 20px;border-radius:8px;border:none;cursor:pointer}`]
})
export class OwnerStaffComponent {
  private admin = inject(AdminService);
  email = '';
  role = ROLES.MosqueAdmin;
  msg = signal('');
  assignableRoles = [
    ROLES.MosqueAdmin, ROLES.PrayerTimesEditor, ROLES.Teacher,
    ROLES.ContentEditor, ROLES.Muqaddam, ROLES.Parent, ROLES.Member
  ];

  assign(): void {
    if (!this.email.trim()) return;
    this.admin.assignStaff(environment.defaultMosqueId, this.email.trim(), this.role).subscribe({
      next: (r: { message?: string }) => { this.msg.set(r.message || 'Role assigned.'); this.email = ''; },
      error: (e) => this.msg.set(e.error?.message || 'Failed — user may not exist.')
    });
  }
}
