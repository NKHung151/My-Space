import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { ApiResponse } from '../http/api-response.model';
import {
  AuthMessage,
  AuthSession,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './auth.model';
import { CurrentUser } from './current-user.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userInfoKey = 'user_info';
  private accessToken: string | null = null;
  private refreshRequest$?: Observable<AuthSession>;
  
  private readonly currentUserSignal: WritableSignal<CurrentUser | null> = signal(null);
  readonly currentUser = this.currentUserSignal.asReadonly();

  constructor(
    private http: HttpClient
  ) {
    // Remove tokens persisted by older versions. Authentication secrets now live
    // only in memory (access token) and an HttpOnly cookie (refresh token).
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<AuthSession> {
    return this.http.post<ApiResponse<AuthSession>>(
      `${this.apiUrl}/login`,
      credentials,
      { withCredentials: true },
    )
      .pipe(
        map(response => response.data),
        tap(session => {
          if (session?.accessToken) {
            this.setSession(session);
          }
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthSession> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.apiUrl}/register`, userData).pipe(
      map(response => response.data),
      tap(session => {
        if (session?.accessToken) {
          this.setSession(session);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<AuthMessage> {
    const payload: ForgotPasswordRequest = { email };

    return this.http.post<ApiResponse<AuthMessage>>(
      `${this.apiUrl}/forgot-password`,
      payload,
    ).pipe(map(response => response.data));
  }

  resetPassword(payload: ResetPasswordRequest): Observable<AuthMessage> {
    return this.http.post<ApiResponse<AuthMessage>>(
      `${this.apiUrl}/reset-password`,
      payload,
      { withCredentials: true },
    ).pipe(
      map(response => response.data),
      tap(() => this.clearSession())
    );
  }

  getMe(): Observable<CurrentUser> {
    return this.http.get<ApiResponse<CurrentUser>>(`${this.apiUrl}/me`).pipe(
      map(response => response.data),
      tap(user => this.storeCurrentUser(user)),
    );
  }

  updateProfile(payload: {
    displayName: string;
    username: string;
    bio: string;
    avatarMediaId?: string;
    accentColor?: string;
  }): Observable<CurrentUser> {
    return this.http.patch<ApiResponse<CurrentUser>>(`${this.apiUrl}/me`, payload).pipe(
      map(response => response.data),
      tap(user => this.storeCurrentUser(user)),
    );
  }

  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http
      .post<ApiResponse<{ message: string }>>(
        `${this.apiUrl}/change-password`,
        payload,
        { withCredentials: true },
      )
      .pipe(
        map(response => response.data),
        tap(() => this.clearSession()),
      );
  }

  refreshSession(): Observable<AuthSession> {
    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<ApiResponse<AuthSession>>(
          `${this.apiUrl}/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          map(response => response.data),
          tap(session => this.setSession(session)),
          finalize(() => {
            this.refreshRequest$ = undefined;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshRequest$;
  }

  restoreSession(): Observable<void> {
    return this.refreshSession().pipe(
      map((): void => undefined),
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
    );
  }

  logout(): Observable<void> {
    const request$ = this.http.post<unknown>(
      `${this.apiUrl}/logout`,
      {},
      { withCredentials: true },
    );

    return request$.pipe(
      // Local logout must still succeed if the server/session is unavailable.
      catchError(() => of(null)),
      finalize(() => this.clearSession()),
      map((): void => undefined),
    );
  }

  logoutAll(): Observable<void> {
    return this.http.post(
      `${this.apiUrl}/logout-all`,
      {},
      { withCredentials: true },
    ).pipe(
      finalize(() => this.clearSession()),
      map((): void => undefined),
    );
  }

  expireSession(): void {
    this.clearSession();
  }

  private setSession(authResult: AuthSession): void {
    this.accessToken = authResult.accessToken;
    if (authResult.user) {
      this.storeCurrentUser(authResult.user);
    }
  }

  private storeCurrentUser(user: CurrentUser): void {
    localStorage.setItem(this.userInfoKey, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    this.accessToken = null;
    // Keep removing legacy keys so upgrades cannot leave reusable tokens behind.
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userInfoKey);
    this.currentUserSignal.set(null);
  }

  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem(this.userInfoKey);
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as CurrentUser;
        this.currentUserSignal.set(user);
      } catch {
        this.clearSession();
      }
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  getToken(): string | null {
    return this.accessToken;
  }
}
