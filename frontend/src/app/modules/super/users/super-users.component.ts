import { Component, OnInit, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformService, PlatformUser } from '../../../core/services/platform.service';
import { ROLES, primaryRole } from '../../../core/constants/roles';
import { Mosque } from '../../../core/models';

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';
type SortKey = 'newest' | 'oldest' | 'name' | 'lastLogin';
type MainTab = 'users' | 'roles';

interface RoleNavItem {
  key: string;
  label: string;
  icon: string;
  roles: string[];
}

interface PermissionGroup {
  id: string;
  label: string;
  permissions: string[];
}

interface RoleDefinition {
  role: string;
  description: string;
  icon: string;
  permissionKeys: string[];
}

const ROLE_NAV: RoleNavItem[] = [
  { key: '', label: 'All Users', icon: '👥', roles: [] },
  { key: 'super', label: 'Super Admin', icon: '👑', roles: [ROLES.SuperAdmin] },
  { key: 'mosque-admin', label: 'Mosque Admin', icon: '🛡️', roles: [ROLES.MosqueAdmin, ROLES.MosqueOwner] },
  { key: 'imam', label: 'Imam', icon: '📿', roles: [ROLES.Muqaddam] },
  { key: 'teacher', label: 'Teacher', icon: '📚', roles: [ROLES.Teacher] },
  { key: 'volunteer', label: 'Volunteer', icon: '🤝', roles: [ROLES.Parent, ROLES.ContentEditor] },
  { key: 'member', label: 'Member', icon: '🤲', roles: [ROLES.Member] },
];

const PERMISSION_GROUPS: PermissionGroup[] = [
  { id: 'users', label: 'Users Management', permissions: ['Create User', 'Edit User', 'Delete User', 'Assign Roles', 'View Audit Log'] },
  { id: 'mosques', label: 'Mosque Management', permissions: ['Create Mosque', 'Edit Mosque', 'Approve Mosque', 'Assign Admin', 'Manage Claims'] },
  { id: 'content', label: 'Content Management', permissions: ['Manage Duas', 'Manage Adhkar', 'Manage Events', 'Publish Content', 'Review Content'] },
  { id: 'worship', label: 'Worship & Education', permissions: ['Edit Prayer Times', 'Manage Classes', 'Reading Campaigns', 'Janaza Notices'] },
  { id: 'platform', label: 'Platform', permissions: ['Platform Settings', 'View Analytics', 'Manage Navigation', 'System Configuration'] },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions);

const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: ROLES.SuperAdmin, description: 'Full platform access across all mosques', icon: '👑', permissionKeys: [...ALL_PERMISSION_KEYS] },
  { role: ROLES.MosqueOwner, description: 'Owns mosque listing and delegates admins', icon: '🕌', permissionKeys: ['Edit Mosque', 'Assign Admin', 'Manage Claims', 'Manage Duas', 'Manage Adhkar', 'Manage Events', 'Publish Content', 'Edit Prayer Times', 'Manage Classes', 'Janaza Notices'] },
  { role: ROLES.MosqueAdmin, description: 'Day-to-day mosque administration', icon: '🛡️', permissionKeys: ['Edit Mosque', 'Manage Duas', 'Manage Adhkar', 'Manage Events', 'Publish Content', 'Edit Prayer Times', 'Manage Classes', 'Reading Campaigns', 'Janaza Notices'] },
  { role: ROLES.Muqaddam, description: 'Imam / spiritual guide — community readings', icon: '📿', permissionKeys: ['Reading Campaigns'] },
  { role: ROLES.Teacher, description: 'Madrassah classes and attendance', icon: '📚', permissionKeys: ['Manage Classes'] },
  { role: ROLES.ContentEditor, description: 'Volunteer content publishing', icon: '🤝', permissionKeys: ['Manage Duas', 'Manage Adhkar', 'Manage Events', 'Publish Content', 'Review Content'] },
  { role: ROLES.Parent, description: 'Parent / volunteer portal', icon: '🤝', permissionKeys: [] },
  { role: ROLES.Member, description: 'Standard member worship experience', icon: '🤲', permissionKeys: [] },
];

