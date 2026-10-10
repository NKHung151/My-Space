import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { AuthModalService } from '../auth/auth-modal.service';

export type AppRole = 'admin' | 'user' | 'guest';

export function roleGuard(allowed: AppRole[]): CanActivateFn {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const authModalService = inject(AuthModalService);

    const user = authService.currentUser();
    const role: AppRole = user
      ? ((user.role as AppRole) ?? 'user')
      : 'guest';

    if (allowed.includes(role)) return true;

    if (role === 'admin') {
      return router.createUrlTree(['/admin']);
    }

    if (role === 'guest') {
      authModalService.open(state.url);
      if (!router.navigated) {
        return router.createUrlTree(['/']);
      }
      return false;
    }

    return router.createUrlTree(['/']);
  };
}
