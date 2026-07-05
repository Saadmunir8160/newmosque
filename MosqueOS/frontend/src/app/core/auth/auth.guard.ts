import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows authenticated users, guests, or direct public guest URLs into the dashboard shell. */
export const dashboardGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() || auth.isGuest()) return true;
  if (state.url.startsWith('/dashboard/guest')) return true;
  return router.createUrlTree(['/login']);
};

/** Requires a logged-in user; guests are sent back to the public dashboard. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  if (auth.isGuest()) return router.createUrlTree(['/dashboard']);
  return router.createUrlTree(['/login']);
};
