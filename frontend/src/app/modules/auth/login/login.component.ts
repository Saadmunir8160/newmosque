import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
      padding: 1.25rem;
      animation: pageFade 0.7s ease both;
    }
    @keyframes pageFade { from { opacity: 0; } to { opacity: 1; } }

    .bg-image {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; filter: blur(2px) brightness(0.45) saturate(0.85); z-index: 0;
      transform: scale(1.05);
    }
    .bg-overlay {
      position: absolute; inset: 0; z-index: 1;
      background:
        linear-gradient(105deg, rgba(2,44,34,0.92) 0%, rgba(2,44,34,0.75) 45%, rgba(6,78,59,0.55) 100%);
    }
    .pattern-right {
      position: absolute; top: 0; right: 0; bottom: 0; width: min(28vw, 220px); z-index: 1;
      background:
        repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(212,175,55,0.04) 12px, rgba(212,175,55,0.04) 24px),
        linear-gradient(180deg, rgba(212,175,55,0.08), transparent);
      border-left: 1px solid rgba(212,175,55,0.15);
      opacity: 0.9;
    }
    .pattern-right::before {
      content: 'ﷲ';
      position: absolute; top: 18%; right: 1.25rem;
      font-size: 2.5rem; color: rgba(212,175,55,0.35);
      writing-mode: vertical-rl;
    }
    .vignette {
      position: absolute; inset: 0; z-index: 1;
      background: radial-gradient(ellipse at center, transparent 35%, rgba(2,44,34,0.65) 100%);
      pointer-events: none;
    }

    .float-shape {
      position: absolute; z-index: 1; pointer-events: none;
      border: 1px solid rgba(212,175,55,0.35);
      background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(6,78,59,0.3));
      animation: floatY 6s ease-in-out infinite;
    }
    .float-shape--1 { width: 28px; height: 28px; top: 22%; left: 12%; transform: rotate(45deg); animation-delay: 0s; }
    .float-shape--2 { width: 18px; height: 18px; top: 58%; left: 8%; border-radius: 4px; animation-delay: 1.2s; }
    .float-shape--3 { width: 22px; height: 22px; bottom: 28%; right: 18%; transform: rotate(30deg); animation-delay: 0.6s; }
    .float-shape--4 { width: 14px; height: 14px; top: 35%; right: 28%; border-radius: 50%; background: rgba(212,175,55,0.25); animation-delay: 2s; }
    @keyframes floatY {
      0%, 100% { transform: translateY(0) rotate(45deg); }
      50% { transform: translateY(-10px) rotate(45deg); }
    }

    .brand-seal {
      position: absolute; bottom: 1.5rem; right: 1.5rem; z-index: 2;
      width: 3.5rem; height: 3.5rem; border-radius: 50%;
      border: 2px solid rgba(212,175,55,0.5);
      background: radial-gradient(circle at 30% 30%, rgba(212,175,55,0.25), rgba(2,44,34,0.8));
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-size: 0.45rem; font-weight: 800; color: #D4AF37; letter-spacing: 0.02em;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .brand-seal span { font-size: 0.85rem; line-height: 1; margin-bottom: 1px; }

    .auth-inner {
      position: relative; z-index: 3;
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 1.25rem;
      padding: 1.5rem 1.35rem 1.35rem;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
      animation: cardRise 0.6s ease both;
    }
    @media (min-width: 640px) { .auth-inner { padding: 1.75rem 1.65rem 1.5rem; } }
    @keyframes cardRise {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .moon-wrap {
      width: 2.25rem; height: 2.25rem; border-radius: 999px;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.4);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 0.875rem;
      color: #D4AF37;
      box-shadow: 0 0 20px rgba(212,175,55,0.15);
    }
    .auth-title-line {
      margin: 0; text-align: center; color: #fff;
      font-size: clamp(1.35rem, 4.5vw, 1.75rem); font-weight: 700; line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .auth-title-gold {
      display: block; margin-top: 0.15rem;
      background: linear-gradient(180deg, #fcd34d 0%, #D4AF37 50%, #b8860b 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 800;
    }
    .auth-sub {
      margin: 0.5rem 0 1.25rem; text-align: center;
      color: rgba(167,243,208,0.85); font-size: 0.8125rem; line-height: 1.45;
    }

    .error-box {
      display: flex; align-items: flex-start; gap: 0.5rem;
      margin-bottom: 1rem; padding: 0.625rem 0.75rem;
      border-radius: 0.625rem;
      border: 1px solid rgba(239,68,68,0.55);
      background: rgba(127,29,29,0.28);
      color: #fecaca; font-size: 0.75rem; line-height: 1.4;
      animation: shake 0.4s ease;
    }
    .error-icon {
      flex-shrink: 0; width: 1.125rem; height: 1.125rem; border-radius: 50%;
      background: rgba(239,68,68,0.35); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6875rem; font-weight: 800;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .field { margin-bottom: 0.875rem; }
    .field-wrap, .pass-row { position: relative; }
    .field-icon {
      position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%);
      width: 1.05rem; height: 1.05rem; color: rgba(212,175,55,0.75); pointer-events: none; z-index: 1;
    }
    .input-wrap {
      width: 100%; box-sizing: border-box;
      border-radius: 0.75rem;
      border: 1px solid rgba(212,175,55,0.35);
      background: rgba(2,44,34,0.55);
      color: #f8fafc; font-size: 0.875rem;
      padding: 0.95rem 0.875rem 0.45rem 2.5rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .input-wrap:hover { border-color: rgba(212,175,55,0.5); background: rgba(2,44,34,0.65); }
    .input-wrap:focus {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
      background: rgba(2,44,34,0.72);
    }
    .input-wrap--error {
      border-color: rgba(239,68,68,0.7) !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important;
    }

    .floating-label {
      position: absolute; left: 2.5rem; top: 50%; transform: translateY(-50%);
      font-size: 0.8125rem; color: rgba(209,250,229,0.65);
      pointer-events: none; transition: all 0.18s ease;
    }
    .input-wrap:focus + .floating-label,
    .input-wrap:not(:placeholder-shown) + .floating-label {
      top: 0.42rem; transform: none; font-size: 0.625rem; color: #D4AF37; font-weight: 600;
    }

    .pass-row .input-wrap { padding-right: 2.75rem; }
    .pass-toggle {
      position: absolute; right: 0.625rem; top: 50%; transform: translateY(-50%);
      width: 1.75rem; height: 1.75rem; border-radius: 999px; border: none;
      background: rgba(255,255,255,0.06); color: rgba(212,175,55,0.8);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, color 0.2s;
    }
    .pass-toggle:hover { background: rgba(212,175,55,0.15); color: #fcd34d; }

    .meta-row {
      margin: 0.25rem 0 1.125rem;
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
    }
    .remember {
      display: inline-flex; align-items: center; gap: 0.4rem;
      color: rgba(209,250,229,0.9); font-size: 0.75rem; cursor: pointer;
    }
    .remember input { accent-color: #D4AF37; width: 0.9rem; height: 0.9rem; }
    .forgot-row a {
      color: #D4AF37; font-size: 0.75rem; font-weight: 600; text-decoration: none;
    }
    .forgot-row a:hover { color: #fcd34d; text-decoration: underline; }

    .btn-login {
      width: 100%; border: 1px solid rgba(212,175,55,0.45);
      cursor: pointer; border-radius: 0.75rem;
      padding: 0.875rem 1rem; color: #fff;
      font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.02em;
      background: linear-gradient(180deg, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s;
    }
    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(212,175,55,0.65);
      box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(212,175,55,0.12);
    }
    .btn-login:active:not(:disabled) { transform: translateY(0); }
    .btn-login:disabled { opacity: 0.55; cursor: not-allowed; }

    .auth-footer {
      margin: 1.125rem 0 0; text-align: center;
      color: rgba(209,250,229,0.85); font-size: 0.8125rem;
    }
    .auth-footer a {
      color: #D4AF37; font-weight: 700; text-decoration: underline;
      text-underline-offset: 2px;
    }
    .auth-footer a:hover { color: #fcd34d; }

    .hp-field { position: absolute; left: -9999px; opacity: 0; pointer-events: none; }
    .pass-mask { -webkit-text-security: disc; text-security: disc; }

    @media (max-width: 480px) {
      .pattern-right { width: 60px; }
      .brand-seal { width: 2.75rem; height: 2.75rem; font-size: 0.35rem; }
      .float-shape { opacity: 0.5; }
    }
  `],
  template: `
    <div class="auth-page">
      <img class="bg-image" src="https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&q=85&w=1400" alt="">
      <div class="bg-overlay"></div>
      <div class="pattern-right" aria-hidden="true"></div>
      <div class="vignette"></div>

      <div class="float-shape float-shape--1" aria-hidden="true"></div>
      <div class="float-shape float-shape--2" aria-hidden="true"></div>
      <div class="float-shape float-shape--3" aria-hidden="true"></div>
      <div class="float-shape float-shape--4" aria-hidden="true"></div>

      <div class="brand-seal" aria-hidden="true">
        <span>✦</span>
        MosqueOS
      </div>

      <div class="auth-inner">
        <div class="moon-wrap" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15.5A9.5 9.5 0 1 1 10.5 3 7.5 7.5 0 1 0 21 15.5z"/></svg>
        </div>

        <h1 class="auth-title-line">
          Welcome Back
          <span class="auth-title-gold">to MosqueOS</span>
        </h1>
        <p class="auth-sub">Sign in to manage your mosque operations</p>

        <div *ngIf="error()" class="error-box" role="alert">
          <span class="error-icon">!</span>
          <span>{{ error() }}</span>
        </div>

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
              <input class="input-wrap" [class.input-wrap--error]="!!error()"
                type="text" id="mosqueos-login-id"
                name="mosqueos-login-id-field-x7k" placeholder=" "
                autocomplete="off" autocapitalize="off" spellcheck="false" readonly
                data-lpignore="true" data-1p-ignore data-bwignore
                (focus)="enableInput($event)"
                (keydown.tab)="allowPasswordField()"
                (keydown.enter)="$event.preventDefault()"
                [(ngModel)]="username">
              <label for="mosqueos-login-id" class="floating-label">Mosque ID / Username</label>
            </div>
          </div>

          <div class="field">
            <div class="pass-row">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()" [class.pass-mask]="!showPassword()"
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
                <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
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
            {{ submitting() ? 'Signing in…' : 'Login' }}
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
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          this.error.set('Invalid username or password.');
        } else if (err.status === 0) {
          this.error.set('Cannot reach the server. Start the backend API on http://localhost:5000 and try again.');
        } else {
          this.error.set('Login failed. Please try again in a moment.');
        }
      } else {
        this.error.set('Login failed. Please try again.');
      }
      this.password = '';
    } finally {
      this.submitting.set(false);
    }
  }
}
