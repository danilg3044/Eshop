import { Role, User } from '../models';

export interface AuthState {
  /** The app's JWT, or null when signed out. */
  token: string | null;
  /** Full user record from /api/auth/me; arrives shortly after the token (or after a reload). */
  user: User | null;
  /** A login / register / code exchange is in flight. */
  pending: boolean;
  /** Message of the last failed sign-in, shown on the auth pages. */
  error: string | null;
}

export interface Registration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface JwtPayload {
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
