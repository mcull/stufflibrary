import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // No-op until the DSN env vars are configured (see .env.example).
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  // Keep performance tracing cheap; errors are the launch priority.
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

// Instruments App Router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
