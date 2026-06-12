import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .splash {
      min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 2rem 1rem;
      padding-top: max(2rem, env(safe-area-inset-top));
      padding-bottom: max(5.5rem, calc(env(safe-area-inset-bottom) + 3rem));
      background: linear-gradient(165deg, #065f46 0%, #022c22 45%, #011a14 100%);
      position: relative; overflow: hidden;
    }
    .splash::before {
      content: ''; position: absolute; width: 320px; height: 320px; border-radius: 50%;
      background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%);
      top: -80px; right: -60px; pointer-events: none;
    }
    .splash::after {
      content: ''; position: absolute; width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%);
      bottom: -40px; left: -80px; pointer-events: none;
    }
    .content { position: relative; z-index: 1; width: 100%; max-width: 340px; text-align: center; }
    .logo-wrap { margin-bottom: 1.25rem; }
    .logo-rings {
      width: 72px; height: 72px; margin: 0 auto 1rem; position: relative;
    }
    .ring {
      position: absolute; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85);
    }
    .ring-1 { width: 52px; height: 52px; top: 10px; left: 0; }
    .ring-2 { width: 52px; height: 52px; top: 10px; right: 0; }
    .logo-m {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.5rem; color: #fef3c7;
    }
    .app-name { color: #fff; font-size: clamp(1.5rem, 6vw, 1.75rem); font-weight: 800; margin: 0 0 0.35rem; letter-spacing: -0.02em; }
    .app-tag { color: #6ee7b7; font-size: 0.9rem; margin: 0 0 2.5rem; }
    .btn-stack { display: flex; flex-direction: column; gap: 14px; width: 100%; }
    .btn-login {
      width: 100%; padding: 15px; border-radius: 14px; border: none; cursor: pointer;
      background: #fff; color: #022c22; font-size: 1rem; font-weight: 700;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); transition: transform 0.15s;
    }
    .btn-login:hover { transform: translateY(-2px); }
    .btn-signup {
      width: 100%; padding: 15px; border-radius: 14px; cursor: pointer;
      background: transparent; color: #fff; font-size: 1rem; font-weight: 600;
      border: 2px solid rgba(255,255,255,0.75); transition: background 0.2s, border-color 0.2s;
    }
    .btn-signup:hover { background: rgba(255,255,255,0.08); border-color: #fff; }
    .guest-bottom {
      position: absolute; bottom: max(1.5rem, env(safe-area-inset-bottom)); left: 0; right: 0;
      text-align: center; z-index: 1;
    }
    .guest-bottom button {
      background: none; border: none; color: #a7f3d0; font-size: 0.88rem; cursor: pointer;
      text-decoration: underline; text-underline-offset: 4px; padding: 8px 16px;
    }
    .guest-bottom button:hover { color: #ecfdf5; }
  `],
  template: `
    <div class="splash">
      <div class="content">
        <div class="logo-wrap">
          <div class="logo-rings">
            <span class="ring ring-1"></span>
            <span class="ring ring-2"></span>
            <span class="logo-m">M</span>
          </div>
          <h1 class="app-name">MosqueOS</h1>
          <p class="app-tag">Your mosque community platform</p>
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
    this.router.navigate(['/dashboard']);
  }
}
