import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';
import { Mosque, MosqueStaffMember } from '../../../core/models';

@Component({
  selector: 'app-owner-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Owner" title="Admin management" subtitle="Assign and manage mosque staff roles" />

    <div *ngIf="!isActive()" class="admin-empty">
      <p class="admin-empty-title">Available after verification</p>
      <p class="admin-empty-desc">Staff management unlocks once your mosque claim is verified (Active status).</p>
    </div>

    <ng-container *ngIf="isActive()">
      <app-card class="block mb-4">
        <p class="text-emerald-300 text-sm mb-4">Managing staff for <strong class="text-white">{{ mosqueName() }}</strong></p>
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
        <button class="btn" (click)="assign()">Assign role</button>
        <p *ngIf="msg()" class="text-emerald-300 text-sm mt-3">{{ msg() }}</p>
        <p class="text-emerald-500 text-sm mt-4">User must already be registered on the platform.</p>
      </app-card>

      <app-card>
        <h3 class="text-white font-bold mb-4">Current staff</h3>
        <div *ngIf="!staff().length" class="admin-empty">
          <p class="admin-empty-desc">No staff assigned yet. Appoint a Mosque Admin to help manage day-to-day operations.</p>
        </div>
        <div *ngFor="let s of staff()" class="staff-row">
          <div>
            <p class="text-white font-semibold">{{ s.fullName || s.userName }}</p>
            <p class="text-emerald-300 text-sm">{{ s.email }}</p>
            <p class="text-emerald-400 text-xs mt-1">{{ s.roles.join(', ') }}</p>
          </div>
          <div class="staff-actions">
            <button *ngFor="let r of s.roles" type="button" class="btn-remove" (click)="remove(s, r)">Remove {{ r }}</button>
          </div>
        </div>
      </app-card>
    </ng-container>
  `,
  styles: [`
    .input { background: #022c22; border: 1px solid #065f46; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .btn { background: #f59e0b; color: #022c22; font-weight: 700; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }
    .staff-row {
      display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem;
      padding: 1rem 0; border-bottom: 1px solid #065f46;
    }
    .staff-row:last-child { border-bottom: none; }
    .staff-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .btn-remove {
      background: transparent; border: 1px solid #065f46; color: #fca5a5; font-size: 0.75rem;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
    }
    .btn-remove:hover { border-color: #f87171; }
  `]
})
export class OwnerStaffComponent implements OnInit {
  private admin = inject(AdminService);
  email = '';
  role = ROLES.MosqueAdmin;
  msg = signal('');
  mosqueId = signal<number | null>(null);
  mosqueName = signal('');
  isActive = signal(false);
  staff = signal<MosqueStaffMember[]>([]);
  assignableRoles = [
    ROLES.MosqueAdmin, ROLES.PrayerTimesEditor, ROLES.Teacher,
    ROLES.ContentEditor, ROLES.Muqaddam, ROLES.Parent, ROLES.Member
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.admin.getOwnerMosque().subscribe(res => {
      const m = res.mosque;
      this.isActive.set(m?.status === 'Active');
      if (!m || m.status !== 'Active') return;
      this.mosqueId.set(m.id);
      this.mosqueName.set(m.name);
      this.loadStaff(m.id);
    });
  }

  loadStaff(mosqueId: number): void {
    this.admin.getMosqueStaff(mosqueId).subscribe(s => this.staff.set(s));
  }

  assign(): void {
    const id = this.mosqueId();
    if (!id || !this.email.trim()) return;
    this.admin.assignStaff(id, this.email.trim(), this.role).subscribe({
      next: (r: { message?: string }) => {
        this.msg.set(r.message || 'Role assigned.');
        this.email = '';
        this.loadStaff(id);
      },
      error: (e) => this.msg.set(e.error?.message || 'Failed — user may not exist.')
    });
  }

  remove(member: MosqueStaffMember, role: string): void {
    const id = this.mosqueId();
    if (!id) return;
    this.admin.removeStaff(id, member.id, role).subscribe({
      next: (r) => {
        this.msg.set(r.message);
        this.loadStaff(id);
      },
      error: (e) => this.msg.set(e.error?.message || 'Could not remove role.')
    });
  }
}
