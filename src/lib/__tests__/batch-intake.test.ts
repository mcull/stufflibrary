import { describe, it, expect } from 'vitest';

import {
  batchDone,
  intakeSummary,
  makeEntries,
  nextToReview,
  patchEntry,
  stillProcessing,
  type IntakeEntry,
} from '../batch-intake';

function entriesWith(statuses: IntakeEntry['status'][]): IntakeEntry[] {
  return statuses.map((status, i) => ({
    key: `intake-${i}`,
    previewUrl: `blob:${i}`,
    status,
  }));
}

describe('batch intake queue (#461)', () => {
  it('builds queued entries from previews', () => {
    const entries = makeEntries(['blob:a', 'blob:b']);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.status === 'queued')).toBe(true);
    expect(new Set(entries.map((e) => e.key)).size).toBe(2);
  });

  it('patches one entry immutably', () => {
    const entries = makeEntries(['blob:a', 'blob:b']);
    const next = patchEntry(entries, 'intake-1', {
      status: 'ready',
      name: 'Wrench',
    });
    expect(next[1]).toMatchObject({ status: 'ready', name: 'Wrench' });
    expect(next[0]!.status).toBe('queued');
    expect(entries[1]!.status).toBe('queued'); // original untouched
  });

  it('reviews recognized photos in order, one at a time', () => {
    const entries = entriesWith(['added', 'ready', 'ready', 'processing']);
    expect(nextToReview(entries)?.key).toBe('intake-1');
  });

  it('knows when recognition work remains', () => {
    expect(stillProcessing(entriesWith(['added', 'processing']))).toBe(true);
    expect(stillProcessing(entriesWith(['added', 'queued']))).toBe(true);
    expect(stillProcessing(entriesWith(['added', 'failed', 'skipped']))).toBe(
      false
    );
  });

  it('is done only when nothing is pending or awaiting review', () => {
    expect(batchDone(entriesWith(['added', 'skipped', 'failed']))).toBe(true);
    expect(batchDone(entriesWith(['added', 'ready']))).toBe(false);
    expect(batchDone(entriesWith(['added', 'queued']))).toBe(false);
    expect(batchDone([])).toBe(false);
  });

  it('summarizes the batch for the closing stamp', () => {
    const summary = intakeSummary(
      entriesWith(['added', 'added', 'skipped', 'failed', 'ready', 'queued'])
    );
    expect(summary).toEqual({ added: 2, skipped: 1, failed: 1, pending: 2 });
  });
});
