import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ROLES } from '../constants/roles';
import { AdminService } from '../services/admin.service';

/** Mosque Owner routes that require mosque Status === Active (module settings, staff). */
export const activeMosqueRequiredGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const admin = inject(AdminService);
  const router = inject(Router);

  if (!auth.hasRole(ROLES.MosqueOwner)) return true;

  try {
    const res = await firstValueFrom(admin.getOwnerMosque());
    if (res.mosque?.status === 'Active') return true;
  } catch {
    /* redirect below */
  }

  return router.createUrlTree(['/dashboard/owner/verification']);
};
