import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SKIP_UNAUTHORIZED_REDIRECT } from '../http/http-context.tokens';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
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

  const isAuthRefresh = /\/auth\/(login|register|refresh|forgot-password|reset-password)/i.test(req.url);

  const token = auth.getAccessToken() ?? localStorage.getItem('mosque_os_token');
  if (token && !isPublicMosqueProfileGet) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  const isPublicMosquePageView = /^\/mosque\/[^/?#]+/i.test(router.url);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthRefresh && !req.headers.has('X-Retry-After-Refresh')) {
        return from(auth.tryRefreshToken()).pipe(
          switchMap(ok => {
            if (!ok) {
              auth.logout();
              return throwError(() => err);
            }
            const nextToken = auth.getAccessToken();
            const retry = req.clone({
              setHeaders: {
                Authorization: `Bearer ${nextToken}`,
                'X-Retry-After-Refresh': '1',
              },
            });
            return next(retry);
          })
        );
      }

      const skipRedirect = req.context.get(SKIP_UNAUTHORIZED_REDIRECT);
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (
        err.status === 403 &&
        !skipRedirect &&
        !isMutation &&
        !isPublicMosquePageView &&
        /\/mosques\b|\/platform\/mosques\b/i.test(req.url)
      ) {
        void router.navigate(['/unauthorized']);
      }
      return throwError(() => err);
    })
  );
};
