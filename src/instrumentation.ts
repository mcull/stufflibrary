import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Reports errors from nested React Server Components / route handlers.
// No-op while Sentry is disabled (no DSN configured).
export const onRequestError = Sentry.captureRequestError;
