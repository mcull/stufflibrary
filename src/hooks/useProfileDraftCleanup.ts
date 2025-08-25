'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

/**
 * Hook to clean up profile wizard drafts when user signs out
 */
export function useProfileDraftCleanup() {
  const { data: session, status } = useSession();
  const previousEmailRef = useRef<string | null>(null);

  useEffect(() => {
    // Track when user email changes (sign in/out)
    const currentEmail = session?.user?.email || null;
    const previousEmail = previousEmailRef.current;

    // If user signed out (had email, now doesn't), clean up their draft
    if (previousEmail && !currentEmail && status === 'unauthenticated') {
      const draftKey = `profile-wizard-draft-${previousEmail}`;
      localStorage.removeItem(draftKey);
      console.log('Cleaned up profile draft for signed out user');
    }

    // If user signed in with different email, clean up old drafts
    if (currentEmail && previousEmail && currentEmail !== previousEmail) {
      const oldDraftKey = `profile-wizard-draft-${previousEmail}`;
      localStorage.removeItem(oldDraftKey);
      console.log('Cleaned up profile draft for previous user');
    }

    // Update the ref
    previousEmailRef.current = currentEmail;
  }, [session?.user?.email, status]);
}