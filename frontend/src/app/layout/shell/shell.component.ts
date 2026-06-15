import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { navForGuest, navForRoles, navIcon, navSections, navIsSuperAdmin, navIsMosqueOwner, NavItem } from '../../core/config/nav.config';
import {
  SUPER_ADMIN_NAV_SECTIONS,
  SUPER_ADMIN_NAV_ICONS,
  superAdminNavItems,
} from '../../core/config/super-admin-nav.config';
import {
  OWNER_NAV_SECTIONS,
  OWNER_NAV_ICONS,
  ownerNavItems,
} from '../../core/config/owner-nav.config';

const SIDEBAR_KEY = 'mos_sidebar_collapsed';
const SECTIONS_KEY = 'mos_nav_sections';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  styles: [`
    .shell-sidebar {
      transition: width 0.25s ease;
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
    .shell-nav-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .shell-nav-icon {
      flex-shrink: 0;
      width: 1.75rem;
      text-align: center;
      font-size: 1rem;
      line-height: 1;
    }
  `],
  template: `
    <div class="flex w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-[#022c22] overflow-hidden">
      <!-- Desktop sidebar -->
      <aside
        class="shell-sidebar bg-[#064e3b] border-r border-emerald-800 flex flex-col hidden md:flex shrink-0 h-full"
        [class.shell-sidebar--collapsed]="sidebarCollapsed()"
        [class.w-64]="!sidebarCollapsed()"
        [class.lg:w-72]="!sidebarCollapsed()"
        [class.w-[4.75rem]]="sidebarCollapsed()">

        <div class="h-14 lg:h-16 flex items-center border-b border-emerald-800 shrink-0 px-2"
          [class.justify-center]="sidebarCollapsed()"
          [class.justify-between]="!sidebarCollapsed()"
          [class.lg:px-4]="!sidebarCollapsed()">
          <a *ngIf="!sidebarCollapsed()" routerLink="/dashboard" class="text-lg lg:text-xl font-bold text-white truncate min-w-0">MosqueOS</a>
          <span *ngIf="!sidebarCollapsed() && authService.isGuest()"
            class="text-[0.625rem] font-bold uppercase tracking-wider text-amber-300/90 bg-amber-400/10 border border-amber-400/25 rounded-full px-2 py-0.5 shrink-0">
            Guest
          </span>
          <button type="button" (click)="toggleSidebar()"
            class="shrink-0 w-8 h-8 rounded-lg border border-emerald-700 text-emerald-200 hover:text-white hover:bg-emerald-800/60 flex items-center justify-center text-sm"
            [attr.title]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            {{ sidebarCollapsed() ? '»' : '«' }}
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto no-scrollbar py-3 min-h-0">
          <!-- Expanded: grouped sections -->
          <ng-container *ngIf="!sidebarCollapsed()">
            <div *ngFor="let section of sections()" class="mb-1">
              <button type="button"
                (click)="toggleSection(section.section)"
                class="w-full flex items-center gap-2 px-3 lg:px-4 py-2 text-left hover:bg-emerald-800/30 rounded-md mx-1">
                <span class="shell-nav-icon text-amber-400/90">{{ sectionIcon(section.section) }}</span>
                <span class="flex-1 text-label text-amber-400 min-w-0">{{ section.section }}</span>
                <span class="text-emerald-400 text-xs shrink-0">
                  {{ isSectionOpen(section.section) ? '▾' : '▸' }}
                </span>
              </button>

              <div class="shell-section-body px-1"
                [class.shell-section-body--closed]="!isSectionOpen(section.section)">
                <div class="shell-section-inner">
                  <ul class="space-y-0.5 py-1 text-base">
                    <li *ngFor="let item of section.items">
                      <a [routerLink]="item.route"
                        routerLinkActive="bg-emerald-800/50 text-white font-bold"
                        [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                        class="shell-nav-link px-3 py-2.5 rounded-md hover:bg-emerald-800 text-emerald-100 mx-1">
                        <span class="shell-nav-icon">{{ iconFor(item) }}</span>
                        <span class="truncate">{{ item.label }}</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- Collapsed: icons only, no labels -->
          <ul *ngIf="sidebarCollapsed()" class="space-y-1 px-1 text-base">
            <li *ngFor="let item of flatNavItems()">
              <a [routerLink]="item.route"
                routerLinkActive="bg-emerald-800/50 text-white font-bold"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                [attr.title]="item.label"
                [attr.aria-label]="item.label"
                class="shell-nav-link justify-center px-2 py-2.5 rounded-md hover:bg-emerald-800 text-emerald-100 mx-auto w-10">
                <span class="shell-nav-icon">{{ iconFor(item) }}</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="p-3 lg:p-4 border-t border-emerald-800 shrink-0"
          style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))">
          <button *ngIf="authService.isGuest()" (click)="goToLogin()"
            class="w-full bg-amber-400/90 text-emerald-950 hover:bg-amber-300 rounded py-2.5 text-base border border-amber-500/50 font-bold flex items-center justify-center gap-2"
            [class.px-2]="sidebarCollapsed()"
            [attr.title]="sidebarCollapsed() ? 'Login' : null"
            [attr.aria-label]="sidebarCollapsed() ? 'Login' : null">
            <span class="shell-nav-icon">⎆</span>
            <span *ngIf="!sidebarCollapsed()">Login</span>
          </button>
          <button *ngIf="!authService.isGuest()" (click)="authService.logout()"
            class="w-full bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded py-2.5 text-base border border-red-900/50 font-bold flex items-center justify-center gap-2"
            [class.px-2]="sidebarCollapsed()"
            [attr.title]="sidebarCollapsed() ? 'Logout' : null"
            [attr.aria-label]="sidebarCollapsed() ? 'Logout' : null">
            <span class="shell-nav-icon">⎋</span>
            <span *ngIf="!sidebarCollapsed()">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Mobile overlay -->
      <div *ngIf="menuOpen()" class="fixed inset-0 z-50 md:hidden">
        <div class="absolute inset-0 bg-black/60" (click)="menuOpen.set(false)"></div>
        <aside class="absolute left-0 top-0 bottom-0 w-[min(88vw,340px)] bg-[#064e3b] border-r border-emerald-800 flex flex-col z-50 h-full"
          (click)="$event.stopPropagation()">
          <div class="h-14 flex items-center justify-between px-4 border-b border-emerald-800 shrink-0"
            style="padding-top: env(safe-area-inset-top)">
            <span class="text-lg font-bold text-white">MosqueOS</span>
            <button (click)="menuOpen.set(false)" class="text-emerald-200 text-base font-bold px-3 py-1">✕</button>
          </div>
          <nav class="flex-1 overflow-y-auto no-scrollbar py-3 min-h-0">
            <div *ngFor="let section of sections()" class="mb-1">
              <button type="button" (click)="toggleSection(section.section)"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left">
                <span class="text-label text-amber-400">{{ section.section }}</span>
                <span class="text-emerald-400 text-xs">{{ isSectionOpen(section.section) ? '▾' : '▸' }}</span>
              </button>
              <div *ngIf="isSectionOpen(section.section)">
                <a *ngFor="let item of section.items" [routerLink]="item.route" (click)="menuOpen.set(false)"
                  routerLinkActive="bg-emerald-800/50 text-white font-bold"
                  class="shell-nav-link px-4 py-3 text-base text-emerald-100">
                  <span class="shell-nav-icon">{{ iconFor(item) }}</span>
                  <span>{{ item.label }}</span>
                </a>
              </div>
            </div>
          </nav>
          <div class="p-4 border-t border-emerald-800 shrink-0"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
            <button *ngIf="authService.isGuest()" (click)="goToLogin()"
              class="w-full bg-amber-400/90 text-emerald-950 rounded py-2.5 text-base border border-amber-500/50 font-bold">Login</button>
            <button *ngIf="!authService.isGuest()" (click)="authService.logout()"
              class="w-full bg-red-900/30 text-red-400 rounded py-2.5 text-base border border-red-900/50 font-bold">Logout</button>
          </div>
        </aside>
      </div>

      <main class="flex-1 flex flex-col overflow-hidden w-full min-w-0 h-full">
        <header class="h-14 bg-[#064e3b] border-b border-emerald-800 flex items-center justify-between px-3 sm:px-4 md:hidden shrink-0"
          style="padding-top: env(safe-area-inset-top)">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base sm:text-lg font-bold text-white truncate">MosqueOS</span>
            <span *ngIf="authService.isGuest()"
              class="text-[0.625rem] font-bold uppercase tracking-wider text-amber-300/90 bg-amber-400/10 border border-amber-400/25 rounded-full px-2 py-0.5 shrink-0">
              Guest
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="menuOpen.set(!menuOpen())"
              class="text-emerald-200 text-base font-bold px-3 py-2 border border-emerald-700 rounded min-h-[44px]">Menu</button>
          </div>
        </header>

          <div class="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full min-h-0">
          <div class="app-page app-section w-full max-w-full min-w-0 py-4 sm:py-6 lg:py-8"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
            <router-outlet></router-outlet>
          </div>
        </div>
      </main>
    </div>
  `
})
export class ShellComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  menuOpen = signal(false);
  sidebarCollapsed = signal(this.readSidebarCollapsed());
  sectionOpen = signal<Record<string, boolean>>(this.readSectionState());

  isSuperAdmin = computed(() =>
    !this.authService.isGuest() && navIsSuperAdmin(this.authService.roles()));

  isMosqueOwner = computed(() =>
    !this.authService.isGuest() && navIsMosqueOwner(this.authService.roles()));

  sections = computed(() => {
    if (this.isSuperAdmin()) {
      return SUPER_ADMIN_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    if (this.isMosqueOwner()) {
      return OWNER_NAV_SECTIONS.map(s => ({ section: s.title, items: s.items }));
    }
    const items = this.authService.isGuest()
      ? navForGuest()
      : navForRoles(this.authService.roles());
    return navSections(items);
  });

  flatNavItems = computed(() => {
    if (this.isSuperAdmin()) return superAdminNavItems();
    if (this.isMosqueOwner()) return ownerNavItems();
    return this.sections().flatMap(s => s.items);
  });

  iconFor(item: NavItem): string {
    if (this.isSuperAdmin() && item.icon) {
      return SUPER_ADMIN_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    if (this.isMosqueOwner() && item.icon) {
      return OWNER_NAV_ICONS[item.icon] ?? navIcon(item);
    }
    return navIcon(item);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private readonly sectionIcons: Record<string, string> = {
    'Browse': '👁️',
    'Main': '🏠',
    'Prayer Times': '🕌',
    'Overview': '▦',
    'Mosques': '⌂',
    'Access': '👥',
    'Content': '📖',
    'Oversight': '👁',
    'System': '⚙',
    'Super Admin': '⚙️',
    'Mosque Owner': '🏛️',
    'Mosque Management': '🔧',
    'Madrassah': '📚',
    'Muqaddam': '📿',
    'Parent': '👨‍👩‍👧',
    'My Worship': '🌙',
  };

  sectionIcon(section: string): string {
    return this.sectionIcons[section] ?? '▪';
  }

  isSectionOpen(section: string): boolean {
    return this.sectionOpen()[section] ?? true;
  }

  toggleSection(section: string): void {
    this.sectionOpen.update(state => {
      const next = { ...state, [section]: !(state[section] ?? true) };
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
