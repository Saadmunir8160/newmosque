import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';
import { MosqueStaffMember } from '../../../core/models';

@Component({
  selector: 'app-owner-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Owner" title="Admin management" subtitle="Assign and manage mosque staff roles" />

    <div *ngIf="!isActive()" class="mos-dash-panel mos-dash-panel--info">
      <p class="admin-empty-title">Available after verification</p>
      <p class="admin-empty-desc">Staff management unlocks once your mosque claim is verified (Active status).</p>
      <a routerLink="/dashboard/owner/verification" class="mos-dash-link">Go to verification →</a>
    </div>

    <ng-container *ngIf="isActive()">
      <app-card class="block mb-4">
        <p class="text-mos-muted text-sm mb-4">Managing staff for <strong class="text-mos-primary">{{ mosqueName() }}</strong></p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-label text-mos-muted">User email or username</label>
            <input class="input mt-1 mos-form-input" placeholder="e.g. teacher@mosqueos.uk" [(ngModel)]="email">
          </div>
          <div>
            <label class="text-label text-mos-muted">Role to assign</label>
            <select class="input mt-1 mos-form-input" [(ngModel)]="role">
              <option *ngFor="let r of assignableRoles" [value]="r">{{ r }}</option>
            </select>
          </div>
        </div>
        <button class="btn" (click)="assign()">Assign role</button>
        <p *ngIf="msg()" class="text-mos-muted text-sm mt-3">{{ msg() }}</p>
        <p class="text-mos-primary text-sm mt-4">User must already be registered on the platform.</p>
      </app-card>

      <app-card>
        <h3 class="text-mos-primary font-bold mb-4">Current staff</h3>
        <div *ngIf="!staff().length" class="mos-dash-empty">
          <p class="admin-empty-desc">No staff assigned yet. Appoint a Mosque Admin to help manage day-to-day operations.</p>
        </div>
        <div *ngFor="let s of staff()" class="staff-row">
          <div>
            <p class="font-semibold text-mos-primary">{{ s.fullName || s.userName }}</p>
            <p class="text-mos-muted text-sm">{{ s.email }}</p>
            <p class="text-mos-muted text-xs mt-1">{{ s.roles.join(', ') }}</p>
          </div>
          <div class="staff-actions">
            <button *ngFor="let r of s.roles" type="button" class="btn-remove" (click)="remove(s, r)">Remove {{ r }}</button>
          </div>
        </div>
      </app-card>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .staff-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--mos-border);
    }
    .staff-row:last-child { border-bottom: none; }
    .staff-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .btn-remove {
      background: var(--mos-surface);
      border: 1px solid var(--mos-border);
      color: var(--mos-danger);
      font-size: 0.75rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-remove:hover {
      border-color: var(--mos-danger);
      background: var(--mos-badge-rejected-bg);
    }
    .mos-dash-link {
      display: inline-block;
      margin-top: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--mos-primary);
      text-decoration: none;
    }
    .mos-dash-link:hover { text-decoration: underline; }
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
