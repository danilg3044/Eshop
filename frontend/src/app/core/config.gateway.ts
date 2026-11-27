/**
 * Replaces config.ts in the "gateway" configuration (npm run start:gateway, see angular.json fileReplacements):
 * everything, including the Google/Facebook full-page redirect, goes through the Spring Cloud Gateway.
 */
export const BACKEND_ORIGIN = 'http://localhost:8090';
