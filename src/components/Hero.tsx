'use client';

import { Box, Typography } from '@mui/material';
import Link from 'next/link';

import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';
const SERIF = 'Merriweather, Georgia, serif';
const STAMP = 'Stampette, monospace';
const CREAM = brandColors.warmCream;
const INK = brandColors.inkBlue;

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

// 5×5 "QR" placeholder grid from the design spec (1 = ink).
const QR = [
  [1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 1, 0, 1, 1],
];

/** The big tilted library card that anchors the hero. */
function HeroLibraryCard() {
  const now = new Date();
  const since = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <Box sx={{ perspective: '1200px' }}>
      <Box
        sx={{
          background: INK,
          borderRadius: '14px',
          padding: { xs: '24px 26px', md: '34px 38px' },
          boxShadow: '0 24px 40px rgba(30,58,95,0.35)',
          transform: 'rotate(-3deg)',
          transition: 'transform 0.35s ease',
          '&:hover': { transform: 'rotate(0deg) scale(1.02)' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid rgba(249,245,235,0.3)',
            pb: '14px',
            mb: '22px',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontWeight: 900,
                fontSize: { xs: '19px', md: '24px' },
                color: CREAM,
                letterSpacing: '0.04em',
              }}
            >
              STUFF LIBRARY
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '12px',
                color: 'rgba(249,245,235,0.65)',
                letterSpacing: '0.12em',
              }}
            >
              COMMUNITY SHARING NETWORK
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: '13px',
              color: brandColors.mustardYellow,
            }}
          >
            № 000-001
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '20px',
            alignItems: 'end',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '11px',
                color: 'rgba(249,245,235,0.6)',
                letterSpacing: '0.14em',
                mb: '4px',
              }}
            >
              MEMBER
            </Typography>
            <Typography
              sx={{
                fontFamily: TYPEWRITER,
                fontSize: { xs: '21px', md: '26px' },
                color: CREAM,
                mb: '18px',
              }}
            >
              A. Neighbor
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '11px',
                color: 'rgba(249,245,235,0.6)',
                letterSpacing: '0.14em',
                mb: '4px',
              }}
            >
              MEMBER SINCE
            </Typography>
            <Typography
              sx={{
                fontFamily: TYPEWRITER,
                fontSize: '18px',
                color: CREAM,
                mb: '20px',
              }}
            >
              {since}
            </Typography>
            {/* Barcode */}
            <Box
              sx={{
                height: 34,
                width: { xs: 160, md: 220 },
                background: `repeating-linear-gradient(90deg, ${CREAM} 0 2px, transparent 2px 5px, ${CREAM} 5px 9px, transparent 9px 12px, ${CREAM} 12px 13px, transparent 13px 18px)`,
                opacity: 0.9,
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Box
              sx={{
                width: 92,
                height: 92,
                background: CREAM,
                borderRadius: '6px',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(5, 1fr)',
                gap: '3px',
                padding: '8px',
                boxSizing: 'border-box',
              }}
            >
              {QR.flat().map((on, i) => (
                <Box key={i} sx={{ background: on ? INK : 'transparent' }} />
              ))}
            </Box>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '10px',
                color: 'rgba(249,245,235,0.6)',
              }}
            >
              SCAN TO SHARE
            </Typography>
          </Box>
        </Box>

        {/* MEMBER stamp overlapping the card content */}
        <Box sx={{ position: 'relative', height: 0 }}>
          <Box
            sx={{
              position: 'absolute',
              right: { xs: 40, md: 90 },
              bottom: 46,
              transform: 'rotate(-12deg)',
              border: `3px solid ${brandColors.tomatoRed}`,
              color: brandColors.tomatoRed,
              fontFamily: STAMP,
              fontSize: '22px',
              letterSpacing: '0.2em',
              padding: '4px 14px',
              borderRadius: '4px',
              opacity: 0.9,
            }}
          >
            MEMBER
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

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

        <HeroLibraryCard />
      </Box>
    </Box>
  );
}
