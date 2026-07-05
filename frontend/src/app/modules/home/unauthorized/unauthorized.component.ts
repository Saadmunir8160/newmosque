import { Component, HostListener, signal, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule],
  template: `
  <header class="mos-nav w-full" [class.scrolled]="navScrolled()">
    <div class="app-section mos-nav-inner" style="padding-top: max(0.5rem, env(safe-area-inset-top))">
      <a routerLink="/" class="mos-brand">
        <span class="mos-brand-mark">M</span>
        <span class="mos-brand-text min-w-0">
          <span class="mos-brand-name">MosqueOS</span>
          <span class="mos-brand-tag">Community Platform</span>
        </span>
      </a>
      <nav class="mos-nav-center" aria-label="Main navigation">
        <button type="button" (click)="scrollTo('home')" class="mos-nav-pill" [class.active]="isActive('home')">Home</button>
        <button type="button" (click)="scrollTo('features')" class="mos-nav-pill" [class.active]="isActive('features')">Features</button>
        <a routerLink="/demo" class="mos-nav-pill" (click)="menuOpen.set(false)">Demo</a>
        <a routerLink="/mosques" class="mos-nav-pill" (click)="menuOpen.set(false)">Find a Mosque</a>
        <button type="button" (click)="scrollTo('pricing')" class="mos-nav-pill" [class.active]="isActive('pricing')">Pricing</button>
        <button type="button" (click)="scrollTo('contact')" class="mos-nav-pill" [class.active]="isActive('contact')">Contact</button>
      </nav>
      <div class="mos-nav-actions">
        <button type="button" (click)="browseAsGuest()" class="mos-btn-ghost">Guest</button>
        <a routerLink="/welcome" class="mos-btn-primary">Login</a>
        <button type="button" class="mos-menu-toggle" [class.open]="menuOpen()" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
        </button>
      </div>
    </div>
    <div class="mos-mobile-drawer lg:hidden" [class.open]="menuOpen()">
      <div class="mos-mobile-nav app-section">
        <button type="button" (click)="scrollTo('home')" class="mos-mobile-link" [class.active]="isActive('home')">Home</button>
        <button type="button" (click)="scrollTo('features')" class="mos-mobile-link" [class.active]="isActive('features')">Features</button>
        <a routerLink="/demo" class="mos-mobile-link" (click)="menuOpen.set(false)">Demo Mosque</a>
        <a routerLink="/mosques" class="mos-mobile-link" (click)="menuOpen.set(false)">Find a Mosque</a>
        <button type="button" (click)="scrollTo('pricing')" class="mos-mobile-link" [class.active]="isActive('pricing')">Pricing</button>
        <button type="button" (click)="scrollTo('contact')" class="mos-mobile-link" [class.active]="isActive('contact')">Contact</button>
        <div class="mos-mobile-cta">
          <button type="button" (click)="browseAsGuest()" class="mos-btn-ghost" style="display:flex;width:100%;justify-content:center;">Browse as Guest</button>
          <a routerLink="/welcome" class="mos-btn-primary" style="display:flex;width:100%;justify-content:center;" (click)="menuOpen.set(false)">Login</a>
        </div>
      </div>
    </div>
  </header>
  <div class="bg-mos-bg text-mos-text w-full min-h-[100dvh] flex items-center justify-center">
    <section class="unauth" style="text-align:center;">
      <h1 style="font-size:2rem; margin-bottom:0.5rem;">Access denied</h1>
      <p style="margin-bottom:1rem;">You do not have permission to manage this mosque profile.</p>
      <a routerLink="/" class="mos-btn-primary" style="padding:0.75rem 1.5rem;">Return home</a>
    </section>
  </div>`,
  styles: [`
    .unauth {
      max-width: 32rem;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
      border: 1px solid var(--mos-border, #d1d5db);
      border-radius: 12px;
      background: var(--mos-surface, #fff);
    }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0 0 1.25rem; color: var(--mos-text-secondary, #4b5563); }
    a { font-weight: 600; color: var(--mos-primary, #0f766e); }
  `]
})
export class UnauthorizedComponent {
  // Signals
  menuOpen = signal(false);

  // Services
  private authService = inject(AuthService);
  private router = inject(Router);

  // Detect scroll for header styling
  @HostListener('window:scroll')
  onWindowScroll() {
    // trigger change detection
  }

  navScrolled(): boolean {
    return window.scrollY > 20;
  }

  scrollTo(section: string): void {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  isActive(section: string): boolean {
    const el = document.getElementById(section);
    if (!el) return false;
    const top = el.offsetTop;
    const height = el.offsetHeight;
    const scroll = window.scrollY;
    return scroll >= top && scroll < top + height;
  }

  browseAsGuest(): void {
    this.authService.enterGuestMode();
    this.router.navigate(['/dashboard/guest']);
  }
}
