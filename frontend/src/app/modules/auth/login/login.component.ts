import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .auth-page {
      min-height: 100dvh; display: flex; flex-direction: column;
      padding: 1rem 0.875rem 1.125rem;
      padding-top: max(1rem, env(safe-area-inset-top));
      padding-bottom: max(1.125rem, env(safe-area-inset-bottom));
      position: relative; overflow: hidden;
    }
    @media (min-width: 640px) {
      .auth-page {
        padding: 2rem 1.25rem 1.75rem;
        padding-top: max(2rem, env(safe-area-inset-top));
      }
    }
    .bg-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
    .bg-overlay { position: absolute; inset: 0; background: rgba(6, 78, 59, 0.88); z-index: 1; }
    .auth-inner {
      position: relative; z-index: 2; width: 100%;
      max-width: min(400px, calc(100vw - 1.75rem));
      margin: 0 auto; flex: 1; display: flex; flex-direction: column;
    }
    .auth-title {
      color: #fff; font-size: clamp(1.1rem, 4.5vw, 1.5rem); font-weight: 800; line-height: 1.25;
      margin: 0 0 1.1rem; letter-spacing: -0.02em;
    }
    @media (min-width: 640px) { .auth-title { margin-bottom: 1.6rem; } }
    .field { margin-bottom: 0.85rem; }
    .field-label { display: block; font-size: 0.74rem; font-weight: 600; color: #a7f3d0; margin-bottom: 5px; }
    .input-wrap {
      width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.08);
      border: 1.5px solid rgba(167,243,208,0.35); border-radius: 12px;
      padding: 11px 13px; font-size: 0.88rem; color: #f8fafc; outline: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .input-wrap::placeholder { color: rgba(167,243,208,0.5); }
    .input-wrap:focus { border-color: #f59e0b; background: rgba(255,255,255,0.12); }
    .pass-row { position: relative; }
    .pass-row .input-wrap { padding-right: 48px; }
    .pass-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #6ee7b7; cursor: pointer; padding: 4px; line-height: 0;
    }
    .forgot-row { text-align: right; margin: 0.4rem 0 1rem; }
    .forgot-row a { color: #a7f3d0; font-size: 0.75rem; text-decoration: none; }
    .forgot-row a:hover { color: #fff; text-decoration: underline; }
    .btn-login {
      width: 100%; padding: 12px; border-radius: 12px; border: none; cursor: pointer;
      background: #fff; color: #022c22; font-size: 0.9rem; font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18); transition: transform 0.15s, opacity 0.2s;
    }
    .btn-login:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-login:disabled { opacity: 0.65; cursor: not-allowed; }
    .auth-footer {
      margin-top: auto; padding-top: 1.25rem; text-align: center;
      color: #6ee7b7; font-size: 0.8rem;
    }
    .auth-footer a { color: #fff; font-weight: 700; text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }
    .error-box {
      background: rgba(127,29,29,0.35); border: 1px solid #991b1b; color: #fecaca;
      padding: 9px 10px; border-radius: 10px; font-size: 0.76rem; margin-bottom: 0.75rem;
    }
    .hp-field { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
    .pass-mask { -webkit-text-security: disc; text-security: disc; }
  `],
  template: `
    <div class="auth-page">
      <img class="bg-image" src="https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=85&w=1200" alt="">
      <div class="bg-overlay"></div>
      <div class="auth-inner">
        <h1 class="auth-title">Assalamu Alaikum,<br>Sign in to MosqueOS</h1>

        <div *ngIf="error()" class="error-box">{{ error() }}</div>

        <div class="hp-field" aria-hidden="true">
          <input type="text" tabindex="-1" autocomplete="username">
          <input type="password" tabindex="-1" autocomplete="current-password">
        </div>

        <form id="login-form" autocomplete="off" (ngSubmit)="onLogin()" data-form-type="other">
          <div class="field">
            <label class="field-label">Username</label>
            <input class="input-wrap" type="text" id="mosqueos-login-id"
              name="mosqueos-login-id-field-x7k" placeholder="Enter your username"
              autocomplete="off" autocapitalize="off" spellcheck="false" readonly
              data-lpignore="true" data-1p-ignore data-bwignore
              (focus)="enableInput($event)"
              (keydown.tab)="allowPasswordField()"
              (keydown.enter)="$event.preventDefault()"
              [(ngModel)]="username">
          </div>

          <div class="field">
            <label for="mosqueos-login-secret" class="field-label">Password</label>
            <div class="pass-row">
              <input class="input-wrap" [class.pass-mask]="!showPassword()"
                [type]="showPassword() ? 'text' : 'text'"
                id="mosqueos-login-secret" name="mosqueos-login-secret-field-m9p"
                placeholder="Enter your password" autocomplete="off"
                [readonly]="!passwordReady()"
                data-lpignore="true" data-1p-ignore data-bwignore
                (mousedown)="allowPasswordField()"
                (focus)="onPasswordFocus($event)"
                (keydown.enter)="$event.preventDefault(); onLogin()"
                [(ngModel)]="password">
              <button type="button" class="pass-toggle" (click)="showPassword.set(!showPassword())" tabindex="-1" aria-label="Toggle password">
                <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <div class="forgot-row">
            <a href="#" (click)="$event.preventDefault()">Forgot Password?</a>
          </div>

          <button type="submit" class="btn-login" [disabled]="submitting()">
            {{ submitting() ? 'Signing in...' : 'Login' }}
          </button>
        </form>

        <p class="auth-footer">
          Don't have an account? <a routerLink="/register">Sign Up Now</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  passwordReady = signal(false);
  showPassword = signal(false);
  private passwordFocusAllowed = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.username = '';
    this.password = '';
    this.error.set(null);
    this.passwordReady.set(false);
  }

  enableInput(event: Event): void {
    (event.target as HTMLInputElement).removeAttribute('readonly');
  }

  allowPasswordField(): void {
    this.passwordFocusAllowed = true;
    this.passwordReady.set(true);
  }

  onPasswordFocus(event: Event): void {
    if (!this.passwordFocusAllowed) {
      (event.target as HTMLInputElement).blur();
      document.getElementById('mosqueos-login-id')?.focus();
      return;
    }
    this.enableInput(event);
  }

  async onLogin(): Promise<void> {
    this.error.set(null);
    this.submitting.set(true);
    const user = this.username.trim();
    const pass = this.password;
    if (!user || !pass) {
      this.error.set('Please enter username and password.');
      this.submitting.set(false);
      return;
    }
    try {
      await this.authService.login(user, pass);
      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Invalid username or password.');
      this.password = '';
    } finally {
      this.submitting.set(false);
    }
  }
}
