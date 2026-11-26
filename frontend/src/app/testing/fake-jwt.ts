import { Role } from '../core/models';

const b64url = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Builds an unsigned JWT with the claims the app reads. Good enough for the UI, which never verifies signatures. */
export function fakeJwt(claims: { sub?: string; email?: string; role?: Role; expiresInSec?: number } = {}): string {
  const payload = {
    sub: claims.sub ?? '1',
    email: claims.email ?? 'dana@example.com',
    role: claims.role ?? 'USER',
    exp: Math.floor(Date.now() / 1000) + (claims.expiresInSec ?? 3600),
  };
  return `${b64url({ alg: 'HS256' })}.${b64url(payload)}.signature`;
}
