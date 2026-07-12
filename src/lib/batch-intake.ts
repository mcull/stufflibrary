// Pure state helpers for the camera-roll batch intake queue (#461).
// The UI (BatchAddClient) owns the async pipeline; these keep the queue
// bookkeeping testable.

export type IntakeStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'added'
  | 'skipped';

export interface IntakeEntry {
  /** Local key for React lists — not the server item id. */
  key: string;
  previewUrl: string;
  status: IntakeStatus;
  itemId?: string;
  name?: string;
  description?: string;
  category?: string;
  watercolorUrl?: string;
  error?: string;
}

export function makeEntries(previewUrls: string[]): IntakeEntry[] {
  return previewUrls.map((previewUrl, i) => ({
    key: `intake-${i}`,
    previewUrl,
    status: 'queued',
  }));
}

export function patchEntry(
  entries: IntakeEntry[],
  key: string,
  patch: Partial<IntakeEntry>
): IntakeEntry[] {
  return entries.map((e) => (e.key === key ? { ...e, ...patch } : e));
}

/** The card currently up for review: the first recognized-and-waiting one. */
export function nextToReview(entries: IntakeEntry[]): IntakeEntry | null {
  return entries.find((e) => e.status === 'ready') ?? null;
}

/** True while any photo is still queued or being recognized. */
export function stillProcessing(entries: IntakeEntry[]): boolean {
  return entries.some(
    (e) => e.status === 'queued' || e.status === 'processing'
  );
}

/** The batch is finished when nothing is pending and nothing awaits review. */
export function batchDone(entries: IntakeEntry[]): boolean {
  return (
    entries.length > 0 && !stillProcessing(entries) && !nextToReview(entries)
  );
}

export function intakeSummary(entries: IntakeEntry[]): {
  added: number;
  skipped: number;
  failed: number;
  pending: number;
} {
  const count = (s: IntakeStatus) =>
    entries.filter((e) => e.status === s).length;
  return {
    added: count('added'),
    skipped: count('skipped'),
    failed: count('failed'),
    pending: count('queued') + count('processing') + count('ready'),
  };
}
