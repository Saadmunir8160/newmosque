import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email-pending',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .auth-page {
      min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem; background: linear-gradient(165deg, #f8fafc 0%, #eef2f7 45%, #e8f5f1 100%);
    }
    .auth-inner {
      width: min(100%, 480px);
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      padding: 1.75rem 1.5rem;
      text-align: center;
    }
    .icon {
      width: 3rem; height: 3rem; margin: 0 auto 1rem;
      border-radius: 50%;
      background: #ecfdf5; color: #1d6b57;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.35rem;
    }
    h1 { margin: 0 0 0.75rem; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
    .sub { margin: 0 0 0.65rem; font-size: 0.875rem; color: #64748b; line-height: 1.55; }
    .email-chip {
      display: inline-block; margin: 0.5rem 0 1.25rem; padding: 0.35rem 0.85rem;
      border-radius: 999px; background: #f0fdf4;
      border: 1px solid #bbf7d0; color: #166534; font-size: 0.8125rem; font-weight: 600;
    }
    .actions { display: grid; gap: 0.65rem; margin-top: 0.5rem; }
    .btn {
      width: 100%; padding: 0.8rem 1rem; border-radius: 10px;
      font-size: 0.875rem; font-weight: 700; cursor: pointer; text-decoration: none;
      display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;
    }
    .btn--primary {
      border: none; color: #fff;
      background: linear-gradient(180deg, #1d6b57, #0f4c3a);
    }
    .btn--primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .btn--ghost {
      border: 1px solid #cbd5e1; background: #fff; color: #334155;
    }
    .msg { margin-top: 0.75rem; font-size: 0.8125rem; font-weight: 600; color: #047857; }
    .msg--err { color: #b91c1c; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-inner">
        <div class="icon" aria-hidden="true">✉</div>
        <h1>Account created successfully</h1>
        <p class="sub">We've sent a verification email to your inbox.</p>
        <p *ngIf="email()" class="email-chip">{{ email() }}</p>
        <p class="sub">Please verify your email before continuing.</p>

        <div class="actions">
          <button type="button" class="btn btn--primary" (click)="resend()" [disabled]="sending()">
            {{ sending() ? 'Sending…' : 'Resend Verification Email' }}
          </button>
          <a routerLink="/auth/login" class="btn btn--ghost">Back to Login</a>
        </div>
        <p *ngIf="msg()" class="msg" [class.msg--err]="msgErr()">{{ msg() }}</p>
      </div>
    </div>
  `
})
export class VerifyEmailPendingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  email = signal('');
  sending = signal(false);
  msg = signal('');
  msgErr = signal(false);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.email.set(q);
  }

  async resend(): Promise<void> {
    const email = this.email().trim();
    if (!email) {
      this.msg.set('Email address is missing. Return to registration and try again.');
      this.msgErr.set(true);
      return;
    }
    this.sending.set(true);
    this.msg.set('');
    try {
      const res = await this.auth.resendVerification(email);
      this.msg.set(res.message);
      this.msgErr.set(false);
    } catch {
      this.msg.set('Could not send verification email. Try again later.');
      this.msgErr.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}
