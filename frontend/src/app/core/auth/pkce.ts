/**
 * Proof Key for Code Exchange (RFC 7636). Before sending the user to the auth server the app makes a random
 * secret (verifier) and sends only its SHA-256 hash (challenge). Only the holder of the verifier can turn the
 * returned code into tokens, so a code stolen from the redirect URL is useless. The random state ties the
 * callback to the request this tab started.
 */
export interface Pkce {
  verifier: string;
  challenge: string;
  state: string;
}

export async function createPkce(): Promise<Pkce> {
  const verifier = base64Url(randomBytes(32));
  return { verifier, challenge: await challengeFor(verifier), state: base64Url(randomBytes(16)) };
}

/** BASE64URL(SHA256(ASCII(verifier))), the "S256" method. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
