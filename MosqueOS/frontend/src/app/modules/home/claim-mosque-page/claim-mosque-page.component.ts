import { Component, Injector, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-claim-mosque-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="claim-gate" role="status">
      <span class="claim-gate__pulse" aria-hidden="true"></span>
      <p>{{ message }}</p>
    </div>
  `,
  styles: [`
    .claim-gate {
      min-height: 50vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: #64748B;
      font-size: 0.9375rem;
    }
    .claim-gate__pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #D4AF37;
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 50% { opacity: 0.35; } }
  `],
})
export class ClaimMosquePageComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private injector = inject(Injector);

  message = 'Preparing claim workflow…';

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug')?.trim();
    if (!slug) {
      void this.router.navigate(['/']);
      return;
    }

    if (this.auth.loading()) {
      await firstValueFrom(
        toObservable(this.auth.loading, { injector: this.injector }).pipe(
          filter(loading => !loading),
          take(1),
        ),
      );
    }

    if (this.auth.isGuest() || !this.auth.isAuthenticated()) {
      this.message = 'Redirecting to login…';
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/claim-mosque/${slug}` },
      });
      return;
    }

    if (this.auth.user()?.emailConfirmed === false) {
      this.message = 'Please verify your email…';
      void this.router.navigate(['/verify-email-pending'], {
        queryParams: { email: this.auth.user()?.email ?? '' },
      });
      return;
    }

    void this.router.navigate(['/mosque', slug, 'claim'], { replaceUrl: true });
  }
}
