import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .auth-page {
      min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      padding: 1.25rem; background: linear-gradient(165deg, #022c22 0%, #064e3b 100%);
    }
    .auth-inner {
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(212,175,55,0.28);
      border-radius: 1.25rem;
      padding: 1.65rem;
      color: #ecfdf5;
      text-align: center;
    }
    .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.35rem; color: #fff; }
    .sub { margin: 0 0 1rem; font-size: 0.875rem; color: rgba(167,243,208,0.85); line-height: 1.5; }
    .spinner {
      width: 2rem; height: 2rem; margin: 0 auto 1rem;
      border-radius: 999px; border: 2px solid rgba(212,175,55,0.25);
      border-top-color: #D4AF37; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .msg--ok { color: #6ee7b7; }
    .msg--err { color: #fca5a5; }
    .btn-link {
      display: inline-block; margin-top: 1rem; padding: 0.75rem 1.25rem;
      border-radius: 0.75rem; background: #D4AF37; color: #022c22;
      font-weight: 700; text-decoration: none;
    }
    .footer { margin-top: 1rem; font-size: 0.8125rem; }
    .footer a { color: #D4AF37; font-weight: 700; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-inner">
        <div *ngIf="loading()" class="spinner" aria-hidden="true"></div>
        <div *ngIf="!loading() && success()" class="icon" aria-hidden="true">✅</div>
        <div *ngIf="!loading() && !success()" class="icon" aria-hidden="true">⚠️</div>

        <h1>{{ title() }}</h1>
        <p class="sub" [class.msg--ok]="success()" [class.msg--err]="!loading() && !success()">{{ message() }}</p>

        <a *ngIf="!loading() && success()" routerLink="/login" class="btn-link">Log in</a>
        <p *ngIf="!loading() && !success()" class="footer">
          <a routerLink="/verify-email-pending">Resend verification email</a>
          · <a routerLink="/login">Back to login</a>
        </p>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  loading = signal(true);
  success = signal(false);
  title = signal('Verifying email…');
  message = signal('Please wait while we confirm your email address.');

  ngOnInit(): void {
    const userId = this.route.snapshot.queryParamMap.get('userId');
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!userId || !token) {
      this.loading.set(false);
      this.success.set(false);
      this.title.set('Invalid link');
      this.message.set('Invalid or expired verification link.');
      return;
    }
    this.confirm(userId, token);
  }

  private async confirm(userId: string, token: string): Promise<void> {
    try {
      const res = await this.auth.confirmEmail(userId, token);
      this.success.set(true);
      this.title.set('Email verified');
      this.message.set(res.message || 'Email verified successfully. You can now log in.');
    } catch (e: unknown) {
      this.success.set(false);
      this.title.set('Verification failed');
      const err = e as { error?: { message?: string } };
      this.message.set(err.error?.message || 'Invalid or expired verification link.');
    } finally {
      this.loading.set(false);
    }
  }
}
