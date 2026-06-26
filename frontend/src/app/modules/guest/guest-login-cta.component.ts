import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-guest-login-cta',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside *ngIf="auth.isGuest()" class="cta" role="note">
      <p>
        <strong>Members only:</strong> register for events, join communities, and track worship progress.
        <a routerLink="/login" class="cta-link">Login</a> or
        <a routerLink="/register" class="cta-link">create an account</a>.
      </p>
    </aside>
  `,
  styles: [`
    .cta {
      margin-bottom: 1rem; padding: 0.75rem 1rem;
      background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.3);
      border-radius: 0.625rem; font-size: 0.8125rem; color: rgba(236,253,245,0.9);
    }
    .cta-link { color: #fcd34d; font-weight: 600; margin-left: 0.25rem; }
  `]
})
export class GuestLoginCtaComponent {
  auth = inject(AuthService);
}
