import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows authenticated users or guests into the dashboard shell. */
export const dashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() || auth.isGuest()) return true;
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
