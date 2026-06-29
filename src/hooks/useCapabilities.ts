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
 */
export function useCapabilities(): UseCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/api/profile');
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
  }, []);

  return { capabilities, loading };
}
