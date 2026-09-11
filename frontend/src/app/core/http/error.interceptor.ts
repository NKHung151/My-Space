import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred!';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.error && error.error.meta && error.error.meta.error) {
          errorMessage = error.error.meta.error.message || errorMessage;
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      const isExpectedAnonymousSession =
        error.status === 401 && req.url.endsWith('/auth/refresh');
      if (!isExpectedAnonymousSession) {
        console.error('API Error:', errorMessage);
      }
      return throwError(() => error);
    })
  );
};
