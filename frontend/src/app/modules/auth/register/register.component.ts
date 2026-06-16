import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .auth-page {
      min-height: 100dvh;
      position: relative;
      overflow-x: hidden;
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: pageFade 0.7s ease both;
    }
    @keyframes pageFade { from { opacity: 0; } to { opacity: 1; } }

    .bg-image {
      position: fixed; inset: 0; width: 100%; height: 100%;
      object-fit: cover; filter: blur(2px) brightness(0.45) saturate(0.85); z-index: 0;
      transform: scale(1.05);
    }
    .bg-overlay {
      position: fixed; inset: 0; z-index: 1;
      background:
        linear-gradient(105deg, rgba(2,44,34,0.92) 0%, rgba(2,44,34,0.75) 45%, rgba(6,78,59,0.55) 100%);
    }
    .pattern-right {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(28vw, 220px); z-index: 1;
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
      position: fixed; inset: 0; z-index: 1;
      background: radial-gradient(ellipse at center, transparent 35%, rgba(2,44,34,0.65) 100%);
      pointer-events: none;
    }

    .float-shape {
      position: fixed; z-index: 1; pointer-events: none;
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
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 2;
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
      margin: 0.5rem 0;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 1.25rem;
      padding: 1.35rem 1.35rem 1.25rem;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
      animation: cardRise 0.6s ease both;
    }
    @media (min-width: 640px) { .auth-inner { padding: 1.65rem 1.65rem 1.4rem; } }
    @keyframes cardRise {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .moon-wrap {
      width: 2.25rem; height: 2.25rem; border-radius: 999px;
      background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.4);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem;
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
      margin: 0.45rem 0 1rem; text-align: center;
      color: rgba(167,243,208,0.85); font-size: 0.8125rem; line-height: 1.45;
    }

    .error-box {
      display: flex; align-items: flex-start; gap: 0.5rem;
      margin-bottom: 0.875rem; padding: 0.625rem 0.75rem;
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

    .field { margin-bottom: 0.75rem; }
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

    .btn-signup {
      width: 100%; margin-top: 0.375rem;
      border: 1px solid rgba(212,175,55,0.45);
      cursor: pointer; border-radius: 0.75rem;
      padding: 0.875rem 1rem; color: #fff;
      font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.02em;
      background: linear-gradient(180deg, rgba(6,78,59,0.95) 0%, rgba(2,44,34,0.98) 100%);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s;
    }
    .btn-signup:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(212,175,55,0.65);
      box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(212,175,55,0.12);
    }
    .btn-signup:active:not(:disabled) { transform: translateY(0); }
    .btn-signup:disabled { opacity: 0.55; cursor: not-allowed; }

    .auth-footer {
      margin: 1rem 0 0; text-align: center;
      color: rgba(209,250,229,0.85); font-size: 0.8125rem;
    }
    .auth-footer a {
      color: #D4AF37; font-weight: 700; text-decoration: underline;
      text-underline-offset: 2px;
    }
    .auth-footer a:hover { color: #fcd34d; }

    .pass-mask { -webkit-text-security: disc; text-security: disc; }

    @media (max-width: 480px) {
      .pattern-right { width: 60px; }
      .brand-seal { width: 2.75rem; height: 2.75rem; font-size: 0.35rem; }
      .float-shape { opacity: 0.5; }
      .field { margin-bottom: 0.65rem; }
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
          Join
          <span class="auth-title-gold">MosqueOS</span>
        </h1>
        <p class="auth-sub">Create your account and connect with your mosque</p>

        <div *ngIf="error()" class="error-box" role="alert">
          <span class="error-icon">!</span>
          <span>{{ error() }}</span>
        </div>

        <form autocomplete="off" (ngSubmit)="onRegister()">
          <div class="field">
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()"
                type="text" id="reg-fullname" name="fullName"
                placeholder=" " autocomplete="off"
                [(ngModel)]="fullName">
              <label for="reg-fullname" class="floating-label">Full Name</label>
            </div>
          </div>

          <div class="field">
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm-7 9v-1c0-2.21 4.48-4 7-4s7 1.79 7 4v1H5z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()"
                type="text" id="reg-username" name="username"
                placeholder=" " autocomplete="off" autocapitalize="off" spellcheck="false"
                [(ngModel)]="username">
              <label for="reg-username" class="floating-label">Username</label>
            </div>
          </div>

          <div class="field">
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()"
                type="email" id="reg-email" name="email"
                placeholder=" " autocomplete="off"
                [(ngModel)]="email">
              <label for="reg-email" class="floating-label">Email Address</label>
            </div>
          </div>

          <div class="field">
            <div class="pass-row">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()" [class.pass-mask]="!showPassword()"
                type="text" id="reg-password" name="password"
                placeholder=" " autocomplete="new-password"
                [(ngModel)]="password">
              <label for="reg-password" class="floating-label">Password</label>
              <button type="button" class="pass-toggle" (click)="showPassword.set(!showPassword())" tabindex="-1" aria-label="Toggle password">
                <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <div class="field">
            <div class="pass-row">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </span>
              <input class="input-wrap" [class.input-wrap--error]="!!error()" [class.pass-mask]="!showConfirmPassword()"
                type="text" id="reg-confirm" name="confirmPassword"
                placeholder=" " autocomplete="new-password"
                [(ngModel)]="confirmPassword">
              <label for="reg-confirm" class="floating-label">Confirm Password</label>
              <button type="button" class="pass-toggle" (click)="showConfirmPassword.set(!showConfirmPassword())" tabindex="-1" aria-label="Toggle confirm password">
                <svg *ngIf="!showConfirmPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showConfirmPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-signup" [disabled]="submitting()">
            {{ submitting() ? 'Creating account…' : 'Sign Up' }}
          </button>
        </form>

        <p class="auth-footer">
          Already have an account? <a routerLink="/login">Login Now</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  fullName = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  private authService = inject(AuthService);
  private router = inject(Router);

  async onRegister(): Promise<void> {
    this.error.set(null);
    if (!this.fullName.trim() || !this.username.trim() || !this.email.trim() || !this.password) {
      this.error.set('Please fill in all fields.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.submitting.set(true);
    try {
      await this.authService.register({
        username: this.username.trim(),
        email: this.email.trim(),
        fullName: this.fullName.trim(),
        password: this.password
      });
      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set('Registration failed. Username may already exist.');
    } finally {
      this.submitting.set(false);
    }
  }
}
