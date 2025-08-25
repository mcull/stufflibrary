'use client';

import { useProfileDraftCleanup } from '@/hooks/useProfileDraftCleanup';

/**
 * Global component to handle profile draft cleanup
 * Should be placed high in the component tree to ensure it runs everywhere
 */
export function ProfileDraftCleanup() {
  useProfileDraftCleanup();
  return null; // This component renders nothing
}