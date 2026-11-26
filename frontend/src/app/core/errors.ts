import { HttpErrorResponse } from '@angular/common/http';

/**
 * Pulls a human-readable message out of an HTTP error.
 * The backend answers errors with RFC 9457 ProblemDetail JSON: { status, title, detail }.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Cannot reach the server. Is the backend running?';
    }
    const body = err.error as { detail?: string; title?: string } | null;
    return body?.detail || body?.title || fallback;
  }
  return fallback;
}
