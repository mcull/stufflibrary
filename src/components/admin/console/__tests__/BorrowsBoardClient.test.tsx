import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AdminBorrowRow } from '@/app/api/admin/borrows/route';

import { BorrowsBoardClient } from '../BorrowsBoardClient';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

const baseRow = {
  approvedAt: null,
  returnedAt: null,
  returnCondition: null,
  returnConditionNote: null,
  lastOverdueReminderAt: null,
};

const boardRows: AdminBorrowRow[] = [
  {
    ...baseRow,
    id: 'req-1',
    status: 'PENDING',
    createdAt: iso(now - 3 * HOUR),
    requestedReturnDate: iso(now + 7 * DAY),
    borrower: { name: 'Sam T.' },
    lender: { name: 'Nora F.' },
    item: { name: 'Telescope' },
  },
  {
    ...baseRow,
    id: 'out-1',
    status: 'RETURN_PENDING',
    createdAt: iso(now - 5 * DAY),
    approvedAt: iso(now - 5 * DAY),
    requestedReturnDate: iso(now + 4.5 * DAY),
    borrower: { name: 'Tom B.' },
    lender: { name: 'Diego R.' },
    item: { name: 'Extension ladder' },
  },
  {
    ...baseRow,
    id: 'over-1',
    status: 'ACTIVE',
    createdAt: iso(now - 10 * DAY),
    approvedAt: iso(now - 10 * DAY),
    requestedReturnDate: iso(now - 2.5 * DAY),
    lastOverdueReminderAt: '2026-07-11T09:00:00Z',
    borrower: { name: 'Ruth C.' },
    lender: { name: 'Grace W.' },
    item: { name: 'Carpet cleaner' },
  },
  {
    ...baseRow,
    id: 'ret-1',
    status: 'RETURNED',
    createdAt: iso(now - 12 * DAY),
    approvedAt: iso(now - 12 * DAY),
    requestedReturnDate: iso(now - 1 * DAY),
    returnedAt: iso(now - 2 * HOUR),
    returnCondition: 'MINOR_WEAR',
    borrower: { name: 'Aisha K.' },
    lender: { name: 'Priya S.' },
    item: { name: 'Sewing machine' },
  },
  // Returned three days ago — the 24h window means it must NOT render.
  {
    ...baseRow,
    id: 'ret-old',
    status: 'RETURNED',
    createdAt: iso(now - 20 * DAY),
    requestedReturnDate: iso(now - 4 * DAY),
    returnedAt: iso(now - 3 * DAY),
    borrower: { name: 'Omar H.' },
    lender: { name: 'Jenny L.' },
    item: { name: 'Stale return' },
  },
  // Cancelled borrows have no column at all.
  {
    ...baseRow,
    id: 'can-1',
    status: 'CANCELLED',
    createdAt: iso(now - 2 * DAY),
    requestedReturnDate: iso(now + 2 * DAY),
    borrower: { name: 'Leo M.' },
    lender: { name: 'Sam T.' },
    item: { name: 'Cancelled tent' },
  },
];

