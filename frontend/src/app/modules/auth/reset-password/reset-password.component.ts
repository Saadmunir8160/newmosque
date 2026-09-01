import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordStrength, validateRegistrationForm } from '../../../core/utils/auth-password.util';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="card">
        <p class="eyebrow">MosqueOS Security</p>
        <h1>Reset password</h1>
        <p class="sub">Choose a strong new password. All other devices will be signed out.</p>

        <label>Email</label>
        <input type="email" [(ngModel)]="email" />

        <label *ngIf="mode === 'otp'">OTP code</label>
        <input *ngIf="mode === 'otp'" type="text" inputmode="numeric" pattern="[0-9]*"
          maxlength="6" name="one-time-code" autocomplete="one-time-code"
          [(ngModel)]="otp" placeholder="6-digit code" />

        <label>New password</label>
        <input type="password" [(ngModel)]="password" autocomplete="new-password" />
        <p class="hint">Strength: {{ strength().label }}</p>

        <label>Confirm password</label>
        <input type="password" [(ngModel)]="confirmPassword" autocomplete="new-password" />

        <p class="err" *ngIf="error()">{{ error() }}</p>
        <p class="ok" *ngIf="message()">{{ message() }}</p>

        <button type="button" [disabled]="submitting()" (click)="submit()">
          {{ submitting() ? 'Updating…' : 'Update password' }}
        </button>
        <a routerLink="/auth/login" class="btn-back">← Back to login</a>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .page { min-height: 100dvh; display: grid; place-items: center; padding: 1.5rem; background: #0B3D2E; }
    .card {
      width: min(100%, 420px); background: #0F4C3A; border: 1px solid #2B6A55;
      border-radius: 14px; padding: 1.5rem; color: #EAF4EF;
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    }
    .eyebrow { margin: 0; color: #C8A24A; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0.35rem 0; font-size: 1.5rem; font-weight: 700; color: #FFFFFF; }
    .sub, .hint { color: #C9D8D0; font-size: 0.8125rem; line-height: 1.45; }
    label { display: block; margin-top: 0.85rem; font-size: 0.75rem; font-weight: 600; color: #C9D8D0; }
    input {
      width: 100%; margin-top: 0.35rem; padding: 0.65rem 0.75rem; border-radius: 10px;
      border: 1px solid #2B6A55; background: #0B3D2E; color: #fff; font-family: inherit;
      transition: border-color 200ms ease;
    }
    input:focus { outline: none; border-color: #C8A24A; }
    button {
      width: 100%; margin-top: 1.25rem; min-height: 44px; padding: 0.75rem; border: 0; border-radius: 10px;
      background: #C8A24A; color: #0B3D2E; font-family: inherit; font-weight: 700; cursor: pointer;
      transition: background 200ms ease;
    }
    button:hover:not(:disabled) { background: #D4B56A; }
    button:disabled { opacity: 0.6; }
    .err { color: #fecaca; font-size: 0.8125rem; }
    .ok { color: #86efac; font-size: 0.8125rem; }
    .back,
    .btn-back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-top: 0.85rem;
      min-height: 46px;
      padding: 0.8rem 1rem;
      border-radius: 10px;
      border: 1.5px solid #C8A24A;
      background: transparent;
      color: #C8A24A;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 700;
      box-sizing: border-box;
      transition: background 200ms ease, color 200ms ease;
    }
    .back:hover,
    .btn-back:hover {
      background: #C8A24A;
      color: #0B3D2E;
      text-decoration: none;
    }
    .back:hover { color: #D4B56A; text-decoration: underline; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = '';
  token = '';
  otp = '';
  password = '';
  confirmPassword = '';
  mode: 'link' | 'otp' = 'link';
  submitting = signal(false);
  error = signal('');
  message = signal('');
  strength = () => passwordStrength(this.password);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.email = q.get('email') ?? '';
    this.token = q.get('token') ?? '';
    this.mode = q.get('mode') === 'otp' || !this.token ? 'otp' : 'link';
    if (this.token) this.mode = 'link';
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.message.set('');
    const errors = validateRegistrationForm({
      fullName: 'Reset',
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword,
      acceptedTerms: true,
    });
    if (errors['password'] || errors['confirmPassword'] || errors['email']) {
      this.error.set(errors['password'] || errors['confirmPassword'] || errors['email']);
      return;
    }
    if (this.mode === 'otp' && !this.otp.trim()) {
      this.error.set('Enter the OTP from your email.');
      return;
    }
    if (this.mode === 'link' && !this.token.trim()) {
      this.error.set('Reset token is missing. Use the link from your email.');
      return;
    }

    this.submitting.set(true);
    try {
      const res = await this.auth.resetPassword({
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword,
        token: this.mode === 'link' ? this.token : undefined,
        otp: this.mode === 'otp' ? this.otp : undefined,
      });
      this.message.set(res.message);
      setTimeout(() => void this.router.navigate(['/auth/login'], { queryParams: { email: this.email } }), 1200);
    } catch (err) {
      this.error.set(err instanceof HttpErrorResponse
        ? (err.error?.message || err.error?.errors?.join?.(' ') || 'Unable to reset password.')
        : 'Unable to reset password.');
    } finally {
      this.submitting.set(false);
    }
  }
}
