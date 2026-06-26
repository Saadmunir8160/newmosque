import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MosqueAdminService, MosqueAdminUser } from '../../../core/services/mosque-admin.service';
import { MosqueContextService } from '../../../core/services/mosque-context.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header badge="Mosque Admin" title="Users" subtitle="Manage members, teachers, and parents at your mosque" />

    <nav class="tabs">
      <a routerLink="/dashboard/admin/users/members" routerLinkActive="active" class="tab">Members</a>
      <a routerLink="/dashboard/admin/users/teachers" routerLinkActive="active" class="tab">Teachers</a>
      <a routerLink="/dashboard/admin/users/parents" routerLinkActive="active" class="tab">Parents</a>
    </nav>

    <div class="toolbar">
      <input class="input" placeholder="Search name or email…" [(ngModel)]="search" (ngModelChange)="load()">
      <label class="chk"><input type="checkbox" [(ngModel)]="activeOnly" (ngModelChange)="load()"> Active only</label>
    </div>

    <app-card class="block mb-4">
      <h3 class="form-title">Create {{ categoryLabel().slice(0, -1) }}</h3>
      <div class="grid md:grid-cols-2 gap-3">
        <input class="input" [(ngModel)]="form.fullName" placeholder="Full name">
        <input class="input" [(ngModel)]="form.email" placeholder="Email">
        <input class="input" [(ngModel)]="form.phone" placeholder="Phone">
        <input class="input" type="password" [(ngModel)]="form.password" placeholder="Temporary password">
      </div>
      <button class="btn mt-3" (click)="create()">Create user</button>
      <p *ngIf="msg()" class="msg">{{ msg() }}</p>
    </app-card>

    <app-card>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users()">
              <ng-container *ngIf="editingId() !== u.id; else editRow">
                <td>{{ u.fullName }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.phone || '—' }}</td>
                <td><span [class.off]="!u.isActive">{{ u.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="link" (click)="startEdit(u)">Edit</button>
                  <button class="link" (click)="toggleActive(u)">{{ u.isActive ? 'Deactivate' : 'Activate' }}</button>
                </td>
              </ng-container>
              <ng-template #editRow>
                <td><input class="input input-sm" [(ngModel)]="editForm.fullName"></td>
                <td><input class="input input-sm" [(ngModel)]="editForm.email"></td>
                <td><input class="input input-sm" [(ngModel)]="editForm.phone"></td>
                <td colspan="2" class="actions">
                  <button class="link" (click)="saveEdit(u.id)">Save</button>
                  <button class="link muted" (click)="editingId.set(null)">Cancel</button>
                </td>
              </ng-template>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!users().length" class="empty">No users in this category.</p>
      </div>
    </app-card>
  `,
  styles: [`
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tab { padding: 0.4rem 0.75rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600;
      color: #6ee7b7; text-decoration: none; border: 1px solid rgba(16,185,129,0.25); }
    .tab.active { background: #F8FAFC; color: #fff; border-color: #10b981; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
    .chk { color: #a7f3d0; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.35rem; }
    .form-title { margin: 0 0 0.75rem; font-size: 0.9375rem; font-weight: 600; color: #fff; }
    .input { background: #0F172A; border: 1px solid #F8FAFC; border-radius: 8px; padding: 10px; color: #fff; width: 100%; }
    .input-sm { padding: 6px 8px; font-size: 0.8125rem; }
    .btn { background: #f59e0b; color: #0F172A; font-weight: 700; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
    .msg { margin-top: 0.5rem; font-size: 0.8125rem; color: #6ee7b7; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .table th, .table td { padding: 0.625rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: #d1fae5; }
    .table th { color: #6ee7b7; font-size: 0.6875rem; text-transform: uppercase; }
    .actions { white-space: nowrap; }
    .off { color: #fbbf24; }
    .link { background: none; border: none; color: #fbbf24; cursor: pointer; font-weight: 600; margin-right: 0.5rem; }
    .muted { color: #6ee7b7; }
    .empty { margin: 0; color: #6ee7b7; font-size: 0.8125rem; }
  `]
})
export class AdminUsersComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private admin = inject(MosqueAdminService);
  private mosqueCtx = inject(MosqueContextService);

  users = signal<MosqueAdminUser[]>([]);
  msg = signal('');
  category = signal('members');
  editingId = signal<string | null>(null);
  editForm = { fullName: '', email: '', phone: '' };
  search = '';
  activeOnly = false;
  mosqueId = 1;

  form = { fullName: '', email: '', phone: '', password: 'ChangeMe@123' };

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path ?? 'members';
      this.category.set(last);
      this.load();
    });
  }

  categoryLabel(): string {
    switch (this.category()) {
      case 'teachers': return 'teachers';
      case 'parents': return 'parents';
      default: return 'members';
    }
  }

  roleForCategory(): string {
    switch (this.category()) {
      case 'teachers': return ROLES.Teacher;
      case 'parents': return ROLES.Parent;
      default: return ROLES.Member;
    }
  }

  load(): void {
    this.mosqueCtx.resolve().then(id => {
      this.mosqueId = id;
      this.admin.getUsers(id, this.category(), this.search, this.activeOnly || undefined)
        .subscribe(u => this.users.set(u));
    });
  }

  create(): void {
    this.admin.createUser(this.mosqueId, {
      ...this.form,
      role: this.roleForCategory(),
    }).subscribe({
      next: () => {
        this.msg.set('User created.');
        this.form = { fullName: '', email: '', phone: '', password: 'ChangeMe@123' };
        this.load();
      },
      error: () => this.msg.set('Could not create user.'),
    });
  }

  startEdit(u: MosqueAdminUser): void {
    this.editingId.set(u.id);
    this.editForm = { fullName: u.fullName, email: u.email, phone: u.phone ?? '' };
  }

  saveEdit(userId: string): void {
    this.admin.updateUser(this.mosqueId, userId, this.editForm).subscribe(() => {
      this.editingId.set(null);
      this.load();
    });
  }

  toggleActive(u: MosqueAdminUser): void {
    this.admin.setUserActive(this.mosqueId, u.id, !u.isActive).subscribe(() => this.load());
  }
}