const PAGE_SIZES = [10, 25, 50];

@Component({
  selector: 'app-super-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-users.component.html',
  styleUrl: './super-users.component.css',
})
export class SuperUsersComponent implements OnInit {
  private platform = inject(PlatformService);
  private admin = inject(AdminService);
  private route = inject(ActivatedRoute);

  readonly ROLES = ROLES;
  readonly PERMISSION_GROUPS = PERMISSION_GROUPS;
  readonly ROLE_NAV = ROLE_NAV;
  readonly PAGE_SIZES = PAGE_SIZES;
  readonly allRoles = Object.values(ROLES);

  users = signal<PlatformUser[]>([]);
  mosques = signal<Mosque[]>([]);
  filtered = signal<PlatformUser[]>([]);
  loading = signal(true);
  loadError = signal('');
  toast = signal('');
  toastOk = signal(true);
  assigningId = signal<string | null>(null);
  actionBusy = signal<string | null>(null);
  mainTab = signal<MainTab>('users');
  editingUser = signal<PlatformUser | null>(null);
  permissionsTarget = signal<{ type: 'user' | 'role'; user?: PlatformUser; role?: string } | null>(null);
  openMenuId = signal<string | null>(null);
  showBulkPanel = signal(false);
  bulkRole = '';
  bulkMosqueId: number | null = null;

  roleDefinitions = signal<RoleDefinition[]>(ROLE_DEFINITIONS);
  rolePick: Record<string, string> = {};
  query = '';
  roleNavKey = '';
  statusFilter: StatusFilter = 'all';
  mosqueFilter: number | null = null;
  sortKey: SortKey = 'newest';
  page = signal(1);
  pageSize = signal(10);
  selected = signal<Set<string>>(new Set());

  roleNavCounts = computed(() =>
    ROLE_NAV.map(nav => ({
      ...nav,
      count: nav.roles.length
        ? this.users().filter(u => nav.roles.some(r => u.roles.includes(r))).length
        : this.users().length,
    }))
  );

  activeUsersCount = computed(() => this.users().filter(u => u.isActive !== false && u.roles.length > 0).length);
  pendingInvitesCount = computed(() => this.users().filter(u => !u.roles.length).length);
  rolesCount = computed(() => ROLE_DEFINITIONS.length);
  deactivatedCount = computed(() => this.users().filter(u => u.isActive === false).length);

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  paginatedUsers = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  allPageSelected = computed(() => {
    const page = this.paginatedUsers();
    return page.length > 0 && page.every(u => this.selected().has(u.id));
  });
  selectedCount = computed(() => this.selected().size);

  permissionsTitle = computed(() => {
    const t = this.permissionsTarget();
    if (!t) return '';
    if (t.type === 'role') return t.role ?? 'Role permissions';
    return `Permissions — ${t.user?.fullName || t.user?.userName}`;
  });

  permissionsSubtitle = computed(() => {
    const t = this.permissionsTarget();
    if (!t) return '';
    if (t.type === 'role') return ROLE_DEFINITIONS.find(d => d.role === t.role)?.description ?? '';
    const roles = t.user?.roles ?? [];
    return roles.length ? `Effective access from: ${roles.join(', ')}` : 'No roles assigned yet';
  });

