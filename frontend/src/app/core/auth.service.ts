import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { BACKEND_ORIGIN } from './config';
import { Role, TokenResponse, User } from './models';

const TOKEN_KEY = 'eshop.token';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  exp: number; // seconds since epoch
}

/** Reads the (unverified) payload of a JWT. Only for UI decisions; the server verifies the signature. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(payload: JwtPayload | null): boolean {
  return !payload || payload.exp * 1000 <= Date.now();
}

/**
 * Holds the signed-in user's JWT and profile.
 * The token is kept in sessionStorage, so it survives a page reload but not closing the tab.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenState = signal<string | null>(AuthService.restoreToken());
  private readonly payload = computed(() => {
    const token = this.tokenState();
    return token ? decodeJwt(token) : null;
  });

  /** The raw JWT, or null when signed out. */
  readonly token = this.tokenState.asReadonly();
  /** Full user record from /api/auth/me (loaded after login). */
  readonly user = signal<User | null>(null);

  readonly isLoggedIn = computed(() => !isExpired(this.payload()));
  readonly role = computed<Role | null>(() => (this.isLoggedIn() ? this.payload()!.role : null));
  readonly isAdmin = computed(() => this.role() === 'ADMIN');
  readonly email = computed(() => this.user()?.email ?? this.payload()?.email ?? null);

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<TokenResponse>('/api/auth/login', { email, password })
      .pipe(switchMap((t) => this.acceptToken(t)));
  }

  register(body: { email: string; password: string; firstName: string; lastName: string }): Observable<User> {
    return this.http.post<TokenResponse>('/api/auth/register', body).pipe(switchMap((t) => this.acceptToken(t)));
  }

  /** Trades the one-time code from a Google/Facebook login for a JWT. */
  exchangeCode(code: string): Observable<User> {
    return this.http.post<TokenResponse>('/api/auth/exchange', { code }).pipe(switchMap((t) => this.acceptToken(t)));
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>('/api/auth/me').pipe(tap((u) => this.user.set(u)));
  }

  /** Configured social logins, e.g. ['google', 'facebook']. */
  providers(): Observable<string[]> {
    return this.http.get<string[]>('/api/auth/providers');
  }

  /** Full-page redirect target that starts the Google/Facebook login on the backend. */
  socialLoginUrl(registrationId: string): string {
    return `${BACKEND_ORIGIN}/oauth2/authorization/${registrationId}`;
  }

  logout(): void {
    this.tokenState.set(null);
    this.user.set(null);
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage unavailable: nothing to clear
    }
  }

  private acceptToken(t: TokenResponse): Observable<User> {
    this.tokenState.set(t.accessToken);
    try {
      sessionStorage.setItem(TOKEN_KEY, t.accessToken);
    } catch {
      // storage unavailable: the session just won't survive a reload
    }
    return this.loadCurrentUser();
  }

  private static restoreToken(): string | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      return token && !isExpired(decodeJwt(token)) ? token : null;
    } catch {
      return null;
    }
  }
}
