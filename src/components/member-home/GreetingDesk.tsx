'use client';

import { Box, Typography } from '@mui/material';

import { dateStamp } from '@/lib/member-home';
import { brandColors } from '@/theme/brandTokens';

import { vintageFonts } from './vintageTokens';

interface GreetingDeskProps {
  eyebrow: string;
  cardNumber: string;
  firstName: string;
}

/** The librarian's desk: branch line, typed welcome, rubber date stamp. */
export function GreetingDesk({
  eyebrow,
  cardNumber,
  firstName,
}: GreetingDeskProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: { xs: 2, sm: 4 },
        mb: '44px',
      }}
    >
      <Box>
        <Typography
          sx={{
            fontFamily: vintageFonts.mono,
            fontSize: '13px',
            letterSpacing: '0.18em',
            color: brandColors.tomatoRed,
            mb: '12px',
          }}
        >
          {eyebrow} · CARD № {cardNumber}
        </Typography>
        <Typography
          component="h1"
          sx={{
            fontFamily: vintageFonts.typewriter,
            fontWeight: 400,
            fontSize: { xs: '36px', md: '52px' },
            lineHeight: 1.05,
            color: brandColors.inkBlue,
            m: 0,
          }}
        >
          Welcome back, {firstName}.
        </Typography>
      </Box>
      <Box
        sx={{
          transform: 'rotate(-8deg)',
          border: `3px solid ${brandColors.inkBlue}`,
          color: brandColors.inkBlue,
          fontFamily: vintageFonts.stamp,
          fontSize: '17px',
          letterSpacing: '0.18em',
          padding: '6px 16px',
          borderRadius: '4px',
          opacity: 0.75,
          whiteSpace: 'nowrap',
          mb: '8px',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {dateStamp(new Date())}
      </Box>
    </Box>
  );
}
