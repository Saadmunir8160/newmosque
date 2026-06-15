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
      min-height: 100dvh;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      padding-top: max(1rem, env(safe-area-inset-top));
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
      animation: pageFade 0.6s ease both;
    }
    @keyframes pageFade { from { opacity: 0; } to { opacity: 1; } }

    .bg-image {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; filter: blur(1px) brightness(0.52); z-index: 0;
      transform: scale(1.03);
    }
    .bg-overlay {
      position: absolute; inset: 0; z-index: 1;
      background:
        radial-gradient(circle at 50% 10%, rgba(212,175,55,0.12), transparent 42%),
        linear-gradient(135deg, rgba(2,44,34,0.90), rgba(6,78,59,0.84));
    }
    .vignette {
      position: absolute; inset: 0; z-index: 1;
      background: radial-gradient(circle, transparent 40%, rgba(2,44,34,0.55) 100%);
      pointer-events: none;
    }

    .auth-inner {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 450px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(167,243,208,0.28);
      border-radius: 20px;
      padding: 1.15rem 1.1rem;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 20px 45px rgba(0,0,0,0.35);
      animation: cardRise 0.55s ease both;
    }
    @media (min-width: 640px) { .auth-inner { padding: 1.5rem; } }
    @keyframes cardRise {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .moon-wrap {
      width: 2rem; height: 2rem; border-radius: 999px;
      background: rgba(212,175,55,0.14); border: 1px solid rgba(212,175,55,0.34);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem;
      color: #D4AF37;
    }
    .greet { margin: 0; text-align: center; color: #d1fae5; font-size: 0.8rem; }
    .auth-title {
      margin: 0.35rem 0 0;
      text-align: center;
      color: #fff;
      font-size: clamp(1.15rem, 4.5vw, 1.65rem);
      line-height: 1.25;
      letter-spacing: -0.01em;
      font-weight: 800;
    }
    .auth-sub {
      margin: 0.45rem 0 1.15rem;
      text-align: center;
      color: #d1fae5;
      font-size: 0.8rem;
    }

    .field { margin-bottom: 0.75rem; }
    .field-wrap { position: relative; }
    .field-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem; height: 1rem;
      color: #6ee7b7;
      pointer-events: none;
    }
    .input-wrap {
      width: 100%;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(167,243,208,0.32);
      background: rgba(2,44,34,0.46);
      color: #f8fafc;
      font-size: 0.85rem;
      padding: 0.95rem 0.8rem 0.45rem 2.35rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s;
    }
    .input-wrap:hover { border-color: rgba(167,243,208,0.5); }
    .input-wrap:focus {
      border-color: #10B981;
      box-shadow: 0 0 0 4px rgba(16,185,129,0.2);
      background: rgba(2,44,34,0.6);
      transform: translateY(-1px);
    }

    .floating-label {
      position: absolute;
      left: 2.35rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.78rem;
      color: rgba(209,250,229,0.72);
      pointer-events: none;
      transition: all 0.18s ease;
      background: transparent;
      padding: 0 0.2rem;
    }
    .input-wrap:focus + .floating-label,
    .input-wrap:not(:placeholder-shown) + .floating-label {
      top: 0.4rem;
      transform: none;
      font-size: 0.64rem;
      color: #6ee7b7;
    }

    .pass-row { position: relative; }
    .pass-row .input-wrap { padding-right: 2.25rem; }
    .pass-toggle {
      position: absolute; right: 0.55rem; top: 50%; transform: translateY(-50%);
      width: 1.65rem; height: 1.65rem; border-radius: 999px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(167,243,208,0.22);
      color: #a7f3d0; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, color 0.2s;
    }
    .pass-toggle:hover { background: rgba(255,255,255,0.14); color: #fff; }

    .meta-row {
      margin: 0.1rem 0 0.9rem;
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    }
    .remember {
      display: inline-flex; align-items: center; gap: 0.4rem;
      color: #d1fae5; font-size: 0.73rem;
    }
    .remember input { accent-color: #10B981; width: 0.9rem; height: 0.9rem; }
    .forgot-row a { color: #a7f3d0; font-size: 0.73rem; text-decoration: none; }
    .forgot-row a:hover { color: #fff; text-decoration: underline; }

    .btn-login {
      width: 100%;
      border: none;
      cursor: pointer;
      border-radius: 12px;
      padding: 0.8rem 1rem;
      color: #fff;
      font-size: 0.88rem;
      font-weight: 700;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      box-shadow: 0 8px 22px rgba(5,150,105,0.35);
      transition: transform 0.16s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    }
    .btn-login:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 26px rgba(5,150,105,0.38); }
    .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

    .auth-footer {
      margin: 0.95rem 0 0;
      text-align: center;
      color: #d1fae5;
      font-size: 0.77rem;
    }
    .auth-footer a { color: #D4AF37; font-weight: 700; text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }

    .error-box {
      margin-bottom: 0.7rem;
      border-radius: 10px;
      border: 1px solid #b91c1c;
      background: rgba(127,29,29,0.35);
      color: #fecaca;
      font-size: 0.74rem;
      padding: 0.5rem 0.65rem;
    }
    .hp-field { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
    .pass-mask { -webkit-text-security: disc; text-security: disc; }
  `],
  template: `
    <div class="auth-page">
      <img class="bg-image" src="https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=85&w=1400" alt="">
      <div class="bg-overlay"></div>
      <div class="vignette"></div>
      <div class="auth-inner">
        <div class="moon-wrap" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15.5A9.5 9.5 0 1 1 10.5 3 7.5 7.5 0 1 0 21 15.5z"/></svg>
        </div>
        <p class="greet">Assalamu Alaikum 👋</p>
        <h1 class="auth-title">Welcome Back to MosqueOS</h1>
        <p class="auth-sub">Sign in to manage your mosque operations</p>

        <div *ngIf="error()" class="error-box">{{ error() }}</div>

        <div class="hp-field" aria-hidden="true">
          <input type="text" tabindex="-1" autocomplete="username">
          <input type="password" tabindex="-1" autocomplete="current-password">
        </div>

        <form id="login-form" autocomplete="off" (ngSubmit)="onLogin()" data-form-type="other">
          <div class="field">
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>
              </span>
              <input class="input-wrap" type="text" id="mosqueos-login-id"
                name="mosqueos-login-id-field-x7k" placeholder=" "
                autocomplete="off" autocapitalize="off" spellcheck="false" readonly
                data-lpignore="true" data-1p-ignore data-bwignore
                (focus)="enableInput($event)"
                (keydown.tab)="allowPasswordField()"
                (keydown.enter)="$event.preventDefault()"
                [(ngModel)]="username">
              <label for="mosqueos-login-id" class="floating-label">Username</label>
            </div>
          </div>

          <div class="field">
            <div class="pass-row">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3z"/></svg>
              </span>
              <input class="input-wrap" [class.pass-mask]="!showPassword()"
                [type]="showPassword() ? 'text' : 'text'"
                id="mosqueos-login-secret" name="mosqueos-login-secret-field-m9p"
                placeholder=" " autocomplete="off"
                [readonly]="!passwordReady()"
                data-lpignore="true" data-1p-ignore data-bwignore
                (mousedown)="allowPasswordField()"
                (focus)="onPasswordFocus($event)"
                (keydown.enter)="$event.preventDefault(); onLogin()"
                [(ngModel)]="password">
              <label for="mosqueos-login-secret" class="floating-label">Password</label>
              <button type="button" class="pass-toggle" (click)="showPassword.set(!showPassword())" tabindex="-1" aria-label="Toggle password">
                <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <div class="meta-row">
            <label class="remember">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe">
              Remember Me
            </label>
            <div class="forgot-row">
              <a href="#" (click)="$event.preventDefault()">Forgot Password?</a>
            </div>
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
  rememberMe = false;
  submitting = signal(false);
  error = signal<string | null>(null);
  passwordReady = signal(false);
  showPassword = signal(false);
  private passwordFocusAllowed = false;

  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.username = localStorage.getItem('mosqueos_remember_username') || '';
    this.rememberMe = !!this.username;
    this.password = '';
    this.error.set(null);
    this.passwordReady.set(this.rememberMe);
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
      if (this.rememberMe) {
        localStorage.setItem('mosqueos_remember_username', user);
      } else {
        localStorage.removeItem('mosqueos_remember_username');
      }
      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Invalid username or password.');
      this.password = '';
    } finally {
      this.submitting.set(false);
    }
  }
}
