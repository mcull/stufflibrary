'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';

import type { PendingInvitation } from '@/hooks/usePendingInvitations';
import { brandColors } from '@/theme/brandTokens';

import { vintage, vintageFonts } from './vintageTokens';

interface InvitedLibraryCardProps {
  invitation: PendingInvitation;
  isClaiming: boolean;
  onClaim: (token: string) => void;
}

/** One pending invitation: "a library card waiting to be claimed." */
export function InvitedLibraryCard({
  invitation,
  isClaiming,
  onClaim,
}: InvitedLibraryCardProps) {
  const { collection, invitedBy, expiresAt } = invitation;
  const inviter = invitedBy?.name?.trim() || 'a neighbor';
  const members = collection.memberCount;

  return (
    <Box
      sx={{
        background: brandColors.white,
        border: `1px solid ${vintage.cardBorder}`,
        borderRadius: '12px',
        p: '18px',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: vintageFonts.serif,
            fontSize: '18px',
            color: brandColors.inkBlue,
            mb: 0.5,
          }}
        >
          {collection.name}
        </Typography>
        <Typography variant="body2" sx={{ color: vintage.bodyInk }}>
          Invited by {inviter} · {members} member{members === 1 ? '' : 's'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Card expires {new Date(expiresAt).toLocaleDateString()}
        </Typography>
      </Box>

      <Button
        onClick={() => onClaim(invitation.token)}
        disabled={isClaiming}
        variant="contained"
        aria-label={`Claim your card for ${collection.name}`}
        sx={{
          bgcolor: brandColors.inkBlue,
          '&:hover': { bgcolor: '#1a2f4f' },
          whiteSpace: 'nowrap',
          minWidth: 150,
        }}
      >
        {isClaiming ? (
          <CircularProgress size={18} sx={{ color: brandColors.white }} />
        ) : (
          'Claim your card'
        )}
      </Button>
    </Box>
  );
}
