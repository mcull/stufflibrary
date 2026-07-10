'use client';

import { Box, Typography } from '@mui/material';

import { PARADE_ITEMS } from '@/lib/homepage-watercolors';
import { brandColors } from '@/theme/brandTokens';

const MONO = '"Roboto Mono", monospace';
const STAMP = 'Stampette, monospace';

const TILE = 116;
const GAP = 18;
// One full loop ambles by in about two minutes — furniture, not fireworks.
const LOOP_SECONDS = PARADE_ITEMS.length * 2.2;

/**
 * The parade (#438): a slow marquee of real watercolor renders showing the
 * range of stuff neighbors share. The track is rendered twice for a seamless
 * loop; prefers-reduced-motion holds it still as a scrollable strip.
 */
export function WatercolorParade() {
  const tiles = PARADE_ITEMS.map((item, i) => (
    <Box
      key={item.slug}
      component="figure"
      sx={{
        m: 0,
        flex: '0 0 auto',
        width: TILE,
        background: brandColors.white,
        border: '1.5px solid #E4DCC8',
        borderRadius: '8px',
        padding: '8px 8px 6px',
        transform: `rotate(${i % 2 ? 0.9 : -0.9}deg)`,
      }}
    >
      <Box
        component="img"
        src={item.url}
        alt={item.name}
        loading="lazy"
        sx={{
          width: '100%',
          aspectRatio: '1',
          objectFit: 'cover',
          borderRadius: '5px',
          display: 'block',
        }}
      />
      <Typography
        component="figcaption"
        sx={{
          fontFamily: MONO,
          fontSize: '9.5px',
          color: brandColors.inkBlue,
          mt: '5px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {item.name}
      </Typography>
    </Box>
  ));

  return (
    <Box
      component="section"
      aria-label="The kinds of things neighbors share"
      sx={{
        background: brandColors.warmCream,
        borderTop: `2px solid ${brandColors.inkBlue}`,
        borderBottom: `2px solid ${brandColors.inkBlue}`,
        py: '28px',
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{
          fontFamily: STAMP,
          fontSize: '15px',
          letterSpacing: '0.22em',
          color: '#8b4513',
          textAlign: 'center',
          mb: '20px',
        }}
      >
        ★ NOW CIRCULATING ON NEIGHBORHOOD SHELVES ★
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: `${GAP}px`,
          width: 'max-content',
          animation: `parade ${LOOP_SECONDS}s linear infinite`,
          '&:hover': { animationPlayState: 'paused' },
          '@keyframes parade': {
            from: { transform: 'translateX(0)' },
            to: { transform: `translateX(calc(-50% - ${GAP / 2}px))` },
          },
          // Reduced motion: a still strip the user can swipe themselves.
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            width: 'auto',
            overflowX: 'auto',
          },
        }}
      >
        {tiles}
        {/* Second pass of the same tiles makes the loop seamless. */}
        {PARADE_ITEMS.map((item, i) => (
          <Box
            key={`${item.slug}-encore`}
            component="figure"
            aria-hidden="true"
            sx={{
              m: 0,
              flex: '0 0 auto',
              width: TILE,
              background: brandColors.white,
              border: '1.5px solid #E4DCC8',
              borderRadius: '8px',
              padding: '8px 8px 6px',
              transform: `rotate(${i % 2 ? 0.9 : -0.9}deg)`,
            }}
          >
            <Box
              component="img"
              src={item.url}
              alt=""
              loading="lazy"
              sx={{
                width: '100%',
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius: '5px',
                display: 'block',
              }}
            />
            <Typography
              component="figcaption"
              sx={{
                fontFamily: MONO,
                fontSize: '9.5px',
                color: brandColors.inkBlue,
                mt: '5px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {item.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
