import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { ROLES } from '../../../core/constants/roles';

@Component({
  selector: 'app-super-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, CardComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Users & roles"
      subtitle="Manage platform accounts and assign permissions. Changes apply immediately." />

    <div class="admin-toolbar">
      <input class="admin-search" type="search" placeholder="Search name, username or email…"
        [(ngModel)]="query" (ngModelChange)="onSearch()">
      <span class="admin-meta">{{ filtered().length }} of {{ users().length }} users</span>
    </div>

    <div *ngIf="!filtered().length" class="admin-empty">
      <p class="admin-empty-title">{{ users().length ? 'No matches' : 'No users yet' }}</p>
      <p class="admin-empty-desc">
        {{ users().length ? 'Try a different search term.' : 'Users appear here after they register or are seeded.' }}
      </p>
    </div>

    <app-card *ngFor="let u of filtered()" class="block mb-3" [interactive]="true">
      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div class="min-w-0">
          <h4 class="text-white font-semibold text-base m-0">{{ u.fullName || u.userName }}</h4>
          <p class="admin-meta mt-1">{{ u.userName }} · {{ u.email || 'No email' }}</p>
          <p class="text-xs text-emerald-600 mt-1">Joined {{ u.createdAt | date:'mediumDate' }}</p>
          <div class="flex flex-wrap gap-2 mt-3">
            <span *ngFor="let r of u.roles" class="admin-role-pill">
              {{ r }}
              <button *ngIf="r !== 'Super Admin'" type="button" class="text-red-400 hover:text-red-300 ml-0.5"
                (click)="removeRole(u.id, r)" title="Remove role">×</button>
            </span>
            <span *ngIf="!u.roles.length" class="text-xs text-emerald-600 italic">No roles assigned</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 items-center shrink-0">
          <select class="admin-input max-w-[11rem]" [(ngModel)]="rolePick[u.id]">
            <option value="">Add role…</option>
            <option *ngFor="let r of allRoles" [value]="r">{{ r }}</option>
          </select>
          <button type="button" class="admin-btn" (click)="assign(u.id)">Assign</button>
        </div>
      </div>
    </app-card>
  `
})
export class SuperUsersComponent implements OnInit {
  private platform = inject(PlatformService);
  users = signal<PlatformUser[]>([]);
  filtered = signal<PlatformUser[]>([]);
  allRoles = Object.values(ROLES);
  rolePick: Record<string, string> = {};
  query = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.platform.getUsers().subscribe(u => {
      this.users.set(u);
      this.applyFilter();
    });
  }

  onSearch(): void { this.applyFilter(); }

  private applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const list = this.users();
    if (!q) {
      this.filtered.set(list);
      return;
    }
    this.filtered.set(list.filter(u =>
      (u.fullName?.toLowerCase().includes(q)) ||
      u.userName.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q))
    ));
  }

  assign(userId: string): void {
    const role = this.rolePick[userId];
    if (!role) return;
    this.platform.assignRole(userId, role).subscribe(() => {
      this.rolePick[userId] = '';
      this.load();
    });
  }

  removeRole(userId: string, role: string): void {
    this.platform.removeRole(userId, role).subscribe(() => this.load());
  }
}
