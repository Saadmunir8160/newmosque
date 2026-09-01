import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../core/services/navigation.service';
import {
  SUPER_ADMIN_NAV_SECTIONS,
  SUPER_ADMIN_TOP_ITEMS,
  SUPER_ADMIN_NAV_ICONS,
  superAdminNavItems,
} from '../../core/config/super-admin-nav.config';
import {
  OWNER_NAV_SECTIONS,
  OWNER_NAV_ICONS,
  ownerNavItems,
} from '../../core/config/owner-nav.config';
import {
  PRAYER_EDITOR_NAV_SECTIONS,
  PRAYER_EDITOR_NAV_ICONS,
  prayerEditorNavItems,
} from '../../core/config/prayer-editor-nav.config';
import {
  MOSQUE_ADMIN_NAV_SECTIONS,
  MOSQUE_ADMIN_NAV_ICONS,
  mosqueAdminNavItems,
} from '../../core/config/mosque-admin-nav.config';
import {
  MEMBER_NAV_SECTIONS,
  MEMBER_NAV_ICONS,
  memberNavItems,
} from '../../core/config/member-nav.config';
import {
  TEACHER_NAV_SECTIONS,
  TEACHER_NAV_ICONS,
  teacherNavItems,
} from '../../core/config/teacher-nav.config';
import {
  MUQADDAM_NAV_SECTIONS,
  MUQADDAM_NAV_ICONS,
  muqaddamNavItems,
} from '../../core/config/muqaddam-nav.config';
import {
  CONTENT_EDITOR_NAV_SECTIONS,
  CONTENT_EDITOR_NAV_ICONS,
  contentEditorNavItems,
} from '../../core/config/content-editor-nav.config';
import {
  GUEST_NAV_SECTIONS,
  GUEST_NAV_ICONS,
  guestNavItems,
} from '../../core/config/guest-nav.config';
import {
  PARENT_NAV_SECTIONS,
  PARENT_NAV_ICONS,
  parentNavItems,
} from '../../core/config/parent-nav.config';
import { navForGuest, navForRoles, navIcon, navSections, navIsSuperAdmin, navIsMosqueOwner, navIsMosqueAdmin, navIsPrayerEditor, navIsTeacher, navIsMuqaddam, navIsContentEditor, navIsParent, navIsMember, NavItem } from '../../core/config/nav.config';
import { MosqueContextService } from '../../core/services/mosque-context.service';
import { MosqueSwitcherComponent } from '../../shared/components/mosque-switcher/mosque-switcher.component';
import { BreadcrumbsComponent } from '../../shared/ui/breadcrumbs.component';
import { NotificationBellComponent } from '../../shared/ui/notification-bell.component';
import { SuperAdminSidebarComponent } from '../super-admin-sidebar/super-admin-sidebar.component';

