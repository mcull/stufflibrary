import path from 'path';

import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // P0-12: surface lint errors at build time. `next build` fails on ESLint
    // *errors* (not warnings), so type/lint regressions can't silently ship.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // P0-12: fail the build on type errors instead of suppressing them.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  webpack: (config) => {
    // Only configure webpack when not using Turbopack
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(process.cwd(), 'src'),
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Source-map upload needs SENTRY_AUTH_TOKEN; skip cleanly until it's set.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  widenClientFileUpload: true,
});
