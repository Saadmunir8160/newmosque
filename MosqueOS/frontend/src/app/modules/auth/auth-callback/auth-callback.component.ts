import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0F172A;color:#a7f3d0;font-family:system-ui,sans-serif;">
      <div style="text-align:center;padding:2rem;">
        <div *ngIf="!error()" style="width:40px;height:40px;border:3px solid #F8FAFC;border-top-color:#f59e0b;border-radius:50%;margin:0 auto 1rem;animation:spin 0.8s linear infinite;"></div>
        <p style="margin:0;font-size:1rem;">{{ error() || 'Completing sign in...' }}</p>
      </div>
    </div>
  `,
  styles: [`@keyframes spin { to { transform: rotate(360deg); } }`]
})
export class AuthCallbackComponent implements OnInit {
  error = signal<string | null>(null);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const err = params.get('error');
    if (err) {
      this.error.set(this.mapError(err));
      setTimeout(() => this.router.navigate(['/login']), 2500);
      return;
    }

    const token = params.get('token');
    if (!token) {
      this.error.set('Sign in failed. Redirecting...');
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }

    try {
      await this.authService.applyOAuthToken(token);
      const home = await this.authService.resolveHomeRoute();
      this.router.navigate([home]);
    } catch {
      this.error.set('Could not complete sign in. Redirecting...');
      setTimeout(() => this.router.navigate(['/login']), 2500);
    }
  }

  private mapError(code: string): string {
    const map: Record<string, string> = {
      external_failed: 'Social sign in was cancelled or failed.',
      create_failed: 'Could not create your account.',
      link_failed: 'Could not link your social account.',
      user_not_found: 'Account not found after sign in.',
    };
    return map[code] ?? 'Sign in failed. Redirecting...';
  }
}