  private activePermissionSet = computed(() => {
    const t = this.permissionsTarget();
    if (!t) return new Set<string>();
    if (t.type === 'role' && t.role) {
      const def = ROLE_DEFINITIONS.find(d => d.role === t.role);
      return new Set(def?.permissionKeys ?? []);
    }
    if (t.type === 'user' && t.user) {
      const keys = new Set<string>();
      for (const role of t.user.roles) {
        ROLE_DEFINITIONS.find(d => d.role === role)?.permissionKeys.forEach(k => keys.add(k));
      }
      return keys;
    }
    return new Set<string>();
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(p => {
      if (p.get('tab') === 'roles') this.mainTab.set('roles');
    });
    this.admin.getAllMosques().subscribe(m => this.mosques.set(m));
    this.load();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeEditUser();
    this.closePermissions();
    this.openMenuId.set(null);
    this.showBulkPanel.set(false);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.openMenuId.set(null);
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.platform.getUsers().subscribe({
      next: u => {
        this.users.set(u.map(x => ({ ...x, isActive: x.isActive ?? true })));
        this.applyFilter();
        this.loading.set(false);
        const editing = this.editingUser();
        if (editing) {
          const fresh = u.find(x => x.id === editing.id);
          if (fresh) this.editingUser.set({ ...fresh, isActive: fresh.isActive ?? true });
        }
      },
      error: () => {
        this.loadError.set('Could not load users. Check that the API is running.');
        this.loading.set(false);
      },
    });
  }

  applyFilter(): void {
    const q = this.query.trim().toLowerCase();
    const nav = ROLE_NAV.find(n => n.key === this.roleNavKey);
    let list = [...this.users()];

    if (q) {
      list = list.filter(u =>
        u.fullName?.toLowerCase().includes(q) ||
        u.userName.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q))
      );
    }
    if (nav?.roles.length) {
      list = list.filter(u => nav.roles.some(r => u.roles.includes(r)));
    }
    if (this.statusFilter === 'active') list = list.filter(u => u.isActive !== false && u.roles.length > 0);
    if (this.statusFilter === 'inactive') list = list.filter(u => u.isActive === false);
    if (this.statusFilter === 'pending') list = list.filter(u => !u.roles.length);
    if (this.mosqueFilter != null) {
      list = list.filter(u => u.homeMosqueId === this.mosqueFilter);
    }

