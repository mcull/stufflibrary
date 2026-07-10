'use client';

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';

import { SHOWCASE_ITEMS } from '@/lib/homepage-watercolors';

// Seconds between any one card being replaced. With three cards staggered a
// third apart, something changes roughly every 4 seconds — alive, but never
// two at once.
const CYCLE_SECONDS = 12;
// A swap is a full exit and entrance: the old card vanishes, then the new
// one appears in its place with a fresh tilt and size.
const FADE_OUT_SECONDS = 1.1;
const FADE_IN_SECONDS = 1.1;
const SETTLE_SECONDS = FADE_OUT_SECONDS + FADE_IN_SECONDS + 0.2;

// Each card's midpoint is planted; only the card occupying it changes.
const SLOTS = [
  { width: '62%', cx: '63%', cy: '35%', drift: 17 },
  { width: '46%', cx: '23%', cy: '62%', drift: 21 },
  { width: '42%', cx: '73%', cy: '80%', drift: 14 },
] as const;

const ROTATIONS = [-5, 3.5, -2, 5.5, -3.5, 1.5, -6, 4.5] as const;
const SCALES = [1, 0.9, 1.1, 0.95, 1.05, 0.86, 1.12, 0.92] as const;

/**
 * The tilt and size a card wears for one appearance. Deterministic in
 * (slot, step) so server and client render identically; the index strides
 * are coprime with the table lengths, so consecutive appearances at the
 * same midpoint always land a different pose.
 */
export function cardPose(slot: number, step: number) {
  return {
    rotate: ROTATIONS[(slot * 3 + step * 5) % ROTATIONS.length]!,
    scale: SCALES[(slot * 2 + step * 3) % SCALES.length]!,
  };
}

/**
 * One card position: two stacked <img>s taking turns. The outgoing card
 * fades all the way out before the incoming one (already preloaded, posed
 * fresh) fades in — sequenced by a transition-delay on the entrance.
 */
function ShowcaseCard({ slot }: { slot: number }) {
  // This position cycles through its own third of the cast (slot, slot+3,
  // …), so no item ever appears in two places at once.
  const stride = SLOTS.length;
  const [phase, setPhase] = useState({ step: 0, settled: true });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Stagger: card 0 swaps at 4s, card 1 at 8s, card 2 at 12s, repeat.
    const offset = ((slot + 1) * CYCLE_SECONDS * 1000) / SLOTS.length;
    let interval: ReturnType<typeof setInterval> | undefined;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      setPhase((p) => ({ step: p.step + 1, settled: false }));
      // The outgoing layer keeps its image until the exit and entrance are
      // both done; only then is it recycled to preload the next item.
      settle = setTimeout(
        () => setPhase((p) => ({ ...p, settled: true })),
        SETTLE_SECONDS * 1000
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
  // Layer A carries even steps, layer B odd steps. Mid-swap the off layer
  // still holds the outgoing card; once settled it preloads the next one.
  // Each layer is posed for the step it carries — the pose snaps while the
  // layer is invisible (only opacity transitions), never on screen.
  const layers = [0, 1].map((parity) => {
    const showing = step % 2 === parity;
    const carries = showing ? step : settled ? step + 1 : step - 1;
    return {
      item: itemAt(carries),
      pose: cardPose(slot, carries),
      visible: showing,
    };
  });

  const { width, cx, cy, drift } = SLOTS[slot]!;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: cx,
        top: cy,
        width,
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          animation: `showcase-drift-${slot} ${drift}s ease-in-out infinite alternate`,
          [`@keyframes showcase-drift-${slot}`]: {
            from: { translate: '0 0' },
            to: { translate: `${slot % 2 ? -8 : 8}px ${6 + slot * 3}px` },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {layers.map(({ item, pose, visible }, i) => (
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
              transform: `rotate(${pose.rotate}deg) scale(${pose.scale})`,
              opacity: visible ? 1 : 0,
              // Entrances wait for the exit to finish, then fade in.
              transition: visible
                ? `opacity ${FADE_IN_SECONDS}s ease-in-out ${FADE_OUT_SECONDS}s`
                : `opacity ${FADE_OUT_SECONDS}s ease-in-out`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/**
 * The hero's right column (#438, round 3): three big watercolor cards of
 * real shareable stuff. Each holds its spot on the table; when its turn
 * comes it vanishes entirely and a different card lands at the same
 * midpoint with its own tilt and size. No labels, no fake owners — just
 * the stuff.
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
        <ShowcaseCard key={i} slot={i} />
      ))}
    </Box>
  );
}
