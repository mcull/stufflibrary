'use client';

import { Alert, Box, Stack } from '@mui/material';
import { useState } from 'react';

import { usePendingInvitations } from '@/hooks/usePendingInvitations';

import { InvitedLibraryCard } from './InvitedLibraryCard';
import { DrawerSectionLabel } from './LibraryDrawer';

export function InvitedLibraries() {
  const { invitations, isLoading, refetch } = usePendingInvitations();
  const [claimingToken, setClaimingToken] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = async (token: string) => {
    setClaimingToken(token);
    setClaimError(null);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.ok && data.library?.id) {
        // Straight to the arrival — the same welcome contract as every other
        // join path (?message=joined_successfully lights up ArrivalWelcome).
        const url = new URL(
          `/library/${data.library.id}`,
          window.location.origin
        );
        url.searchParams.set('message', 'joined_successfully');
        if (data.user?.firstName) {
          url.searchParams.set('welcomeName', data.user.firstName);
        }
        window.location.assign(url.toString());
        return; // navigating away — keep the spinner up (do NOT clear below)
      }

      setClaimError(
        data.error || 'Could not claim this card. Please try again.'
      );
      refetch(); // an invite that expired between load and click drops off
    } catch (err) {
      console.error('Failed to claim invitation:', err);
      setClaimError('Could not claim this card. Please try again.');
    }
    // Reached only when we did NOT navigate away (non-ok, missing library, or throw).
    setClaimingToken(null);
  };

  // A best-effort side panel: never take up lobby space while loading or when
  // there is nothing waiting. A load failure reads as "nothing waiting" (the
  // hook still records the error; there is just nothing to shout about here).
  if (isLoading || invitations.length === 0) {
    return null;
  }

  const label =
    invitations.length === 1
      ? 'A LIBRARY CARD IS WAITING'
      : 'LIBRARY CARDS WAITING FOR YOU';

  return (
    <Box sx={{ mb: '48px' }}>
      <DrawerSectionLabel>{label}</DrawerSectionLabel>
      {claimError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {claimError}
        </Alert>
      )}
      <Stack spacing={2}>
        {invitations.map((invitation) => (
          <InvitedLibraryCard
            key={invitation.id}
            invitation={invitation}
            isClaiming={claimingToken === invitation.token}
            onClaim={handleClaim}
          />
        ))}
      </Stack>
    </Box>
  );
}