    list.sort((a, b) => {
      switch (this.sortKey) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name': return (a.fullName || a.userName).localeCompare(b.fullName || b.userName);
        case 'lastLogin': {
          const al = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bl = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bl - al;
        }
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    this.filtered.set(list);
    if (this.page() > Math.max(1, Math.ceil(list.length / this.pageSize()))) {
      this.page.set(1);
    }
  }

  onSearch(): void { this.page.set(1); this.applyFilter(); }
  setRoleNav(key: string): void { this.roleNavKey = key; this.page.set(1); this.applyFilter(); }
  clearFilters(): void {
    this.query = '';
    this.roleNavKey = '';
    this.statusFilter = 'all';
    this.mosqueFilter = null;
    this.sortKey = 'newest';
    this.page.set(1);
    this.applyFilter();
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  toggleSelect(id: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(id); else next.delete(id);
    this.selected.set(next);
  }

  toggleSelectAll(checked: boolean): void {
    const next = new Set(this.selected());
    for (const u of this.paginatedUsers()) {
      if (checked) next.add(u.id); else next.delete(u.id);
    }
    this.selected.set(next);
  }

  clearSelection(): void { this.selected.set(new Set()); this.showBulkPanel.set(false); }

  runBulk(action: 'assignRole' | 'changeMosque' | 'activate' | 'deactivate' | 'delete'): void {
    const ids = [...this.selected()];
    if (!ids.length) return;

    if (action === 'assignRole' && !this.bulkRole) {
      this.showToast('Select a role for bulk assignment.', false);
      return;
    }
    if (action === 'delete' && !confirm(`Delete ${ids.length} user(s)? This cannot be undone.`)) return;
    if (action === 'deactivate' && !confirm(`Deactivate ${ids.length} user(s)?`)) return;

    this.actionBusy.set('bulk');
    this.platform.bulkUserAction({
      userIds: ids,
      action,
      role: this.bulkRole || undefined,
      mosqueId: this.bulkMosqueId,
    }).subscribe({
      next: res => {
        this.showToast(res.errors?.length ? `${res.message} ${res.errors.length} error(s).` : res.message, !res.errors?.length);
        this.clearSelection();
        this.bulkRole = '';
        this.actionBusy.set(null);
        this.load();
      },
      error: err => {
        this.showToast(err?.error?.message || 'Bulk action failed.', false);
        this.actionBusy.set(null);
      },
    });
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  initials(u: PlatformUser): string {
    const name = u.fullName || u.userName;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  primaryRoleLabel(u: PlatformUser): string {
    return primaryRole(u.roles) ?? (u.roles[0] || 'Unassigned');
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

  userStatus(u: PlatformUser): { label: string; cls: string } {
    if (u.isActive === false) return { label: 'Inactive', cls: 'status-badge--inactive' };
    if (!u.roles.length) return { label: 'Pending', cls: 'status-badge--pending' };
    return { label: 'Active', cls: 'status-badge--active' };
  }

  availableRoles(u: PlatformUser): string[] {
    return this.allRoles.filter(r => !u.roles.includes(r));
  }

  openEditUser(u: PlatformUser): void { this.editingUser.set(u); this.openMenuId.set(null); }
  closeEditUser(): void { this.editingUser.set(null); }

  openUserPermissions(u: PlatformUser): void {
    this.permissionsTarget.set({ type: 'user', user: u });
    this.openMenuId.set(null);
  }

  openRolePermissions(role: string): void {
    this.permissionsTarget.set({ type: 'role', role });
  }

  closePermissions(): void { this.permissionsTarget.set(null); }

  hasPermission(permission: string): boolean {
    return this.activePermissionSet().has(permission);
  }

  grantedInGroup(group: PermissionGroup): string[] {
    return group.permissions.filter(p => this.hasPermission(p));
  }

  roleUserCount(role: string): number {
    return this.users().filter(u => u.roles.includes(role)).length;
  }

  assign(userId: string): void {
    const role = this.rolePick[userId];
    if (!role) return;
    this.assigningId.set(userId);
    this.platform.assignRole(userId, role).subscribe({
      next: () => {
        this.rolePick[userId] = '';
        this.assigningId.set(null);
        this.showToast('Role assigned.', true);
        this.load();
      },
      error: err => {
        this.assigningId.set(null);
        this.showToast(err?.error?.message || 'Failed to assign role.', false);
      },
    });
  }

  removeRole(userId: string, role: string): void {
    this.platform.removeRole(userId, role).subscribe({
      next: () => { this.showToast('Role removed.', true); this.load(); },
      error: err => this.showToast(err?.error?.message || 'Failed to remove role.', false),
    });
  }

  toggleActive(u: PlatformUser): void {
    const next = u.isActive === false;
    this.actionBusy.set(u.id);
    this.platform.setUserActive(u.id, next).subscribe({
      next: () => {
        this.showToast(next ? 'User activated.' : 'User deactivated.', true);
        this.actionBusy.set(null);
        this.load();
      },
      error: err => {
        this.showToast(err?.error?.message || 'Status update failed.', false);
        this.actionBusy.set(null);
      },
    });
  }

  resetPassword(u: PlatformUser): void {
    if (!confirm(`Reset password for ${u.fullName || u.userName}?`)) return;
    this.actionBusy.set(u.id);
    this.openMenuId.set(null);
    this.platform.resetUserPassword(u.id).subscribe({
      next: res => {
        this.showToast(`Temporary password: ${res.temporaryPassword}`, true);
        this.actionBusy.set(null);
      },
      error: err => {
        this.showToast(err?.error?.message || 'Password reset failed.', false);
        this.actionBusy.set(null);
      },
    });
  }

  deleteUser(u: PlatformUser): void {
    if (!confirm(`Permanently delete ${u.fullName || u.userName}?`)) return;
    this.actionBusy.set(u.id);
    this.openMenuId.set(null);
    this.platform.deleteUser(u.id).subscribe({
      next: () => {
        this.showToast('User deleted.', true);
        this.actionBusy.set(null);
        this.load();
      },
      error: err => {
        this.showToast(err?.error?.message || 'Delete failed.', false);
        this.actionBusy.set(null);
      },
    });
  }

  showToast(msg: string, ok: boolean): void {
    this.toast.set(msg);
    this.toastOk.set(ok);
    setTimeout(() => this.toast.set(''), 6000);
  }

  formatLastLogin(u: PlatformUser): string {
    return u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—';
  }
}
