'use client';

import { useCallback, useEffect, useState } from 'react';

export interface PendingInvitation {
  id: string;
  token: string;
  collection: {
    id: string;
    name: string;
    location?: string | null;
    owner: { name?: string | null; email?: string | null };
    memberCount: number;
  };
  invitedBy?: { name?: string | null; email?: string | null } | null;
  createdAt: string;
  expiresAt: string;
}

interface UsePendingInvitationsReturn {
  invitations: PendingInvitation[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePendingInvitations(): UsePendingInvitationsReturn {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/invitations/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load invitations'
      );
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return { invitations, isLoading, error, refetch: fetchInvitations };
}
