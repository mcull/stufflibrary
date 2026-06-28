import { describe, it, expect } from 'vitest';

import { selectOverdueReminders } from '../overdue';

const NOW = Date.parse('2026-06-27T12:00:00Z');
const base = {
  id: 'b',
  status: 'ACTIVE',
  lastOverdueReminderAt: null as Date | null,
};

describe('selectOverdueReminders', () => {
  it('flags due-tomorrow (~24h out)', () => {
    const r = selectOverdueReminders(
      [{ ...base, requestedReturnDate: new Date('2026-06-28T10:00:00Z') }],
      NOW
    );
    expect(r[0]!.kind).toBe('DUE_TOMORROW');
  });
  it('flags overdue (past due)', () => {
    const r = selectOverdueReminders(
      [{ ...base, requestedReturnDate: new Date('2026-06-25T10:00:00Z') }],
      NOW
    );
    expect(r[0]!.kind).toBe('OVERDUE');
  });
  it('skips when reminded within last 24h', () => {
    const r = selectOverdueReminders(
      [
        {
          ...base,
          requestedReturnDate: new Date('2026-06-25T10:00:00Z'),
          lastOverdueReminderAt: new Date('2026-06-27T06:00:00Z'),
        },
      ],
      NOW
    );
    expect(r).toEqual([]);
  });
  it('ignores non-ACTIVE and far-future borrows', () => {
    const r = selectOverdueReminders(
      [
        {
          ...base,
          status: 'RETURNED',
          requestedReturnDate: new Date('2026-06-25T10:00:00Z'),
        },
        { ...base, requestedReturnDate: new Date('2026-07-30T10:00:00Z') },
      ],
      NOW
    );
    expect(r).toEqual([]);
  });
});
