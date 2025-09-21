'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type EditModeCueProps = {
  text?: string; // default: "Edit mode_"
  minVisible?: number; // minimum number of characters to keep during erase cycles
  stepDelayRange?: [number, number]; // per-character delay (ms)
  pauseDelayRange?: [number, number]; // pause when target reached (ms)
  className?: string;
  style?: React.CSSProperties;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function EditModeCue({
  text = 'Edit mode_',
  minVisible,
  stepDelayRange = [60, 140],
  pauseDelayRange = [500, 1400],
  className,
  style,
}: EditModeCueProps) {
  const minKeep = useMemo(
    () =>
      typeof minVisible === 'number'
        ? minVisible
        : Math.max(1, Math.floor(text.length * 0.4)),
    [minVisible, text.length]
  );
  const [length, setLength] = useState(0); // currently visible length
  const targetRef = useRef(text.length); // current target length
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    function scheduleNext(stepDelay: number) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(tick, stepDelay);
    }

    function chooseNewTarget() {
      // With higher probability choose near-full length; sometimes erase deeper
      const goDeeper = Math.random() < 0.35; // 35% chance to erase more
      const newTarget = goDeeper
        ? randInt(minKeep, text.length - 2)
        : randInt(Math.max(minKeep, text.length - 3), text.length);
      targetRef.current = newTarget;
    }

    function tick() {
      if (cancelled) return;
      const target = targetRef.current;
      if (length === target) {
        // Reached target — pause a bit, then pick a new target
        const pause = randInt(pauseDelayRange[0], pauseDelayRange[1]);
        timeoutRef.current = setTimeout(() => {
          // Ensure we eventually reach full length again
          if (Math.random() < 0.6) {
            targetRef.current = text.length;
          } else {
            chooseNewTarget();
          }
          scheduleNext(randInt(stepDelayRange[0], stepDelayRange[1]));
        }, pause);
        return;
      }

      setLength((prev) => {
        const next = prev + (prev < target ? 1 : -1);
        return Math.max(0, Math.min(text.length, next));
      });

      scheduleNext(randInt(stepDelayRange[0], stepDelayRange[1]));
    }

    // Initial: type all the way out once
    targetRef.current = text.length;
    scheduleNext(randInt(stepDelayRange[0], stepDelayRange[1]));

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    minKeep,
    stepDelayRange[0],
    stepDelayRange[1],
    pauseDelayRange[0],
    pauseDelayRange[1],
  ]);

  return (
    <span
      className={className}
      style={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        letterSpacing: '0.02em',
        ...style,
      }}
      aria-label="edit mode"
    >
      {text.slice(0, length)}
    </span>
  );
}
