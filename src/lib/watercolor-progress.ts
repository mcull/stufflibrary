// Pure module (house rule): the simulated fill for the illustration wait's
// progress bar (#433, replacing the #426 narration — too precious in
// practice). Linear-ish to 90% over the measured ~10s typical render, then
// an asymptotic creep so a long render never looks stuck; the overlay
// unmounts when the real render resolves, so 100% is never faked.

export const PROGRESS_TARGET_MS = 10_000;

export function simulatedProgress(
  elapsedMs: number,
  targetMs: number = PROGRESS_TARGET_MS
): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs <= targetMs) return (elapsedMs / targetMs) * 90;
  const overtime = elapsedMs - targetMs;
  return Math.min(98, 90 + 8 * (1 - Math.exp(-overtime / 15_000)));
}
