import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { routes } from './app.routes';

const initializeAuthentication = (authService: AuthService) => () => {
  // Tối ưu hóa: Chỉ gọi API /refresh khi người dùng đã có thông tin trong localStorage
  // Nếu là khách (Chưa đăng nhập), bỏ qua bước này để App load nhanh gấp đôi!
  if (authService.currentUser()) {
    return firstValueFrom(authService.restoreSession());
  }
  return Promise.resolve();
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthentication,
      deps: [AuthService],
      multi: true,
    },
  ]
};
