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
      min-height: 100dvh; display: flex; flex-direction: column;
      padding: 1.5rem 1rem 1.5rem;
      padding-top: max(1.5rem, env(safe-area-inset-top));
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
      position: relative; overflow: hidden;
    }
    @media (min-width: 640px) {
      .auth-page {
        padding: 2.5rem 1.5rem 2rem;
        padding-top: max(2.5rem, env(safe-area-inset-top));
      }
    }
    .bg-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
    .bg-overlay { position: absolute; inset: 0; background: rgba(6, 78, 59, 0.88); z-index: 1; }
    .auth-inner { position: relative; z-index: 2; width: 100%; max-width: 400px; margin: 0 auto; flex: 1; display: flex; flex-direction: column; }
    .auth-title {
      color: #fff; font-size: clamp(1.35rem, 5vw, 1.65rem); font-weight: 800; line-height: 1.25;
      margin: 0 0 1.5rem; letter-spacing: -0.02em;
    }
    @media (min-width: 640px) { .auth-title { margin-bottom: 2rem; } }
    .field { margin-bottom: 1rem; }
    .field-label { display: block; font-size: 0.8rem; font-weight: 600; color: #a7f3d0; margin-bottom: 6px; }
    .input-wrap {
      width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.08);
      border: 1.5px solid rgba(167,243,208,0.35); border-radius: 12px;
      padding: 14px 16px; font-size: 15px; color: #f8fafc; outline: none;
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
    .btn-signup {
      width: 100%; padding: 15px; border-radius: 14px; border: none; cursor: pointer; margin-top: 0.5rem;
      background: #fff; color: #022c22; font-size: 1rem; font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18); transition: transform 0.15s, opacity 0.2s;
    }
    .btn-signup:hover:not(:disabled) { transform: translateY(-1px); }
    .btn-signup:disabled { opacity: 0.65; cursor: not-allowed; }
    .auth-footer {
      margin-top: auto; padding-top: 2rem; text-align: center;
      color: #6ee7b7; font-size: 0.9rem;
    }
    .auth-footer a { color: #fff; font-weight: 700; text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }
    .error-box {
      background: rgba(127,29,29,0.35); border: 1px solid #991b1b; color: #fecaca;
      padding: 10px 12px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 1rem;
    }
    .pass-mask { -webkit-text-security: disc; text-security: disc; }
  `],
  template: `
    <div class="auth-page">
      <img class="bg-image" src="https://images.unsplash.com/photo-1585036156171-384164a8c675?auto=format&fit=crop&q=85&w=1200" alt="">
      <div class="bg-overlay"></div>
      <div class="auth-inner">
        <h1 class="auth-title">Join MosqueOS<br>Connect with your mosque</h1>

        <div *ngIf="error()" class="error-box">{{ error() }}</div>

        <form (ngSubmit)="onRegister()">
          <div class="field">
            <label class="field-label">Full Name</label>
            <input class="input-wrap" placeholder="Enter your full name" autocomplete="off" [(ngModel)]="fullName" name="fullName">
          </div>
          <div class="field">
            <label class="field-label">Username</label>
            <input class="input-wrap" placeholder="Choose a username" autocomplete="off" [(ngModel)]="username" name="username">
          </div>
          <div class="field">
            <label class="field-label">Email Address</label>
            <input class="input-wrap" type="email" placeholder="Enter your email" autocomplete="off" [(ngModel)]="email" name="email">
          </div>
          <div class="field">
            <label class="field-label">Password</label>
            <div class="pass-row">
              <input class="input-wrap" [class.pass-mask]="!showPassword()" type="text"
                placeholder="Create a password" autocomplete="new-password"
                [(ngModel)]="password" name="password">
              <button type="button" class="pass-toggle" (click)="showPassword.set(!showPassword())" tabindex="-1">
                <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Confirm Password</label>
            <input class="input-wrap pass-mask" type="text" placeholder="Confirm your password"
              autocomplete="new-password" [(ngModel)]="confirmPassword" name="confirmPassword">
          </div>

          <button type="submit" class="btn-signup" [disabled]="submitting()">
            {{ submitting() ? 'Creating...' : 'Sign Up' }}
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
