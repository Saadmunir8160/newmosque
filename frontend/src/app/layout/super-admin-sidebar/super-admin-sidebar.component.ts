import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PlatformDashboard, PlatformService } from '../../core/services/platform.service';
import { AdminRegistrationItem, RegistrationService } from '../../core/services/registration.service';
import {
  SUPER_ADMIN_NAV_SECTIONS,
  SUPER_ADMIN_TOP_ITEMS,
  SuperNavItem,
  SuperNavSection,
  superAdminSearchableItems,
} from '../../core/config/super-admin-nav.config';

const COLLAPSE_KEY = 'mos_super_sidebar_collapsed';
const SECTIONS_KEY = 'mos_super_nav_sections';

@Component({
  selector: 'app-super-admin-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './super-admin-sidebar.component.html',
  styleUrls: ['./super-admin-sidebar.component.css'],
})
export class SuperAdminSidebarComponent implements OnInit, OnDestroy {
  /** Mobile drawer mode — controlled by shell */
  @Input() mobile = false;
  @Input() open = true;
  @Output() closed = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly topItems = SUPER_ADMIN_TOP_ITEMS;
  readonly sections: SuperNavSection[] = SUPER_ADMIN_NAV_SECTIONS;
  readonly searchable = superAdminSearchableItems();

  collapsed = signal(this.readCollapsed());
  sectionOpen = signal<Record<string, boolean>>(this.readSections());
  searchQuery = signal('');
  pendingClaims = signal(0);
  pendingRegistrations = signal(0);
  /** Current URL path — drives single-item active highlight */
  currentUrl = signal('');
  private refreshTimer?: ReturnType<typeof setInterval>;
  private navSub?: Subscription;

  searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [] as SuperNavItem[];
    return this.searchable.filter(i =>
      i.label.toLowerCase().includes(q) || i.section.toLowerCase().includes(q)
    ).slice(0, 8);
  });

  constructor(
    private authService: AuthService,
    private platformService: PlatformService,
    private registrationService: RegistrationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.syncUrl(this.router.url);
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.syncUrl(e.urlAfterRedirects));
    this.loadBadges();
    this.refreshTimer = setInterval(() => this.loadBadges(), 60_000);
    this.collapsedChange.emit(this.collapsed());
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.navSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobile && this.open) this.closed.emit();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      this.collapsedChange.emit(next);
      return next;
    });
  }

  isSectionOpen(id: string): boolean {
    const stored = this.sectionOpen()[id];
    if (stored !== undefined) return stored;
    return this.sections.find(s => s.id === id)?.defaultOpen ?? false;
  }

  toggleSection(id: string): void {
    this.sectionOpen.update(state => {
      // On mobile, keep one accordion section open at a time for easier scrolling
      const opening = !this.isSectionOpen(id);
      const next: Record<string, boolean> = this.mobile
        ? Object.fromEntries(this.sections.map(s => [s.id, false]))
        : { ...state };
      next[id] = opening;
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  badgeFor(item: SuperNavItem): number {
    if (item.badgeKey === 'claims') return this.pendingClaims();
    if (item.badgeKey === 'registrations') return this.pendingRegistrations();
    return 0;
  }

  sectionBadge(section: SuperNavSection): number {
    return section.items.reduce((sum: number, item: SuperNavItem) => sum + this.badgeFor(item), 0);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  navigate(item: SuperNavItem): void {
    this.clearSearch();
    void this.router.navigateByUrl(item.route);
    if (this.mobile) this.closed.emit();
  }

  logout(): void {
    this.authService.logout();
  }

  closeMobile(): void {
    this.closed.emit();
  }

  /** True only for the nav item whose path matches (exact when required). */
  isItemActive(item: SuperNavItem): boolean {
    const raw = this.currentUrl();
    const tree = this.router.parseUrl(raw);
    const segments = tree.root.children['primary']?.segments.map(s => s.path) ?? [];
    const pathNorm = ('/' + segments.join('/')).replace(/\/$/, '') || '/';
    const routeNorm = item.route.replace(/\/$/, '') || '/';
    const exact = item.exact === true || item.route === '/dashboard/super';

    if (exact) return pathNorm === routeNorm;
    return pathNorm === routeNorm || pathNorm.startsWith(routeNorm + '/');
  }

  private syncUrl(url: string): void {
    this.currentUrl.set(url);
  }

  private loadBadges(): void {
    this.platformService.getDashboard().subscribe({
      next: (d: PlatformDashboard) =>
        this.pendingClaims.set(d.needsAttention?.pendingClaims ?? d.stats?.pendingClaims ?? 0),
      error: () => { /* keep last known */ },
    });
    this.registrationService.list('Pending').subscribe({
      next: (items: AdminRegistrationItem[]) =>
        this.pendingRegistrations.set((items ?? []).length),
      error: () => { /* keep last known */ },
    });
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readSections(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(SECTIONS_KEY);
      return raw ? JSON.parse(raw) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  }
}
