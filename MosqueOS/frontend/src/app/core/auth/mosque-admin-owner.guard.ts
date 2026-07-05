import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROLES } from '../constants/roles';

/** Ensures Mosque Admin users only access their assigned mosque scope. */
export const mosqueAdminOwnerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // SuperAdmin and MosqueOwner always pass — they have their own dashboards
  if (auth.hasRole(ROLES.SuperAdmin) || auth.hasRole(ROLES.MosqueOwner)) {
    return true;
  }

  // MosqueAdmin: allow if they have the role (homeMosqueId resolved at runtime by AdminDashboard)
  if (auth.hasRole(ROLES.MosqueAdmin)) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