function stubFetch(
  rows: AdminBorrowRow[] | Error,
  post: { status: number; body?: unknown } = { status: 200, body: { ok: true } }
) {
  const mock = vi.fn((_url: unknown, init?: { method?: string }) => {
    if (init?.method === 'POST') {
      return Promise.resolve({
        ok: post.status < 400,
        status: post.status,
        json: async () => post.body ?? {},
      });
    }
    return rows instanceof Error
      ? Promise.reject(rows)
      : Promise.resolve({ ok: true, status: 200, json: async () => rows });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BorrowsBoardClient', () => {
  it('deals every borrow into its one honest column', async () => {
    stubFetch(boardRows);
    render(<BorrowsBoardClient />);

    const requested = await screen.findByRole('region', {
      name: 'REQUESTED',
    });
    const out = screen.getByRole('region', { name: 'OUT · ON LOAN' });
    const overdue = screen.getByRole('region', { name: 'OVERDUE' });
    const returned = screen.getByRole('region', { name: 'RETURNED TODAY' });

    // Requested: waiting clock, asks-line
    expect(within(requested).getByText('Telescope')).toBeInTheDocument();
    expect(
      within(requested).getByText('Sam T. asks Nora F.')
    ).toBeInTheDocument();
    expect(within(requested).getByText('waiting 3h')).toBeInTheDocument();

    // Out on loan: due meter + RETURN PENDING stamp (plain ACTIVE gets none)
    expect(within(out).getByText('Extension ladder')).toBeInTheDocument();
    expect(within(out).getByText('Tom B., from Diego R.')).toBeInTheDocument();
    expect(within(out).getByText('due in 5 days')).toBeInTheDocument();
    expect(within(out).getByText('RETURN PENDING')).toBeInTheDocument();

    // Overdue: the late stamp and the real reminder fact
    expect(within(overdue).getByText('Carpet cleaner')).toBeInTheDocument();
    expect(within(overdue).getByText('3 DAYS LATE')).toBeInTheDocument();
    expect(
      within(overdue).getByText('last reminder Jul 11')
    ).toBeInTheDocument();

    // Returned today: green stamp, lowercased condition, the 24h footer
    expect(within(returned).getByText('Sewing machine')).toBeInTheDocument();
    expect(within(returned).getByText('RETURNED')).toBeInTheDocument();
    expect(
      within(returned).getByText('condition: minor wear')
    ).toBeInTheDocument();
    expect(
      within(returned).getByText('returns leave the board after 24h')
    ).toBeInTheDocument();

    // Every header carries its count
    for (const region of [requested, out, overdue, returned]) {
      expect(within(region).getByText('1')).toBeInTheDocument();
    }

    // The 3-day-old return and the cancelled borrow never render
    expect(screen.queryByText('Stale return')).toBeNull();
    expect(screen.queryByText('Cancelled tent')).toBeNull();
  });

  it('admits empty columns instead of inventing cards', async () => {
    stubFetch([boardRows[0]!]);
    render(<BorrowsBoardClient />);

    expect(await screen.findByText('Telescope')).toBeInTheDocument();
    expect(screen.getByText('nothing out')).toBeInTheDocument();
    expect(screen.getByText('nothing overdue')).toBeInTheDocument();
    expect(screen.getByText('no returns today')).toBeInTheDocument();
    expect(screen.queryByText('none waiting')).toBeNull();
  });

  it('offers REMIND OWNER only on requests that have waited over a day', async () => {
    stubFetch([
      boardRows[0]!, // fresh: waiting 3h — no button
      {
        ...baseRow,
        id: 'req-stale',
        status: 'PENDING',
        createdAt: iso(now - 30 * HOUR),
        requestedReturnDate: iso(now + 7 * DAY),
        borrower: { name: 'Leo M.' },
        lender: { name: 'Grace W.' },
        item: { name: 'Post hole digger' },
      },
    ]);
    render(<BorrowsBoardClient />);

    await screen.findByText('Post hole digger');
    // Exactly one button on the board — the stale request's, not the fresh one's.
    expect(
      screen.getAllByRole('button', { name: 'REMIND OWNER' })
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'NUDGE' })).toBeNull();
  });

  it('NUDGE posts to the bell and stamps the card REMINDED', async () => {
    const mock = stubFetch(
      [boardRows[2]!],
      { status: 200, body: { ok: true, kind: 'NUDGE_BORROWER' } } // over-1
    );
    render(<BorrowsBoardClient />);

    fireEvent.click(await screen.findByRole('button', { name: 'NUDGE' }));

    const reminded = await screen.findByRole('button', { name: 'REMINDED' });
    expect(reminded).toBeDisabled();
    expect(mock).toHaveBeenCalledWith('/api/admin/borrows/over-1/nudge', {
      method: 'POST',
    });
    // Optimistic fact line: reminded today, not the stale Jul 11 date.
    const today = new Date(now).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(screen.getByText(`last reminder ${today}`)).toBeInTheDocument();
    expect(screen.queryByText('last reminder Jul 11')).toBeNull();
  });

  it('a 429 shows the reminder fact instead of error theatrics', async () => {
    stubFetch([{ ...boardRows[2]!, lastOverdueReminderAt: null }], {
      status: 429,
      body: {
        error: 'reminded recently',
        lastOverdueReminderAt: iso(now - 2 * HOUR),
      },
    });
    render(<BorrowsBoardClient />);

    fireEvent.click(await screen.findByRole('button', { name: 'NUDGE' }));

    const today = new Date(now).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(
      await screen.findByText(`last reminder ${today}`)
    ).toBeInTheDocument();
    expect(screen.queryByText('could not send')).toBeNull();
    // Not falsely stamped REMINDED — this session sent nothing.
    expect(screen.queryByRole('button', { name: 'REMINDED' })).toBeNull();
  });

  it('admits it when the nudge could not be sent', async () => {
    stubFetch([boardRows[2]!], { status: 500, body: { error: 'boom' } });
    render(<BorrowsBoardClient />);

    fireEvent.click(await screen.findByRole('button', { name: 'NUDGE' }));

    expect(await screen.findByText('could not send')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'REMINDED' })).toBeNull();
  });

  it('shows the honest failure line when the fetch dies', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch(new Error('boom'));
    render(<BorrowsBoardClient />);

    await waitFor(() => {
      expect(
        screen.getByText('COULD NOT REACH THE DESK — refresh to retry')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Telescope')).toBeNull();
  });
});
