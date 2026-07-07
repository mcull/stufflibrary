import path from 'path';

import { withSentryConfig } from '@sentry/nextjs';

import { legacyRedirects } from './src/config/redirects.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // #399: old URL vocabulary (/stacks, /collection, /branch) 301s to the
  // library-native paths. Mapping lives (and is tested) in src/config.
  async redirects() {
    return legacyRedirects;
  },
  eslint: {
    // P0-12: surface lint errors at build time. `next build` fails on ESLint
    // *errors* (not warnings), so type/lint regressions can't silently ship.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // P0-12: fail the build on type errors instead of suppressing them.
    ignoreBuildErrors: false,
    // Build-only tsconfig that excludes test files, so the production build
    // doesn't type-check test-only devDeps (which aren't resolvable in the
    // deploy build). `npm run typecheck` still uses tsconfig.json for tests.
    tsconfigPath: 'tsconfig.build.json',
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
