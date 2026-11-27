import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BACKEND_ORIGIN } from '../config';
import { TokenResponse, User } from '../models';
import { Registration } from './auth.models';

/** The /api/auth HTTP calls. Stateless: the session itself lives in the NgRx store. */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/login', { email, password });
  }

  register(registration: Registration): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/register', registration);
  }

  /** Trades the one-time code from a Google/Facebook login for a JWT. */
  exchangeCode(code: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/exchange', { code });
  }

  /**
   * The signed-in user. Pass a token to use one that isn't in the store yet (right after sign-in);
   * otherwise the interceptor adds the stored one.
   */
  me(token?: string): Observable<User> {
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<User>('/api/auth/me', { headers });
  }

  /** Configured social logins, e.g. ['google', 'facebook']. */
  providers(): Observable<string[]> {
    return this.http.get<string[]>('/api/auth/providers');
  }

  /** Full-page redirect target that starts the Google/Facebook login on the backend. */
  socialLoginUrl(registrationId: string): string {
    return `${BACKEND_ORIGIN}/oauth2/authorization/${registrationId}`;
  }
}
