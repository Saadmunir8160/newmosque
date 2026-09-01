import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { isValidEmail } from '../../../core/utils/auth-password.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="card">
        <p class="eyebrow">MosqueOS Security</p>
        <h1>Forgot password</h1>
        <p class="sub">Enter your account email. We will send a secure reset link (or OTP).</p>

        <form (ngSubmit)="submit()">
          <label class="field-label" for="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            name="email"
            [(ngModel)]="email"
            autocomplete="email"
            placeholder=""
            [disabled]="submitting()" />

          <label class="check">
            <input type="checkbox" name="preferOtp" [(ngModel)]="preferOtp" [disabled]="submitting()" />
            <span>Send 6-digit OTP instead of email link</span>
          </label>

          <p class="err" *ngIf="error()" role="alert">{{ error() }}</p>
          <p class="ok" *ngIf="message()" role="status">{{ message() }}</p>

          <button type="submit" class="btn-primary" [disabled]="submitting()">
            {{ submitting() ? 'Sending…' : 'Send reset instructions' }}
          </button>
        </form>

        <a routerLink="/auth/login" class="btn-back" (click)="goLogin($event)">← Back to login</a>

        <a
          *ngIf="preferOtp && message()"
          routerLink="/auth/reset-password"
          [queryParams]="{ email: email, mode: 'otp' }"
          class="next">
          Enter OTP →
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
    }

    .page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: #0B3D2E;
    }

    .card {
      width: min(100%, 420px);
      background: #0F4C3A;
      border: 1px solid #2B6A55;
      border-radius: 14px;
      padding: 1.75rem 1.5rem 1.5rem;
      color: #FFFFFF;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
    }

    .eyebrow {
      margin: 0;
      color: #C8A24A;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0.4rem 0 0.35rem;
      font-size: 1.65rem;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 0 0 0.25rem;
      color: #FFFFFF;
      font-size: 0.9rem;
      line-height: 1.5;
      opacity: 0.92;
    }

    .field-label {
      display: block;
      margin-top: 1.25rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #C8A24A;
    }

    input[type='email'] {
      display: block;
      width: 100%;
      margin-top: 0.4rem;
      padding: 0.7rem 0.85rem;
      border-radius: 10px;
      border: 1px solid #2B6A55;
      background: #0B3D2E;
      color: #FFFFFF;
      font-family: inherit;
      font-size: 0.95rem;
      transition: border-color 200ms ease;
      box-sizing: border-box;
    }

    input[type='email']:focus {
      outline: none;
      border-color: #C8A24A;
    }

    input[type='email']:disabled {
      opacity: 0.7;
    }

    .check {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      margin-top: 1rem;
      font-weight: 500;
      font-size: 0.875rem;
      color: #FFFFFF;
      cursor: pointer;
      line-height: 1.4;
    }

    .check input {
      margin-top: 0.15rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      accent-color: #C8A24A;
      cursor: pointer;
    }

    .btn-primary {
      display: block;
      width: 100%;
      margin-top: 1.35rem;
      min-height: 46px;
      padding: 0.8rem 1rem;
      border: 0;
      border-radius: 10px;
      background: #C8A24A;
      color: #0B3D2E;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 200ms ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: #D4B56A;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .err {
      margin: 0.75rem 0 0;
      color: #fecaca;
      font-size: 0.8125rem;
    }

    .ok {
      margin: 0.75rem 0 0;
      color: #86efac;
      font-size: 0.8125rem;
    }

    .back,
    .btn-back {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.85rem;
      min-height: 46px;
      padding: 0.8rem 1rem;
      border-radius: 10px;
      border: 1.5px solid #C8A24A;
      background: transparent;
      color: #C8A24A;
      text-decoration: none;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      box-sizing: border-box;
      cursor: pointer;
      transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
    }

    .back:hover,
    .btn-back:hover {
      background: #C8A24A;
      color: #0B3D2E;
      text-decoration: none;
      border-color: #C8A24A;
    }

    .back:focus-visible,
    .btn-back:focus-visible {
      outline: 2px solid #D4B56A;
      outline-offset: 2px;
    }

    .next {
      display: inline-flex;
      margin-top: 0.75rem;
      margin-left: 1rem;
      color: #86efac;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .next:hover {
      text-decoration: underline;
    }
  `],
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  preferOtp = false;
  submitting = signal(false);
  error = signal('');
  message = signal('');

  goLogin(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl('/auth/login');
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.message.set('');
    if (!isValidEmail(this.email)) {
      this.error.set('Enter a valid email address.');
      return;
    }
    this.submitting.set(true);
    try {
      const res = await this.auth.forgotPassword(this.email, this.preferOtp);
      this.message.set(res.message);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Unable to send reset instructions.'
          : 'Unable to send reset instructions.'
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
