// Pure module (house rule): the narration for the ~10s illustration wait
// (#423). One line per step, parked on the last — looping back to
// "sketching" after the paint was "drying" reads as broken, and the render
// route's response will replace the overlay anyway.

export const THEATER_LINES = [
  'Finding a fresh page…',
  'Sketching the outlines…',
  'Mixing the washes…',
  'Laying down color…',
  'Inking the details…',
  'Drying the paper…',
  'Almost ready for the shelf…',
] as const;

export const THEATER_STEP_MS = 1800;

export function theaterLine(elapsedMs: number): string {
  const step = Math.min(
    Math.floor(elapsedMs / THEATER_STEP_MS),
    THEATER_LINES.length - 1
  );
  return THEATER_LINES[step]!;
}
