import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTH_SERVER, CLIENT_ID, SCOPES } from '../config';
import { User } from '../models';
import { OAuthTokens } from './auth.models';
import { Pkce, createPkce } from './pkce';

/**
 * Talks to cloud/auth-server (standard OAuth2 / OpenID Connect endpoints) and to the shop's /api/auth/me.
 * Stateless: the session itself lives in the NgRx store. Browser navigation goes through here too,
 * so the effects can be tested without leaving the page.
 */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  createPkce(): Promise<Pkce> {
    return createPkce();
  }

  /**
   * Where the auth server sends the browser back to; registered for the eshop-web client.
   * Resolved against <base href>, so it works both at the dev server's root (http://localhost:4200/auth/callback)
   * and when the backend serves the app under /eshop/ (http://localhost:8080/eshop/auth/callback).
   */
  redirectUri(): string {
    return new URL('auth/callback', this.document.baseURI).href;
  }

  /** The app's root URL (its <base href>): where sign-out comes back to. */
  appUrl(): string {
    return new URL('.', this.document.baseURI).href;
  }

  /** The auth server's sign-in page, as an Authorization Code + PKCE request. */
  authorizeUrl(pkce: Pkce): string {
    const params = new HttpParams({
      fromObject: {
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: this.redirectUri(),
        scope: SCOPES,
        state: pkce.state,
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      },
    });
    return `${AUTH_SERVER}/oauth2/authorize?${params.toString()}`;
  }

  /** Code + verifier -> tokens. A public client: no secret, the verifier proves it started the request. */
  exchangeCode(code: string, verifier: string): Observable<OAuthTokens> {
    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri(),
        client_id: CLIENT_ID,
        code_verifier: verifier,
      },
    });
    return this.http.post<OAuthTokens>(`${AUTH_SERVER}/oauth2/token`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    });
  }

  /**
   * The shop's record of the signed-in user (created on the first call). Pass a token that isn't in the store
   * yet (right after sign-in); otherwise the interceptor adds the stored one.
   */
  me(token?: string): Observable<User> {
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get<User>('/api/auth/me', { headers });
  }

  /** OpenID Connect RP-initiated logout: ends the auth server's session too, then comes back to the shop. */
  logoutUrl(idToken: string): string {
    const params = new HttpParams({
      fromObject: { id_token_hint: idToken, post_logout_redirect_uri: this.appUrl() },
    });
    return `${AUTH_SERVER}/connect/logout?${params.toString()}`;
  }

  /** Full-page navigation (leaves the Angular app). */
  redirect(url: string): void {
    this.document.location.assign(url);
  }
}
