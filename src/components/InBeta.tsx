import { Box, Typography } from '@mui/material';
import Link from 'next/link';

import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';

/** CTA band: your card is waiting (#430). */
export function InBeta() {
  return (
    <Box
      component="section"
      sx={{
        padding: { xs: '60px 24px', md: '80px 72px' },
        textAlign: 'center',
        background: brandColors.warmCream,
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: TYPEWRITER,
          fontWeight: 400,
          fontSize: { xs: '30px', md: '38px' },
          color: brandColors.inkBlue,
          m: '0 0 18px 0',
        }}
      >
        Your card is waiting.
      </Typography>
      <Typography
        sx={{
          fontSize: '18px',
          color: 'rgba(63,52,43,0.8)',
          m: '0 0 32px 0',
        }}
      >
        New libraries open wherever a neighbor starts one. Sign up, stock your
        shelf, and invite the people on your street.
      </Typography>
      <Box
        component={Link}
        href="/auth/signin"
        sx={{
          background: brandColors.tomatoRed,
          color: brandColors.warmCream,
          fontFamily: MONO,
          fontSize: '17px',
          padding: '18px 36px',
          borderRadius: '3px',
          display: 'inline-block',
          textDecoration: 'none',
          transition: 'background 0.2s ease',
          '&:hover': { background: brandColors.inkBlue },
        }}
      >
        Get your library card
      </Box>
    </Box>
  );
}
