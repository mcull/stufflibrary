'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { Suspense, useEffect } from 'react';

// Env-gated PostHog: no key -> no-op (mirrors how Sentry is wired). The phc_
// project key is publishable, but we keep it in env so preview/prod can point
// at different projects later.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    // #422: first-party proxy (see src/config/rewrites.mjs) so ad blockers
    // that eat us.i.posthog.com don't blind analytics. ui_host keeps toolbar
    // and links pointed at the real PostHog app.
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
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

/**
 * Ties events and replays to the signed-in user (#422). identify() is
 * idempotent per user id; on sign-out we reset only if we had identified,
 * so anonymous visitors keep a stable device id.
 */
function IdentifyOnLogin() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const user = session?.user as
      | { id?: string; email?: string | null }
      | undefined;

    if (user?.id && posthog.get_distinct_id() !== user.id) {
      posthog.identify(user.id, user.email ? { email: user.email } : undefined);
    } else if (status === 'unauthenticated' && posthog._isIdentified()) {
      posthog.reset();
    }
  }, [session, status]);

  return null;
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
    // (Must render inside the NextAuth SessionProvider for IdentifyOnLogin.)
    <Suspense fallback={null}>
      <PageViewTracker />
      <IdentifyOnLogin />
    </Suspense>
  );
}
