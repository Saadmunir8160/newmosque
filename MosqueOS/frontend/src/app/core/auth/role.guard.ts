import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

import { homeRouteForRoles } from '../config/nav.config';



export const roleGuard = (roles: string[]): CanActivateFn => () => {

  const auth = inject(AuthService);

  const router = inject(Router);

  if (roles.some(r => auth.hasRole(r))) return true;

  if (auth.isGuest()) return router.createUrlTree(['/dashboard']);

  return router.createUrlTree([homeRouteForRoles(auth.roles())]);

};


