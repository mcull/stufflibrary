'use client';

import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { brandColors, typography } from '@/theme/brandTokens';

// "Front porch" is the internal design metaphor for this screen; it must never
// appear in the copy below. The visitor is a guest looking at a library card.
export interface GuestPreviewProps {
  slot: 'header' | 'claim';
  libraryName: string;
  invitationContext:
    | { kind: 'personal'; inviterName: string | null }
    | { kind: 'code'; inviterName: string | null }
    | null;
  memberCount: number;
  onClaim: () => void;
}

function countLine(memberCount: number): string {
  const verb = memberCount === 1 ? 'member shares' : 'members share';
  return `${memberCount} ${verb} this shelf · you'll meet them once you join`;
}

export function GuestPreview({
  slot,
  libraryName,
  invitationContext,
  memberCount,
  onClaim,
}: GuestPreviewProps) {
  if (slot === 'claim') {
    return (
      <Box
        sx={{
          mt: 2,
          mb: 2,
          p: 3,
          borderRadius: 2,
          border: `1.5px solid ${brandColors.inkBlue}`,
          bgcolor: brandColors.warmCream,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.xs,
            letterSpacing: 2,
            color: brandColors.charcoal,
            mb: 1,
          }}
        >
          LIBRARY CARD · {libraryName.toUpperCase()}
        </Typography>
        <Button
          variant="contained"
          onClick={onClaim}
          sx={{
            bgcolor: brandColors.inkBlue,
            '&:hover': { bgcolor: brandColors.inkBlue },
          }}
        >
          Claim your library card
        </Button>
        <Typography
          variant="body2"
          sx={{ color: brandColors.charcoal, mt: 1.5 }}
        >
          Free · takes a minute
        </Typography>
      </Box>
    );
  }

  const inviterName = invitationContext?.inviterName ?? null;
  let heading: ReactNode;
  if (
    invitationContext &&
    inviterName &&
    invitationContext.kind === 'personal'
  ) {
    heading = (
      <>
        <strong>{inviterName}</strong> invited you to{' '}
        <strong>{libraryName}</strong>
      </>
    );
  } else if (
    invitationContext &&
    inviterName &&
    invitationContext.kind === 'code'
  ) {
    heading = (
      <>
        <strong>{libraryName}</strong> — hosted by{' '}
        <strong>{inviterName}</strong>
      </>
    );
  } else {
    heading = (
      <>
        Welcome to <strong>{libraryName}</strong>
      </>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        border: `1.5px solid ${brandColors.inkBlue}`,
        bgcolor: brandColors.warmCream,
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: typography.fontFamily.hero,
          fontSize: typography.fontSize['2xl'],
          color: brandColors.inkBlue,
          mb: 1.5,
        }}
      >
        {heading}
      </Typography>
      <Typography variant="body2" sx={{ color: brandColors.charcoal, mb: 1 }}>
        The stuff is public to invited guests. The people aren&rsquo;t — names
        and faces stay members-only.
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontFamily: typography.fontFamily.mono,
          fontSize: '0.8rem',
          color: brandColors.charcoal,
        }}
      >
        {countLine(memberCount)}
      </Typography>
    </Box>
  );
}
