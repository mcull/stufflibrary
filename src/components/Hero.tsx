'use client';

import { Box, Typography } from '@mui/material';
import Link from 'next/link';

import { WatercolorShowcase } from '@/components/WatercolorShowcase';
import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';
const CREAM = brandColors.warmCream;
const INK = brandColors.inkBlue;

export function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        background: brandColors.warmCream,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
          gap: { xs: '48px', md: '40px' },
          alignItems: 'center',
          padding: { xs: '56px 24px 70px', md: '96px 72px 110px' },
          maxWidth: 1280,
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: '14px',
              letterSpacing: '0.18em',
              color: brandColors.tomatoRed,
              mb: '24px',
            }}
          >
            A LENDING LIBRARY FOR EVERYTHING ELSE
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: TYPEWRITER,
              fontSize: { xs: '46px', sm: '60px', md: '76px' },
              fontWeight: 400,
              lineHeight: 1.05,
              m: '0 0 28px 0',
              color: INK,
            }}
          >
            Borrow, Lend, Belong.
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '17px', md: '20px' },
              lineHeight: 1.55,
              maxWidth: 460,
              m: '0 0 40px 0',
              color: 'rgba(63,52,43,0.85)',
            }}
          >
            Your street already owns everything you need — the drill, the tent,
            the pasta maker. StuffLibrary gives your neighborhood a card
            catalog, checkout cards, and one library card per neighbor.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Box
              component="a"
              href="#how"
              sx={{
                background: INK,
                color: CREAM,
                fontFamily: MONO,
                fontSize: '16px',
                padding: '16px 30px',
                borderRadius: '3px',
                display: 'inline-block',
                textDecoration: 'none',
                transition: 'background 0.2s ease',
                '&:hover': { background: brandColors.tomatoRed },
              }}
            >
              See how it works ↓
            </Box>
            <Box
              component={Link}
              href="/auth/signin"
              sx={{
                fontFamily: MONO,
                fontSize: '16px',
                color: INK,
                textDecoration: 'none',
                borderBottom: `2px solid ${brandColors.mustardYellow}`,
                paddingBottom: '2px',
                '&:hover': { color: brandColors.tomatoRed },
              }}
            >
              Start a library on your street
            </Box>
          </Box>
        </Box>

        <WatercolorShowcase />
      </Box>
    </Box>
  );
}
