import { Role, User } from '../models';

export interface AuthState {
  /** Access token from the auth server (sent to the APIs), or null when signed out. */
  token: string | null;
  /** OpenID Connect ID token; only needed to sign out at the auth server (id_token_hint). */
  idToken: string | null;
  /** The shop's user record from /api/auth/me; arrives shortly after the token (or after a reload). */
  user: User | null;
  /** A sign-in is in flight (redirect to the auth server, or the code exchange). */
  pending: boolean;
  /** Message of the last failed sign-in, shown on the login and callback pages. */
  error: string | null;
}

/** What the auth server's token endpoint returns (standard OAuth2 field names). */
export interface OAuthTokens {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Kept in sessionStorage while the browser is at the auth server. */
export interface PendingSignIn {
  verifier: string;
  state: string;
  returnUrl: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  exp: number; // seconds since epoch
}

/** Reads the (unverified) payload of a JWT. Only for UI decisions; the servers verify the signature. */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}
