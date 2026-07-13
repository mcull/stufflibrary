import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapCirculationEvent } from '@/lib/admin/desk';

import { DeskClient } from '../DeskClient';

const deskPayload = {
  kpis: {
    members: 1311,
    membersWeekDelta: 12,
    activeLibraries: 47,
    librariesMonthDelta: 3,
    itemsOnShelves: 3912,
    watercolorPct: 88,
    borrowsInFlight: 45,
    overdueBorrows: 3,
    invitesSent30d: 62,
    invitesAccepted30d: 41,
  },
  onDesk: { openReports: 2, activeDisputes: 1, overdueBorrows: 3 },
  growth: {
    daily: Array.from({ length: 30 }, (_, i) => i % 7),
    signupsToday: 36,
    invitesPending: 4,
    newLibraries7d: 3,
  },
  paint: { monthCents: 1516, capCents: 1000, renders: 504 },
};

const circulationRows = [
  mapCirculationEvent({
    id: 'borrow-1',
    at: '2026-07-13T14:24:00Z',
    kind: 'borrow',
    actor: 'Tom B.',
    subject: 'Pressure washer',
    detail: 'due Jul 20',
  }),
  mapCirculationEvent({
    id: 'join-1',
    at: '2026-07-13T13:02:00Z',
    kind: 'join',
    actor: 'Priya S.',
    subject: 'Stonegate',
  }),
];

const healthPayload = {
  status: 'OK',
  services: {
    database: { status: 'OK', message: 'Database connection successful' },
    redis: { status: 'OK', message: 'Redis connection successful' },
    storage: { status: 'OK', message: 'Storage connection successful' },
    ai: { status: 'OK', message: 'AI service connection successful' },
  },
  timestamp: '2026-07-13T14:24:48.000Z',
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
}

function stubFetch({
  desk = () => jsonResponse(deskPayload),
  circulation = () => jsonResponse(circulationRows),
  health = () => jsonResponse(healthPayload),
}: Partial<
  Record<'desk' | 'circulation' | 'health', () => Promise<unknown>>
> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: unknown) => {
      const u = String(url);
      if (u.includes('/api/admin/desk')) return desk();
      if (u.includes('/api/admin/circulation')) return circulation();
      if (u.includes('/api/health')) return health();
      throw new Error(`unexpected fetch: ${u}`);
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DeskClient', () => {
  it('renders formatted KPIs, the ledger, growth, and desk piles', async () => {
    stubFetch();
    render(<DeskClient />);

    // KPI values format via toLocaleString('en-US')
    expect(await screen.findByText('1,311')).toBeInTheDocument();
    expect(screen.getByText('3,912')).toBeInTheDocument();
    expect(screen.getByText('+12 this week')).toBeInTheDocument();
    expect(screen.getByText('88% with watercolors')).toBeInTheDocument();
    expect(screen.getByText('3 overdue')).toBeInTheDocument();
    expect(screen.getByText('41 accepted')).toBeInTheDocument();

    // Ledger rows: text plus stamp labels
    expect(
      await screen.findByText('Tom B. borrowed Pressure washer')
    ).toBeInTheDocument();
    expect(screen.getByText('due Jul 20')).toBeInTheDocument();
    expect(screen.getByText('BORROWED')).toBeInTheDocument();
    expect(screen.getByText('Priya S. joined Stonegate')).toBeInTheDocument();
    expect(screen.getByText('NEW MEMBER')).toBeInTheDocument();

    // Growth pulse stats and paint budget
    expect(screen.getByText('signups today')).toBeInTheDocument();
    expect(screen.getByText('$15.16')).toBeInTheDocument();
    expect(screen.getByText('$10.00/day spend cap')).toBeInTheDocument();

    // On the desk links
    expect(
      screen.getByRole('link', { name: /Overdue borrows/ })
    ).toHaveAttribute('href', '/admin/borrows');

    // Health resolves to the nominal stamp
    expect(await screen.findByText('ALL SYSTEMS NOMINAL')).toBeInTheDocument();

    // Waitlist is gone from the Desk on purpose
    expect(screen.queryByText(/waitlist/i)).toBeNull();
  });

  it('shows the quiet-desk line when nothing circulated today', async () => {
    stubFetch({ circulation: () => jsonResponse([]) });
    render(<DeskClient />);

    expect(
      await screen.findByText('Nothing in circulation yet today — quiet desk.')
    ).toBeInTheDocument();
  });

  it('shows COULD NOT REACH THE DESK when the desk fetch fails, without fake numbers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ desk: () => jsonResponse({ error: 'nope' }, false) });
    render(<DeskClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('COULD NOT REACH THE DESK — refresh to retry')
          .length
      ).toBeGreaterThan(0);
    });
    // The ledger still works — its fetch is independent
    expect(
      await screen.findByText('Tom B. borrowed Pressure washer')
    ).toBeInTheDocument();
    // No KPI numbers were invented
    expect(screen.queryByText('MEMBERS')).toBeNull();
    expect(screen.queryByText(/^0$/)).toBeNull();
  });

  it('shows the failure line inside the ledger only when circulation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ circulation: () => Promise.reject(new Error('boom')) });
    render(<DeskClient />);

    expect(await screen.findByText('1,311')).toBeInTheDocument();
    expect(
      await screen.findByText('COULD NOT REACH THE DESK — refresh to retry')
    ).toBeInTheDocument();
  });
});
