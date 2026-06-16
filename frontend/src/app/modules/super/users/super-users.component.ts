import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { ROLES } from '../../../core/constants/roles';

@Component({
  selector: 'app-super-users',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header
      badge="Super Admin"
      title="Users & roles"
      subtitle="Manage platform accounts and assign permissions. Changes apply immediately." />

    <div class="users-layout">
      <aside class="users-sidebar">
        <div class="sidebar-card">
          <h3 class="sidebar-title">Overview</h3>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="overview-value">{{ users().length }}</span>
              <span class="overview-label">Users</span>
            </div>
            <div class="overview-item">
              <span class="overview-value">{{ roleTypes().length }}</span>
              <span class="overview-label">Roles</span>
            </div>
            <div class="overview-item overview-item--wide">
              <span class="overview-value">{{ filtered().length }}</span>
              <span class="overview-label">Showing</span>
            </div>
          </div>
        </div>

        <div class="sidebar-card" *ngIf="roleStats().length">
          <h3 class="sidebar-title">Role distribution</h3>
          <button type="button" class="role-filter-chip role-filter-chip--all"
            [class.role-filter-chip--active]="!roleFilter"
            (click)="setRoleFilter('')">All roles</button>
          <div class="role-dist-list">
            <button type="button" *ngFor="let row of roleStats()" class="role-dist-row"
              [class.role-dist-row--active]="roleFilter === row.role"
              (click)="setRoleFilter(row.role)">
              <span class="role-chip" [ngClass]="roleClass(row.role)">{{ row.role }}</span>
              <span class="role-dist-count">{{ row.count }}</span>
              <div class="role-bar"><div class="role-bar__fill" [style.width.%]="rolePct(row.count)"></div></div>
            </button>
          </div>
        </div>
      </aside>

      <main class="users-main">
        <div class="users-toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="list-search" type="search" placeholder="Search name, username or email…"
              [(ngModel)]="query" (ngModelChange)="onSearch()">
          </div>
          <button *ngIf="query || roleFilter" type="button" class="btn-clear-filters" (click)="clearFilters()">
            Clear filters
          </button>
        </div>

        <div *ngIf="loading()" class="users-loading">
          <span class="users-loading__dot"></span> Loading users…
        </div>

        <div *ngIf="!loading() && !filtered().length" class="users-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          <h3>{{ users().length ? 'No matches' : 'No users yet' }}</h3>
          <p>{{ users().length ? 'Try a different search or role filter.' : 'Users appear after register or seed.' }}</p>
        </div>

        <div *ngIf="!loading() && filtered().length" class="users-list">
          <article *ngFor="let u of filtered()" class="user-card">
            <div class="user-card__head">
              <div class="user-avatar" [ngClass]="primaryRoleClass(u)" aria-hidden="true">{{ initials(u) }}</div>
              <div class="user-identity">
                <div class="user-identity__top">
                  <h4 class="user-name">{{ u.fullName || u.userName }}</h4>
                  <time class="user-joined">{{ u.createdAt | date:'mediumDate' }}</time>
                </div>
                <p class="user-meta">
                  <span class="user-handle">&#64;{{ u.userName }}</span>
                  <span class="user-meta__dot">·</span>
                  <span class="user-email">{{ u.email || 'No email' }}</span>
                </p>
              </div>
            </div>

            <div class="user-card__roles">
              <span *ngFor="let r of u.roles" class="role-pill" [ngClass]="roleClass(r)">
                {{ r }}
                <button *ngIf="r !== 'Super Admin'" type="button" class="role-pill__remove"
                  (click)="removeRole(u.id, r)" title="Remove role">×</button>
              </span>
              <span *ngIf="!u.roles.length" class="no-roles">No roles assigned</span>
            </div>

            <div class="user-card__assign" *ngIf="availableRoles(u).length">
              <div class="role-picker" [class.role-picker--open]="openPickerId() === u.id">
                <button type="button" class="assign-trigger" (click)="togglePicker(u.id, $event)">
                  <span>{{ rolePick[u.id] || 'Add role…' }}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                <div class="role-picker__menu" *ngIf="openPickerId() === u.id" (click)="$event.stopPropagation()">
                  <button type="button" *ngFor="let r of availableRoles(u)" class="role-picker__option"
                    [class.role-picker__option--active]="rolePick[u.id] === r"
                    (click)="pickRole(u.id, r, $event)">
                    <span class="role-chip" [ngClass]="roleClass(r)">{{ r }}</span>
                  </button>
                </div>
              </div>
              <button type="button" class="btn-assign"
                (click)="assign(u.id)" [disabled]="!rolePick[u.id] || assigningId() === u.id">
                {{ assigningId() === u.id ? 'Assigning…' : 'Assign' }}
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .users-layout {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 960px) {
      .users-layout { grid-template-columns: 240px 1fr; align-items: start; }
    }

    .users-sidebar { display: flex; flex-direction: column; gap: 0.75rem; }
    .sidebar-card {
      padding: 0.875rem 1rem;
      background: linear-gradient(160deg, rgba(6,78,59,0.85) 0%, rgba(2,44,34,0.95) 100%);
      border: 1px solid rgba(212,175,55,0.18);
      border-radius: 0.75rem;
    }
    .sidebar-title {
      margin: 0 0 0.75rem; font-size: 0.6875rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em; color: rgba(212,175,55,0.85);
    }

    .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .overview-item {
      text-align: center; padding: 0.5rem;
      background: rgba(0,0,0,0.2); border-radius: 0.5rem;
      border: 1px solid rgba(16,185,129,0.12);
    }
    .overview-item--wide { grid-column: 1 / -1; }
    .overview-value { display: block; font-size: 1.25rem; font-weight: 800; color: #fff; line-height: 1; }
    .overview-label { display: block; margin-top: 0.2rem; font-size: 0.5625rem; color: rgba(167,243,208,0.65); text-transform: uppercase; }

    .role-filter-chip {
      display: block; width: 100%; text-align: left;
      font-size: 0.6875rem; font-weight: 600; color: rgba(167,243,208,0.8);
      background: rgba(0,0,0,0.2); border: 1px solid rgba(16,185,129,0.2);
      border-radius: 0.375rem; padding: 0.4rem 0.625rem; margin-bottom: 0.5rem; cursor: pointer;
    }
    .role-filter-chip--active, .role-dist-row--active {
      border-color: rgba(212,175,55,0.45) !important;
      background: rgba(212,175,55,0.1) !important;
    }

    .role-dist-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .role-dist-row {
      display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto;
      gap: 0.15rem 0.5rem; width: 100%; text-align: left;
      padding: 0.4rem 0.5rem; border-radius: 0.375rem;
      background: rgba(0,0,0,0.15); border: 1px solid transparent;
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
    }
    .role-dist-row:hover { background: rgba(212,175,55,0.06); }
    .role-dist-count { font-size: 0.75rem; font-weight: 700; color: #fff; align-self: center; }
    .role-bar { grid-column: 1 / -1; height: 3px; border-radius: 9999px; background: rgba(255,255,255,0.06); overflow: hidden; }
    .role-bar__fill { height: 100%; background: linear-gradient(90deg, #10b981, #D4AF37); border-radius: 9999px; }

    .role-chip, .role-pill {
      display: inline-flex; align-items: center; gap: 0.2rem;
      font-size: 0.625rem; font-weight: 700; letter-spacing: 0.02em;
      padding: 0.2rem 0.45rem; border-radius: 9999px; border: 1px solid;
    }
    .role--super { color: #fcd34d; background: rgba(212,175,55,0.12); border-color: rgba(212,175,55,0.4); }
    .role--owner { color: #fbbf24; background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); }
    .role--admin { color: #6ee7b7; background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); }
    .role--editor { color: #93c5fd; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.35); }
    .role--staff { color: #c4b5fd; background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.35); }
    .role--member { color: #a7f3d0; background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); }

    .users-toolbar {
      display: flex; flex-wrap: wrap; gap: 0.625rem; align-items: center; margin-bottom: 0.875rem;
    }
    .search-wrap { flex: 1; min-width: 12rem; position: relative; }
    .search-icon {
      position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
      color: rgba(212,175,55,0.6); pointer-events: none;
    }
    .list-search {
      width: 100%; box-sizing: border-box;
      background: rgba(2,44,34,0.9); border: 1px solid rgba(212,175,55,0.2);
      border-radius: 0.5rem; padding: 0.625rem 0.75rem 0.625rem 2.25rem;
      font-size: 0.8125rem; color: #f0fdf4; outline: none;
    }
    .list-search:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
    .btn-clear-filters {
      font-size: 0.75rem; font-weight: 600; color: #D4AF37;
      background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.3);
      border-radius: 0.375rem; padding: 0.5rem 0.75rem; cursor: pointer;
    }

    .users-loading {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; color: rgba(110,231,183,0.7); padding: 1rem 0;
    }
    .users-loading__dot {
      width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: #D4AF37; animation: pulse 1s ease infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    .users-empty {
      text-align: center; padding: 2.5rem 1rem;
      background: rgba(2,44,34,0.6); border: 1px dashed rgba(16,185,129,0.3);
      border-radius: 0.75rem; color: rgba(110,231,183,0.5);
    }
    .users-empty h3 { margin: 0.75rem 0 0.25rem; font-size: 1rem; color: #fff; }
    .users-empty p { margin: 0; font-size: 0.8125rem; color: rgba(167,243,208,0.7); }

    .users-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .user-card {
      padding: 0.875rem 1rem;
      background: linear-gradient(135deg, rgba(6,78,59,0.75) 0%, rgba(2,44,34,0.95) 100%);
      border: 1px solid rgba(16,185,129,0.18);
      border-radius: 0.625rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .user-card:hover {
      border-color: rgba(212,175,55,0.35);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .user-card__head {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.625rem;
    }
    .user-avatar {
      width: 2.5rem; height: 2.5rem; border-radius: 0.625rem;
      font-size: 0.8125rem; font-weight: 800; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; border: 1px solid;
    }
    .avatar--super { background: rgba(212,175,55,0.15); border-color: rgba(212,175,55,0.4); color: #D4AF37; }
    .avatar--owner { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
    .avatar--admin { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); color: #6ee7b7; }
    .avatar--default { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); color: #a7f3d0; }

    .user-identity { flex: 1; min-width: 0; }
    .user-identity__top {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 0.5rem; flex-wrap: wrap;
    }
    .user-name { margin: 0; font-size: 0.875rem; font-weight: 700; color: #fff; }
    .user-joined { font-size: 0.625rem; color: rgba(167,243,208,0.55); white-space: nowrap; }
    .user-meta {
      margin: 0.15rem 0 0; font-size: 0.6875rem; color: rgba(110,231,183,0.7);
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;
    }
    .user-handle { color: rgba(212,175,55,0.8); font-weight: 600; }
    .user-meta__dot { opacity: 0.4; }

    .user-card__roles {
      display: flex; flex-wrap: wrap; gap: 0.35rem;
      padding-bottom: 0.625rem;
      border-bottom: 1px solid rgba(212,175,55,0.08);
      margin-bottom: 0.625rem;
    }
    .role-pill { font-size: 0.6875rem; }
    .role-pill__remove {
      background: none; border: none; color: inherit; opacity: 0.65;
      cursor: pointer; font-size: 0.875rem; line-height: 1; padding: 0;
    }
    .role-pill__remove:hover { opacity: 1; color: #fca5a5; }
    .no-roles { font-size: 0.6875rem; color: rgba(110,231,183,0.45); font-style: italic; }

    .user-card__assign {
      display: flex; gap: 0.5rem; align-items: center;
    }

    .role-picker { position: relative; flex: 1; min-width: 0; }
    .assign-trigger {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      background: rgba(2,44,34,0.95); border: 1px solid rgba(212,175,55,0.3);
      border-radius: 0.375rem; padding: 0.45rem 0.625rem;
      font-size: 0.75rem; color: #ecfdf5; cursor: pointer; text-align: left;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .assign-trigger:hover { border-color: rgba(212,175,55,0.5); background: rgba(2,44,34,1); }
    .role-picker--open .assign-trigger {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.12);
    }
    .assign-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .assign-trigger svg { flex-shrink: 0; color: #D4AF37; }

    .role-picker__menu {
      position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 20;
      max-height: 14rem; overflow-y: auto;
      background: #022c22; border: 1px solid rgba(212,175,55,0.35);
      border-radius: 0.5rem; padding: 0.35rem;
      box-shadow: 0 12px 32px rgba(0,0,0,0.45);
    }
    .role-picker__option {
      display: block; width: 100%; text-align: left;
      background: transparent; border: none; border-radius: 0.375rem;
      padding: 0.45rem 0.5rem; cursor: pointer;
      transition: background 0.15s;
    }
    .role-picker__option:hover,
    .role-picker__option--active {
      background: rgba(212,175,55,0.14);
    }

    .btn-assign {
      flex-shrink: 0;
      font-size: 0.75rem; font-weight: 700; color: #022c22;
      background: linear-gradient(180deg, #fcd34d, #D4AF37);
      border: 1px solid rgba(212,175,55,0.5); border-radius: 0.375rem;
      padding: 0.45rem 1rem; cursor: pointer;
    }
    .btn-assign:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class SuperUsersComponent implements OnInit, OnDestroy {
  private platform = inject(PlatformService);

  users = signal<PlatformUser[]>([]);
  filtered = signal<PlatformUser[]>([]);
  loading = signal(true);
  assigningId = signal<string | null>(null);
  openPickerId = signal<string | null>(null);
  allRoles = Object.values(ROLES);
  rolePick: Record<string, string> = {};
  query = '';
  roleFilter = '';

  roleStats = computed(() => {
    const counts = new Map<string, number>();
    for (const u of this.users()) {
      for (const r of u.roles) {
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  });

  roleTypes = computed(() => this.roleStats().map(r => r.role));

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.openPickerId.set(null); }

  @HostListener('document:click')
  closePickerOnOutsideClick(): void {
    this.openPickerId.set(null);
  }

  togglePicker(userId: string, event?: Event): void {
    event?.stopPropagation();
    this.openPickerId.set(this.openPickerId() === userId ? null : userId);
  }

  pickRole(userId: string, role: string, event?: Event): void {
    event?.stopPropagation();
    this.rolePick[userId] = role;
    this.openPickerId.set(null);
  }

  load(): void {
    this.loading.set(true);
    this.platform.getUsers().subscribe({
      next: u => {
        this.users.set(u);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void { this.applyFilter(); }

  setRoleFilter(role: string): void {
    this.roleFilter = this.roleFilter === role ? '' : role;
    this.applyFilter();
  }

  clearFilters(): void {
    this.query = '';
    this.roleFilter = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const role = this.roleFilter;
    let list = this.users();
    if (q) {
      list = list.filter(u =>
        (u.fullName?.toLowerCase().includes(q)) ||
        u.userName.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q))
      );
    }
    if (role) {
      list = list.filter(u => u.roles.includes(role));
    }
    this.filtered.set(list);
  }

  initials(u: PlatformUser): string {
    const name = u.fullName || u.userName;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  primaryRoleClass(u: PlatformUser): string {
    if (u.roles.includes(ROLES.SuperAdmin)) return 'avatar--super';
    if (u.roles.includes(ROLES.MosqueOwner)) return 'avatar--owner';
    if (u.roles.includes(ROLES.MosqueAdmin)) return 'avatar--admin';
    return 'avatar--default';
  }

  roleClass(role: string): string {
    if (role === ROLES.SuperAdmin) return 'role--super';
    if (role === ROLES.MosqueOwner) return 'role--owner';
    if (role === ROLES.MosqueAdmin) return 'role--admin';
    if (role === ROLES.PrayerTimesEditor || role === ROLES.ContentEditor) return 'role--editor';
    if (role === ROLES.Teacher || role === ROLES.Muqaddam || role === ROLES.Parent) return 'role--staff';
    return 'role--member';
  }

  rolePct(count: number): number {
    const max = this.roleStats()[0]?.count ?? 1;
    return Math.max(8, (count / max) * 100);
  }

  availableRoles(u: PlatformUser): string[] {
    return this.allRoles.filter(r => !u.roles.includes(r));
  }

  assign(userId: string): void {
    const role = this.rolePick[userId];
    if (!role) return;
    this.assigningId.set(userId);
    this.platform.assignRole(userId, role).subscribe({
      next: () => {
        this.rolePick[userId] = '';
        this.assigningId.set(null);
        this.load();
      },
      error: () => this.assigningId.set(null),
    });
  }

  removeRole(userId: string, role: string): void {
    this.platform.removeRole(userId, role).subscribe(() => this.load());
  }
}
