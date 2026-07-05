import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isPlatformAdminGet = req.method === 'GET' && /\/platform\//i.test(req.url);
  const isReservedMosqueRoute = /\/mosques\/(my-mosque|my-mosques|my-claims|submit|slug\/)(?:\?|$|\/)/i.test(req.url)
    || /\/mosque-claims(?:\?|$|\/)/i.test(req.url);

  const isPublicMosqueProfileGet =
    !isPlatformAdminGet &&
    !isReservedMosqueRoute &&
    req.method === 'GET' &&
    (
      /\/mosques\/(slug\/)?[^/]+$/i.test(req.url) ||
      /\/api\/v1\/mosque\/[^/]+$/i.test(req.url)
    ) &&
    !/\/mosques\/\d+(\/|$)/.test(req.url) &&
    !/\/mosque\/\d+(\/|$)/.test(req.url);

  const token = localStorage.getItem('mosque_os_token');
  if (token && !isPublicMosqueProfileGet) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  /** Public profile page — 403 on module/sub-resource GETs must not kick user to /unauthorized. */
  const isPublicMosquePageView = /^\/mosque\/[^/?#]+/i.test(router.url);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const skipRedirect = req.context.get(SKIP_UNAUTHORIZED_REDIRECT);
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      // Only redirect on 403 for dashboard mosque-management reads — not public profile preview.
      if (
        err.status === 403 &&
        !skipRedirect &&
        !isMutation &&
        !isPublicMosquePageView &&
        /\/mosques\b|\/platform\/mosques\b/i.test(req.url)
      ) {
        router.navigate(['/unauthorized']);
      }
      return throwError(() => err);
    })
  );
};
