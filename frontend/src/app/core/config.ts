/**
 * Where the Spring Boot server runs. API calls go through the dev-server proxy (proxy.conf.json),
 * but the Google/Facebook login is a full-page redirect, so it needs the backend's real address.
 */
export const BACKEND_ORIGIN = 'http://localhost:8080';
