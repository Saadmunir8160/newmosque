import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { isValidEmail } from '../../../core/utils/auth-password.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styleUrls: ['../auth-shell.shared.css'],
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

        <div *ngIf="info()" class="error-box" style="background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.35)" role="status">
          <span>{{ info() }}</span>
        </div>

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
                [(ngModel)]="email">
              <label for="mosqueos-login-id" class="floating-label">Email or username</label>
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
              <a routerLink="/auth/forgot-password">Forgot Password?</a>
            </div>
          </div>

          <button type="submit" class="btn-login" [disabled]="submitting()">
            <span *ngIf="submitting()" class="auth-spinner" aria-hidden="true"></span>
            {{ submitting() ? 'Signing in…' : 'Login' }}
          </button>
        </form>

        <p class="auth-footer">
          Don't have an account? <a routerLink="/register">Create Account</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = false;
  submitting = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);
  passwordReady = signal(false);
  showPassword = signal(false);
  private passwordFocusAllowed = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const qEmail = this.route.snapshot.queryParamMap.get('email');
    this.email = qEmail || localStorage.getItem('mosqueos_remember_email') || '';
    this.rememberMe = !!this.email;
    this.password = '';
    this.error.set(null);
    this.passwordReady.set(this.rememberMe);
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.info.set('This email is already registered. Please log in.');
    }
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
    const user = this.email.trim();
    const pass = this.password;
    if (!user) {
      this.error.set('Email or username is required.');
      this.submitting.set(false);
      return;
    }
    if (!pass) {
      this.error.set('Password is required.');
      this.submitting.set(false);
      return;
    }
    try {
      await this.authService.login(user, pass, this.rememberMe);
      if (this.rememberMe) {
        localStorage.setItem('mosqueos_remember_email', user);
      } else {
        localStorage.removeItem('mosqueos_remember_email');
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const home = await this.authService.resolveHomeRoute(returnUrl);
      this.router.navigate([home]);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          const msg = (err.error?.message as string) || 'Invalid email/username or password.';
          this.error.set(msg);
          if (/not verified/i.test(msg) && user.includes('@')) {
            void this.router.navigate(['/verify-otp'], { queryParams: { email: user.toLowerCase() } });
          }
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
