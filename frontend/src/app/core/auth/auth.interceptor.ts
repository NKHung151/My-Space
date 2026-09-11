import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthModalService } from './auth-modal.service';

const isPublicAuthRequest = (url: string): boolean =>
  [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some(path => url.endsWith(path));

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const authModalService = inject(AuthModalService);
  const accessToken = authService.getToken();
  const authenticatedRequest = accessToken && !isPublicAuthRequest(request.url)
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRefresh =
        error.status === 401 &&
        !isPublicAuthRequest(request.url);

      if (!canRefresh) {
        if (error.status === 401 && !isPublicAuthRequest(request.url)) {
          authModalService.open();
        }
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap(session =>
          next(request.clone({
            setHeaders: { Authorization: `Bearer ${session.accessToken}` },
          })),
        ),
        catchError(refreshError => {
          authService.expireSession();
          authModalService.open();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