const SIDEBAR_KEY = 'mos_sidebar_collapsed';
const SECTIONS_KEY = 'mos_nav_sections';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, MosqueSwitcherComponent, BreadcrumbsComponent, NotificationBellComponent, SuperAdminSidebarComponent],
  styles: [`
    .shell-layout {
      background: var(--mos-bg);
    }
    .shell-layout--super {
      background: #F7F9F8;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }
    .mos-sa-rail {
      height: 100%;
      min-height: 0;
    }
    .mos-sa-rail app-super-admin-sidebar {
      display: contents;
    }
    .shell-layout--super .app-shell-main {
      background: #F7F9F8;
    }
    .shell-layout--super .app-page {
      max-width: 1440px;
      margin-inline: auto;
      padding-inline: 16px;
    }
    @media (min-width: 640px) {
      .shell-layout--super .app-page {
        padding-inline: 24px;
      }
    }
    @media (min-width: 1024px) {
      .shell-layout--super .app-page {
        padding-inline: 32px;
      }
    }
    .shell-sidebar {
      transition: width 0.25s ease;
      background: var(--mos-sidebar-bg);
      border-right: 1px solid var(--mos-sidebar-border);
    }
    .shell-sidebar-header {
      border-bottom: 1px solid var(--mos-sidebar-border);
    }
    .shell-sidebar-footer {
      border-top: 1px solid var(--mos-sidebar-border);
    }
    .shell-brand {
      color: var(--mos-sidebar-text);
    }
    .shell-toggle-btn {
      border: 1px solid var(--mos-sidebar-border);
      color: rgba(255, 255, 255, 0.85);
    }
    .shell-toggle-btn:hover {
      background: var(--mos-sidebar-hover);
      color: var(--mos-sidebar-text);
    }
    .shell-section-btn {
      color: var(--mos-sidebar-text);
    }
    .shell-section-btn:hover {
      background: var(--mos-sidebar-hover);
    }
    .shell-section-title {
      color: var(--mos-sidebar-section);
    }
    .shell-section-chevron {
      color: rgba(255, 255, 255, 0.65);
    }
    .shell-nav-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: rgba(255, 255, 255, 0.88);
      border-radius: 10px;
      border: 1px solid transparent;
    }
    .shell-nav-link:hover {
      background: var(--mos-sidebar-hover);
      color: var(--mos-sidebar-text);
    }
    .shell-nav-link.router-link-active {
      background: var(--mos-sidebar-active);
      color: var(--mos-sidebar-text);
      font-weight: 700;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .shell-nav-label {
      transition: opacity 0.2s ease, max-width 0.25s ease;
      overflow: hidden;
      white-space: nowrap;
    }
    .shell-sidebar--collapsed .shell-nav-label {
      opacity: 0;
      max-width: 0;
    }
    .shell-section-body {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows 0.25s ease;
    }
    .shell-section-body--closed {
      grid-template-rows: 0fr;
    }
    .shell-section-inner {
      overflow: hidden;
    }
    .shell-nav-icon {
      flex-shrink: 0;
      width: 1.75rem;
      text-align: center;
      font-size: 1rem;
      line-height: 1;
    }
    .shell-role-badge {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-radius: 9999px;
      padding: 0.125rem 0.5rem;
    }
    .shell-role-badge--guest {
      color: #FBBF24;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .shell-btn-login {
      background: var(--mos-accent);
      color: var(--mos-text-inverse);
      border: 1px solid rgba(217, 119, 6, 0.4);
      font-weight: 700;
    }
    .shell-btn-login:hover {
      background: #B45309;
    }
    .shell-btn-logout {
      background: rgba(220, 38, 38, 0.12);
      color: #FECACA;
      border: 1px solid rgba(220, 38, 38, 0.35);
      font-weight: 700;
    }
    .shell-btn-logout:hover {
      background: rgba(220, 38, 38, 0.22);
    }
    .shell-mobile-header {
      background: var(--mos-header-bg);
      border-bottom: 1px solid var(--mos-header-border);
      color: var(--mos-text-primary);
    }
    .shell-layout--super .shell-mobile-header {
      background: #0B3D2E;
      border-bottom: 1px solid #2B6A55;
      color: #fff;
    }
    .shell-layout--super .shell-mobile-header .shell-mobile-menu-btn {
      color: #0B3D2E;
      border-color: rgba(200, 162, 74, 0.45);
      background: #C8A24A;
      font-weight: 700;
    }
    .shell-mobile-menu-btn {
      color: var(--mos-primary);
      border: 1px solid var(--mos-border-input);
      background: var(--mos-surface);
    }
    .shell-mobile-overlay {
      overscroll-behavior: contain;
    }
    .shell-mobile-overlay aside {
      background: var(--mos-sidebar-bg);
      border-right: 1px solid var(--mos-sidebar-border);
    }
    .shell-layout--super .shell-mobile-overlay > div:last-child {
      width: min(82vw, 260px);
      max-width: 100%;
      display: flex;
      height: 100%;
    }
    @media (max-width: 767px) {
      .shell-layout--super .app-page {
        padding-inline: 12px;
        padding-top: 12px;
      }
    }
    .shell-loading-text {
      color: rgba(255, 255, 255, 0.65);
    }
    .shell-empty-text {
      color: rgba(251, 191, 36, 0.9);
    }
    .owner-mosque-bar__label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mos-text-secondary);
    }
    .owner-mosque-bar__select {
      min-width: 12rem;
      max-width: 100%;
      padding: 0.45rem 0.65rem;
      border-radius: 0.5rem;
      border: 1px solid var(--mos-border);
      background: var(--mos-surface);
      font-size: 0.8125rem;
      color: var(--mos-text-primary);
    }
  `],
  template: `
    <div class="shell-layout flex w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden"
      [class.mos-sa]="isSuperAdmin()"
      [class.shell-layout--super]="isSuperAdmin()">
      <!-- Super Admin premium sidebar (desktop) -->
      <div class="hidden md:flex shrink-0 h-full mos-sa-rail" *ngIf="isSuperAdmin()">
        <app-super-admin-sidebar />
      </div>

      <!-- Other roles: classic sidebar -->
      <aside
        *ngIf="!isSuperAdmin()"
        class="shell-sidebar flex flex-col hidden md:flex shrink-0 h-full"
        [class.shell-sidebar--collapsed]="sidebarCollapsed()"
        [class.w-64]="!sidebarCollapsed()"
        [class.lg:w-72]="!sidebarCollapsed()"
        [class.w-[4.75rem]]="sidebarCollapsed()">

        <div class="shell-sidebar-header h-14 lg:h-16 flex items-center shrink-0 px-2"
          [class.justify-center]="sidebarCollapsed()"
          [class.justify-between]="!sidebarCollapsed()"
          [class.lg:px-4]="!sidebarCollapsed()">
          <a *ngIf="!sidebarCollapsed()" [routerLink]="homeLink()" class="shell-brand text-lg lg:text-xl font-bold truncate min-w-0">MosqueOS</a>
          <span *ngIf="!sidebarCollapsed() && authService.isGuest()"
            class="shell-role-badge shell-role-badge--guest shrink-0">
            Guest
          </span>
          <button type="button" (click)="toggleSidebar()"
            class="shell-toggle-btn shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            [attr.title]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            {{ sidebarCollapsed() ? '»' : '«' }}
          </button>
          <app-notification-bell *ngIf="!sidebarCollapsed()" />
        </div>

        <nav class="flex-1 overflow-y-auto no-scrollbar py-3 min-h-0">
          <p *ngIf="authService.loading()" class="px-4 text-xs shell-loading-text">Loading menu…</p>
          <p *ngIf="!authService.loading() && !sections().length && !authService.isGuest()"
            class="px-4 text-xs shell-empty-text leading-relaxed">
            No menu items for your account. Ask an admin to assign a role, then log in again.
          </p>
          <ng-container *ngIf="!sidebarCollapsed()">
            <div *ngFor="let section of sections()" class="mb-1">
              <button type="button"
                (click)="toggleSection(section.section)"
                class="shell-section-btn w-full flex items-center gap-2 px-3 lg:px-4 py-2 text-left rounded-md mx-1">
                <span class="shell-nav-icon shell-section-title">{{ sectionIcon(section.section) }}</span>
                <span class="flex-1 text-label shell-section-title min-w-0">{{ section.section }}</span>
                <span class="shell-section-chevron text-xs shrink-0">
                  {{ isSectionOpen(section.section) ? '▾' : '▸' }}
                </span>
              </button>

              <div class="shell-section-body px-1"
                [class.shell-section-body--closed]="!isSectionOpen(section.section)">
                <div class="shell-section-inner">
                  <ul class="space-y-0.5 py-1 text-base">
                    <li *ngFor="let item of section.items">
                      <a [routerLink]="item.route"
                        routerLinkActive="router-link-active"
                        [routerLinkActiveOptions]="{ exact: isExactNavRoute(item.route) }"
                        class="shell-nav-link px-3 py-2.5 mx-1">
                        <span class="shell-nav-icon">{{ iconFor(item) }}</span>
                        <span class="truncate">{{ item.label }}</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ng-container>

          <ul *ngIf="sidebarCollapsed()" class="space-y-1 px-1 text-base">
            <li *ngFor="let item of flatNavItems()">
              <a [routerLink]="item.route"
                routerLinkActive="router-link-active"
                [routerLinkActiveOptions]="{ exact: isExactNavRoute(item.route) }"
                [attr.title]="item.label"
                [attr.aria-label]="item.label"
                class="shell-nav-link justify-center px-2 py-2.5 mx-auto w-10">
                <span class="shell-nav-icon">{{ iconFor(item) }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="shell-sidebar-footer p-3 lg:p-4 shrink-0"
          style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))">
          <button *ngIf="authService.isGuest()" (click)="goToLogin()"
            class="shell-btn-login w-full rounded-[10px] py-2.5 text-base flex items-center justify-center gap-2"
            [class.px-2]="sidebarCollapsed()"
            [attr.title]="sidebarCollapsed() ? 'Login' : null"
            [attr.aria-label]="sidebarCollapsed() ? 'Login' : null">
            <span class="shell-nav-icon">⎆</span>
            <span *ngIf="!sidebarCollapsed()">Login</span>
          </button>
          <button *ngIf="!authService.isGuest()" (click)="authService.logout()"
            class="shell-btn-logout w-full rounded-[10px] py-2.5 text-base flex items-center justify-center gap-2"
            [class.px-2]="sidebarCollapsed()"
            [attr.title]="sidebarCollapsed() ? 'Logout' : null"
            [attr.aria-label]="sidebarCollapsed() ? 'Logout' : null">
            <span class="shell-nav-icon">⎋</span>
            <span *ngIf="!sidebarCollapsed()">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div *ngIf="menuOpen()" id="shell-mobile-nav" class="shell-mobile-overlay fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div class="absolute inset-0 bg-black/50" (click)="closeMobileMenu()" aria-hidden="true"></div>
        <div class="absolute left-0 top-0 bottom-0 z-50 h-full max-h-[100dvh] flex shadow-2xl" (click)="$event.stopPropagation()">
          <app-super-admin-sidebar
            *ngIf="isSuperAdmin()"
            [mobile]="true"
            [open]="menuOpen()"
            (closed)="closeMobileMenu()" />
          <aside *ngIf="!isSuperAdmin()"
            class="w-[min(88vw,340px)] flex flex-col z-50 h-full"
            style="background: var(--mos-sidebar-bg)">
            <div class="shell-sidebar-header h-14 flex items-center justify-between px-4 shrink-0"
              style="padding-top: env(safe-area-inset-top)">
              <span class="shell-brand text-lg font-bold">MosqueOS</span>
              <button type="button" (click)="closeMobileMenu()" class="shell-toggle-btn text-base font-bold px-3 py-2 rounded-lg min-h-[44px]" aria-label="Close menu">✕</button>
            </div>
            <nav class="flex-1 overflow-y-auto no-scrollbar py-3 min-h-0">
              <div *ngFor="let section of sections()" class="mb-1">
                <button type="button" (click)="toggleSection(section.section)"
                  class="shell-section-btn w-full flex items-center justify-between px-4 py-2.5 text-left">
                  <span class="text-label shell-section-title">{{ section.section }}</span>
                  <span class="shell-section-chevron text-xs">{{ isSectionOpen(section.section) ? '▾' : '▸' }}</span>
                </button>
                <div *ngIf="isSectionOpen(section.section)">
                  <a *ngFor="let item of section.items" [routerLink]="item.route" (click)="closeMobileMenu()"
                    routerLinkActive="router-link-active"
                    [routerLinkActiveOptions]="{ exact: isExactNavRoute(item.route) }"
                    class="shell-nav-link px-4 py-3 text-base">
                    <span class="shell-nav-icon">{{ iconFor(item) }}</span>
                    <span>{{ item.label }}</span>
                  </a>
                </div>
              </div>
            </nav>
            <div class="shell-sidebar-footer p-4 shrink-0"
              style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
              <button *ngIf="authService.isGuest()" (click)="goToLogin()"
                class="shell-btn-login w-full rounded-[10px] py-2.5 text-base font-bold">Login</button>
              <button *ngIf="!authService.isGuest()" (click)="authService.logout()"
                class="shell-btn-logout w-full rounded-[10px] py-2.5 text-base font-bold">Logout</button>
            </div>
          </aside>
        </div>
      </div>

      <main class="app-shell-main flex-1 flex flex-col overflow-hidden w-full min-w-0 h-full">
        <header class="shell-mobile-header h-14 flex items-center justify-between px-3 sm:px-4 md:hidden shrink-0"
          style="padding-top: env(safe-area-inset-top)">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base sm:text-lg font-bold truncate">{{ isSuperAdmin() ? 'MOS' : 'MosqueOS' }}</span>
            <span *ngIf="isSuperAdmin()"
              class="text-[0.625rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
              Super Admin
            </span>
            <span *ngIf="authService.isGuest()"
              class="text-[0.625rem] font-bold uppercase tracking-wider text-mos-accent bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
              Guest
            </span>
          </div>
          <div class="flex items-center gap-2">
            <app-notification-bell />
            <button type="button" (click)="toggleMobileMenu()"
              class="shell-mobile-menu-btn text-base font-bold px-3 py-2 rounded-[10px] min-h-[44px] min-w-[44px]"
              [attr.aria-expanded]="menuOpen()"
              aria-controls="shell-mobile-nav"
              aria-label="Toggle navigation menu">
              {{ menuOpen() ? 'Close' : 'Menu' }}
            </button>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full min-h-0">
          <div class="app-page app-section w-full max-w-full min-w-0 py-4 sm:py-6 lg:py-8"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
            <app-mosque-switcher *ngIf="showMosqueSwitcher()" />
            <app-breadcrumbs *ngIf="!isSuperAdmin()" />
            <router-outlet></router-outlet>
          </div>
        </div>
      </main>
    </div>
  `
})
export class ShellComponent implements OnDestroy {
  authService = inject(AuthService);
  mosqueContext = inject(MosqueContextService);
  private dynamicNav = inject(NavigationService);
  private router = inject(Router);
  readonly superTopNavItems = SUPER_ADMIN_TOP_ITEMS;
  menuOpen = signal(false);
  sidebarCollapsed = signal(this.readSidebarCollapsed());
  sectionOpen = signal<Record<string, boolean>>(this.readSectionState());
  private navSub?: Subscription;

