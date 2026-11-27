/**
 * cloud/auth-server: the OpenID Connect provider the app signs in with (Authorization Code + PKCE).
 * The browser goes there for sign-in, registration and Google/Facebook; the app then calls its token endpoint.
 * (API calls still go through the dev-server proxy: /api -> backend or gateway.)
 */
export const AUTH_SERVER = 'http://localhost:9000';

/** The app's registration at the auth server: a public client (no secret), see auth-server application.yml. */
export const CLIENT_ID = 'eshop-web';

export const SCOPES = 'openid profile email';
