import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows guest module access without login; auto-enters guest mode for public URLs. */
export const guestPublicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated() && !auth.isGuest()) {
    auth.enterGuestMode();
  }
  return true;
};