  constructor() {
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobileMenu());

    effect(() => {
      const open = this.menuOpen();
      document.body.classList.toggle('mos-nav-open', open);
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    document.body.classList.remove('mos-nav-open');
  }

  toggleMobileMenu(): void {
    this.menuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.menuOpen.set(false);
  }

  isSuperAdmin = computed(() =>
    !this.authService.isGuest() && navIsSuperAdmin(this.authService.roles()));

  isMosqueOwner = computed(() =>
    !this.authService.isGuest() && navIsMosqueOwner(this.authService.roles()));

  isMosqueAdmin = computed(() =>
    !this.authService.isGuest() && navIsMosqueAdmin(this.authService.roles()));

  isPrayerEditor = computed(() =>
    !this.authService.isGuest() && navIsPrayerEditor(this.authService.roles()));

  isMember = computed(() =>
    !this.authService.isGuest() && navIsMember(this.authService.roles()));

  isTeacher = computed(() =>
    !this.authService.isGuest() && navIsTeacher(this.authService.roles()));

  isMuqaddam = computed(() =>
    !this.authService.isGuest() && navIsMuqaddam(this.authService.roles()));

  isContentEditor = computed(() =>
    !this.authService.isGuest() && navIsContentEditor(this.authService.roles()));

  isParent = computed(() =>
    !this.authService.isGuest() && navIsParent(this.authService.roles()));

  showMosqueSwitcher = computed(() =>
    !this.authService.isGuest()
    && (this.isMosqueOwner() || this.isMosqueAdmin())
    && this.mosqueContext.ownedMosques().length > 0);

  sections = computed(() => {
    if (this.authService.isGuest()) {
      return GUEST_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isSuperAdmin()) {
      return SUPER_ADMIN_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isMosqueOwner()) {
      return OWNER_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isMosqueAdmin()) {
      return MOSQUE_ADMIN_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isPrayerEditor()) {
      return PRAYER_EDITOR_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isTeacher()) {
      return TEACHER_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isMuqaddam()) {
      return MUQADDAM_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isContentEditor()) {
      return CONTENT_EDITOR_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isParent()) {
      return PARENT_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isMember()) {
      return MEMBER_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    const dynamic = this.dynamicNav.sections();
    if (this.dynamicNav.loaded() && dynamic.length) {
      return dynamic;
    }
    const items = navForRoles(this.authService.roles());
    return navSections(items);
  });

  flatNavItems = computed(() => {
    if (this.authService.isGuest()) return guestNavItems();
    if (this.isSuperAdmin()) return superAdminNavItems();
    if (this.isMosqueOwner()) return ownerNavItems();
    if (this.isMosqueAdmin()) return mosqueAdminNavItems();
    if (this.isPrayerEditor()) return prayerEditorNavItems();
    if (this.isTeacher()) return teacherNavItems();
    if (this.isMuqaddam()) return muqaddamNavItems();
    if (this.isContentEditor()) return contentEditorNavItems();
    if (this.isParent()) return parentNavItems();
    if (this.isMember()) return memberNavItems();
    return this.sections().flatMap(s => s.items);
  });

  iconFor(item: NavItem): string {
    if (this.authService.isGuest() && item.icon) {
      return GUEST_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isSuperAdmin() && item.icon) {
      return SUPER_ADMIN_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isMosqueOwner() && item.icon) {
      return OWNER_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isMosqueAdmin() && item.icon) {
      return MOSQUE_ADMIN_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isPrayerEditor() && item.icon) {
      return PRAYER_EDITOR_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isTeacher() && item.icon) {
      return TEACHER_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isMuqaddam() && item.icon) {
      return MUQADDAM_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isContentEditor() && item.icon) {
      return CONTENT_EDITOR_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isParent() && item.icon) {
      return PARENT_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isMember() && item.icon) {
      return MEMBER_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    return navIcon(item);
  }

  goToLogin(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  homeLink(): string {
    if (this.authService.isGuest()) return '/dashboard/guest';
    if (this.isSuperAdmin()) return '/dashboard/super';
    if (this.isMosqueOwner()) return '/dashboard/owner';
    if (this.isMosqueAdmin()) return '/dashboard/admin';
    if (this.isPrayerEditor()) return '/dashboard/prayer-editor';
    if (this.isTeacher()) return '/dashboard/teacher';
    if (this.isMuqaddam()) return '/dashboard/muqaddam';
    if (this.isContentEditor()) return '/dashboard/content';
    if (this.isParent()) return '/dashboard/parent';
    return '/dashboard';
  }

  isExactNavRoute(route: string): boolean {
    return route === '/dashboard'
      || route === '/dashboard/super'
      || route === '/dashboard/owner'
      || route === '/dashboard/admin'
      || route === '/dashboard/prayer-editor'
      || route === '/dashboard/teacher'
      || route === '/dashboard/muqaddam'
      || route === '/dashboard/content'
      || route === '/dashboard/guest'
      || route === '/dashboard/owner/verification'
      || route === '/dashboard/owner/my-claims'
      || route === '/dashboard/owner/mosque-listings'
      || route === '/dashboard/admin'
      || route === '/dashboard/mosque';
  }

  private readonly sectionIcons: Record<string, string> = {
    'Browse': '👁️',
    'Main': '🏠',
    'Dashboard': '▦',
    'Prayer Times': '🕌',
    'Overview': '▦',
    'Mosque': '⌂',
    'Mosques': '⌂',
    'Mosque Management': '🏢',
    'Modules': '📦',
    'User Management': '👥',
    'Audit & Monitoring': '📝',
    'Platform Settings': '⚙️',
    'Module 3.1 · Mosque Profile': '⌂',
    'Module 3.1–3.3 · Browse': '⌂',
    'Module 3.2 · Overview': '🕌',
    'Module 3.2 · Core': '🕌',
    'Module 3.2 · Prayer Times': '🕌',
    'Module 3.3 · Announcements': '📢',
    'Module 3.1 · Mosque': '⌂',
    'Extended': '⋯',
    'Access': '👥',
    'Content': '📖',
    'Oversight': '👁',
    'System': '⚙',
    'Super Admin': '⚙️',
    'Mosque Owner': '🏛️',
    'Users': '👥',
    'Reports': '📊',
    'Settings': '⚙️',
    'Madrassah': '📚',
    'Muqaddam': '📿',
    'Parent': '👨‍👩‍👧',
    'My Worship': '🌙',
  };

  sectionIcon(section: string): string {
    return this.sectionIcons[section] ?? '▪';
  }

  isSectionOpen(section: string): boolean {
    if (this.sectionOpen()[section] !== undefined) {
      return this.sectionOpen()[section];
    }
    // Keep Module 3.1 focused — Extended starts collapsed
    if (section === 'Extended') return false;
    return true;
  }

  toggleSection(section: string): void {
    this.sectionOpen.update(state => {
      const currentlyOpen = state[section] ?? (section === 'Extended' ? false : true);
      const next = { ...state, [section]: !currentlyOpen };
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => {
      const next = !v;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  }

  private readSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  }

  private readSectionState(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(SECTIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
