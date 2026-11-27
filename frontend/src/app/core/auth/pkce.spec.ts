import { challengeFor, createPkce } from './pkce';

describe('PKCE', () => {
  it('derives the S256 challenge exactly as RFC 7636 (appendix B) does', async () => {
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('makes a fresh, URL-safe verifier and state every time', async () => {
    const a = await createPkce();
    const b = await createPkce();

    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url, no padding
    expect(a.state).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.state).not.toBe(b.state);
    expect(a.challenge).toBe(await challengeFor(a.verifier));
  });
});
