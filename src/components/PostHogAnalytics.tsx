'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { Suspense, useEffect } from 'react';

// Env-gated PostHog: no key -> no-op (mirrors how Sentry is wired). The phc_
// project key is publishable, but we keep it in env so preview/prod can point
// at different projects later.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Cheaper + more private: anonymous visitors don't get person profiles.
    person_profiles: 'identified_only',
    // App Router SPA navigations don't fire page loads; we capture manually.
    capture_pageview: false,
    capture_pageleave: true,
    // Web vitals (CLS/LCP/INP/FCP) — the "zero jump" scoreboard.
    capture_performance: { web_vitals: true },
    // Session replay is toggled on in the PostHog project settings; when on,
    // mask everything typed — this app holds names and addresses.
    session_recording: {
      maskAllInputs: true,
    },
  });
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogAnalytics() {
  if (!POSTHOG_KEY) return null;
  return (
    // useSearchParams requires a Suspense boundary in the App Router.
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
