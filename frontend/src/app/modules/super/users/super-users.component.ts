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
    <app-page-header badge="Super Admin" title="User Management" subtitle="Assign roles to platform users" />

    <app-card *ngFor="let u of users()" class="block mb-4">
      <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h4 class="text-white font-bold">{{ u.fullName || u.userName }}</h4>
          <p class="text-emerald-300 text-sm">{{ u.userName }} · {{ u.email }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span *ngFor="let r of u.roles" class="text-sm bg-emerald-900 text-emerald-200 px-2 py-1 rounded">
              {{ r }}
              <button *ngIf="r !== 'Super Admin'" class="ml-1 text-red-400" (click)="removeRole(u.id, r)">×</button>
            </span>
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <select class="input" [(ngModel)]="rolePick[u.id]">
            <option value="">Add role...</option>
            <option *ngFor="let r of allRoles" [value]="r">{{ r }}</option>
          </select>
          <button class="btn" (click)="assign(u.id)">Assign</button>
        </div>
      </div>
    </app-card>
  `,
  styles: [`.input{background:#022c22;border:1px solid #065f46;border-radius:8px;padding:8px;color:#fff}.btn{background:#f59e0b;color:#022c22;font-weight:700;padding:8px 14px;border-radius:8px;border:none;cursor:pointer}`]
})
export class SuperUsersComponent implements OnInit {
  private platform = inject(PlatformService);
  users = signal<PlatformUser[]>([]);
  allRoles = Object.values(ROLES);
  rolePick: Record<string, string> = {};

  ngOnInit(): void { this.load(); }
  load(): void { this.platform.getUsers().subscribe(u => this.users.set(u)); }

  assign(userId: string): void {
    const role = this.rolePick[userId];
    if (!role) return;
    this.platform.assignRole(userId, role).subscribe(() => { this.rolePick[userId] = ''; this.load(); });
  }

  removeRole(userId: string, role: string): void {
    this.platform.removeRole(userId, role).subscribe(() => this.load());
  }
}
