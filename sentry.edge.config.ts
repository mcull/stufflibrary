import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // No-op until the DSN env vars are configured (see .env.example).
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
