'use client';

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';

import { SHOWCASE_ITEMS } from '@/lib/homepage-watercolors';

// Seconds between any one print swapping to a new item. With three prints
// staggered a third apart, something changes roughly every 4 seconds —
// alive, but never two at once.
const CYCLE_SECONDS = 12;
const FADE_SECONDS = 1.8;

// Each print's spot in the hero's right column: loose, overlapping, tilted —
// the same scattered-on-a-table feel the old card had, minus the card.
const SLOTS = [
  { width: '62%', top: '2%', left: '32%', rotate: -2.5, drift: 17 },
  { width: '46%', top: '38%', left: '0%', rotate: 3, drift: 21 },
  { width: '42%', top: '58%', left: '52%', rotate: -1.5, drift: 14 },
] as const;

/**
 * One print: two stacked <img>s crossfading. The hidden layer always holds
 * the next item, so it's loaded before its fade-in starts.
 */
function ShowcasePrint({ slot }: { slot: number }) {
  // This print cycles through its own third of the cast (slot, slot+3, …),
  // so no item ever appears in two prints at once.
  const stride = SLOTS.length;
  const [phase, setPhase] = useState({ step: 0, settled: true });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Stagger: print 0 swaps at 4s, print 1 at 8s, print 2 at 12s, repeat.
    const offset = ((slot + 1) * CYCLE_SECONDS * 1000) / SLOTS.length;
    let interval: ReturnType<typeof setInterval> | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      setPhase((p) => ({ step: p.step + 1, settled: false }));
      // The outgoing layer keeps its image until the fade is fully done;
      // only then is it recycled to preload the next item.
      settle = setTimeout(
        () => setPhase((p) => ({ ...p, settled: true })),
        (FADE_SECONDS + 0.2) * 1000
      );
    };
    const kickoff = setTimeout(() => {
      advance();
      interval = setInterval(advance, CYCLE_SECONDS * 1000);
    }, offset);
    return () => {
      clearTimeout(kickoff);
      clearTimeout(settle);
      if (interval) clearInterval(interval);
    };
  }, [slot]);

  const itemAt = (s: number) =>
    SHOWCASE_ITEMS[(slot + s * stride) % SHOWCASE_ITEMS.length]!;
  const { step, settled } = phase;
  // Layer A shows even steps, layer B odd steps. Mid-fade the off layer
  // still holds the outgoing item; once settled it preloads the next one.
  const layers = [0, 1].map((parity) => {
    const showing = step % 2 === parity;
    return {
      item: itemAt(showing ? step : settled ? step + 1 : step - 1),
      visible: showing,
    };
  });

  const { width, top, left, rotate, drift } = SLOTS[slot]!;

  return (
    <Box
      sx={{
        position: 'absolute',
        width,
        top,
        left,
        aspectRatio: '1',
        transform: `rotate(${rotate}deg)`,
        animation: `showcase-drift-${slot} ${drift}s ease-in-out infinite alternate`,
        [`@keyframes showcase-drift-${slot}`]: {
          from: { translate: '0 0' },
          to: { translate: `${slot % 2 ? -8 : 8}px ${6 + slot * 3}px` },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {layers.map(({ item, visible }, i) => (
        <Box
          key={i}
          component="img"
          src={item.url}
          alt={visible ? item.name : ''}
          aria-hidden={visible ? undefined : 'true'}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '10px',
            boxShadow: '0 18px 34px rgba(30,58,95,0.18)',
            opacity: visible ? 1 : 0,
            transition: `opacity ${FADE_SECONDS}s ease-in-out`,
          }}
        />
      ))}
    </Box>
  );
}

/**
 * The hero's right column (#438, round 2): three big watercolor prints of
 * real shareable stuff, drifting gently and taking turns fading to the next
 * item. No labels, no fake owners — just the stuff.
 */
export function WatercolorShowcase() {
  return (
    <Box
      aria-label="Watercolor paintings of things neighbors share"
      role="group"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: 420, md: 'none' },
        mx: 'auto',
        aspectRatio: '10 / 9.5',
      }}
    >
      {SLOTS.map((_, i) => (
        <ShowcasePrint key={i} slot={i} />
      ))}
    </Box>
  );
}
