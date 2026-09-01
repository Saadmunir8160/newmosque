import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }
    .splash {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      padding-top: max(2rem, env(safe-area-inset-top));
      padding-bottom: max(5.5rem, calc(env(safe-area-inset-bottom) + 3rem));
      background: #0F4C3A;
      position: relative;
      overflow: hidden;
    }
    .splash::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, #0B3D2E 0%, #0F4C3A 42%, #16624A 100%);
      pointer-events: none;
    }
    .splash::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 80% 10%, rgba(200, 162, 74, 0.14), transparent 55%),
        radial-gradient(ellipse 50% 35% at 10% 90%, rgba(200, 162, 74, 0.08), transparent 50%);
      pointer-events: none;
    }
    .content {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 360px;
      text-align: center;
    }
    .logo-wrap { margin-bottom: 1.5rem; }
    .logo-mark {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(200, 162, 74, 0.14);
      border: 1px solid rgba(200, 162, 74, 0.4);
      color: #C8A24A;
    }
    .logo-mark .material-symbols-outlined {
      font-size: 32px;
    }
    .app-name {
      color: #FFFFFF;
      font-size: clamp(1.5rem, 6vw, 1.85rem);
      font-weight: 700;
      margin: 0 0 0.35rem;
      letter-spacing: -0.02em;
    }
    .app-tag {
      color: #C9D8D0;
      font-size: 0.9375rem;
      margin: 0 0 0.5rem;
      line-height: 1.45;
    }
    .app-role {
      display: inline-flex;
      margin: 0 0 2rem;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #C8A24A;
      background: rgba(200, 162, 74, 0.12);
      border: 1px solid rgba(200, 162, 74, 0.28);
    }
    .btn-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .btn-login {
      width: 100%;
      min-height: 48px;
      padding: 14px 16px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      background: #C8A24A;
      color: #0B3D2E;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 700;
      transition: background 200ms ease, transform 200ms ease;
    }
    .btn-login:hover {
      background: #D4B56A;
      transform: translateY(-1px);
    }
    .btn-signup {
      width: 100%;
      min-height: 48px;
      padding: 14px 16px;
      border-radius: 14px;
      cursor: pointer;
      background: transparent;
      color: #FFFFFF;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 600;
      border: 1px solid #2B6A55;
      transition: background 200ms ease, border-color 200ms ease;
    }
    .btn-signup:hover {
      background: #16624A;
      border-color: transparent;
    }
    .guest-bottom {
      position: absolute;
      bottom: max(1.5rem, env(safe-area-inset-bottom));
      left: 0;
      right: 0;
      text-align: center;
      z-index: 1;
    }
    .guest-bottom button {
      background: none;
      border: none;
      color: #C9D8D0;
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 4px;
      padding: 8px 16px;
      transition: color 200ms ease;
    }
    .guest-bottom button:hover { color: #EAF4EF; }
  `],
  template: `
    <div class="splash">
      <div class="content">
        <div class="logo-wrap">
          <div class="logo-mark" aria-hidden="true">
            <span class="material-symbols-outlined">mosque</span>
          </div>
          <h1 class="app-name">Mosque Operating System</h1>
          <p class="app-tag">Your mosque community platform</p>
          <span class="app-role">MOS</span>
        </div>

        <div class="btn-stack">
          <button type="button" class="btn-login" routerLink="/login">Login</button>
          <button type="button" class="btn-signup" routerLink="/register">Sign Up</button>
        </div>
      </div>

      <div class="guest-bottom">
        <button type="button" (click)="browseAsGuest()">Continue as a guest</button>
      </div>
    </div>
  `
})
export class AuthWelcomeComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  browseAsGuest(): void {
    this.authService.enterGuestMode();
    this.router.navigate(['/dashboard/guest']);
  }
}
