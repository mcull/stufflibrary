'use client';

import { useEffect, useState } from 'react';

import type { Capabilities } from '@/lib/capabilities';

interface UseCapabilitiesResult {
  capabilities: Capabilities | null;
  loading: boolean;
}

/**
 * Reads the current user's capability flags from `GET /api/profile`.
 * Server enforcement is the authority; this drives just-in-time UX
 * (disabled affordances + the complete-profile prompt).
 *
 * Pass `libraryId` to get library-scoped capabilities — needed for
 * `canInvite`, which depends on owner/admin status in that library.
 */
export function useCapabilities(libraryId?: string): UseCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const url = libraryId
          ? `/api/profile?libraryId=${encodeURIComponent(libraryId)}`
          : '/api/profile';
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        if (mounted && data?.capabilities) {
          setCapabilities(data.capabilities as Capabilities);
        }
      } catch {
        // Non-fatal: leave capabilities null; server still enforces.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [libraryId]);

  return { capabilities, loading };
}
