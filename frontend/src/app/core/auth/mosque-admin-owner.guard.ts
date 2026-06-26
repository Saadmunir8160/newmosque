import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { AdminService } from '../services/admin.service';
import { ROLES } from '../constants/roles';

/** Ensures Mosque Admin users only access mosques they own (OwnerId match). */
export const mosqueAdminOwnerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const admin = inject(AdminService);
  const router = inject(Router);

  if (!auth.isAuthenticated() || !auth.hasRole(ROLES.MosqueAdmin)) {
    return router.createUrlTree(['/auth/login']);
  }

  return admin.getOwnerMosque().pipe(
    map(res => {
      const userId = auth.user()?.id;
      if (res.mosque && userId && res.mosque.ownerId === userId) return true;
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};
