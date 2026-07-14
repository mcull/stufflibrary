import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MembersClient } from '../MembersClient';

vi.mock('@/components/admin/UserDetailModal', () => ({
  UserDetailModal: ({ userId }: { userId: string }) => (
    <div data-testid="user-detail-modal">record:{userId}</div>
  ),
}));

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const member = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: 'Jenny L.',
  email: 'jenny@example.com',
  status: 'active',
  trustScore: 91,
  createdAt: '2026-03-15T12:00:00Z',
  _count: { items: 14, borrowRequests: 52, ownedCollections: 0 },
  collectionMemberships: [{ collection: { name: 'Maple St Library' } }],
  ...over,
});

const payload = (users: unknown[], total = users.length) => ({
  users,
  pagination: {
    total,
    page: 1,
    limit: 25,
    pages: Math.max(1, Math.ceil(total / 25)),
  },
});

function stubFetch(body: unknown = payload([member()]), ok = true) {
  const mock = vi.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body })
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MembersClient', () => {
  it('renders roster rows: name, home library, counts, trust numeral', async () => {
    stubFetch(
      payload([
        member(),
        member({
          id: 'u2',
          name: 'Ruth C.',
          trustScore: 22,
          createdAt: '2025-11-02T12:00:00Z',
          collectionMemberships: [],
          _count: { items: 0, borrowRequests: 1, ownedCollections: 0 },
        }),
      ])
    );
    render(<MembersClient />);

    expect(await screen.findByText('Jenny L.')).toBeInTheDocument();
    expect(screen.getByText('Maple St Library')).toBeInTheDocument();
    expect(screen.getByText('Mar 2026')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    expect(screen.getByText('91')).toBeInTheDocument();
    // No home library reads as an em dash, never a fabricated name
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();

    // The grid speaks table to assistive tech
    expect(screen.getByRole('table', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 members
  });

  it('stamps a suspended member and dims their row', async () => {
    stubFetch(
      payload([member({ id: 'u3', name: 'Sam T.', status: 'suspended' })])
    );
    const { container } = render(<MembersClient />);

    expect(await screen.findByText('SUSPENDED')).toBeInTheDocument();
    const row = container.querySelector('[style*="opacity: 0.55"]');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Sam T.');
  });

  it('stamps OWNER for library owners and NEW for recent joins', async () => {
    stubFetch(
      payload([
        member({
          id: 'u4',
          name: 'Diego R.',
          createdAt: daysAgo(60),
          _count: { items: 2, borrowRequests: 3, ownedCollections: 2 },
        }),
        member({ id: 'u5', name: 'Nina P.', createdAt: daysAgo(2) }),
      ])
    );
    render(<MembersClient />);

    expect(await screen.findByText('OWNER')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('refetches with status=suspended when the SUSPENDED chip is clicked', async () => {
    const fetchMock = stubFetch();
    render(<MembersClient />);
    await screen.findByText('Jenny L.');

    fireEvent.click(screen.getByRole('button', { name: 'SUSPENDED' }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('status=suspended'))).toBe(true);
    });
  });

  it('refetches with ownersOnly=true when the OWNERS chip is clicked', async () => {
    const fetchMock = stubFetch();
    render(<MembersClient />);
    await screen.findByText('Jenny L.');

    fireEvent.click(screen.getByRole('button', { name: 'OWNERS' }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('ownersOnly=true'))).toBe(true);
    });
  });

  it('shows the pagination label and disables PREV on page one', async () => {
    stubFetch(payload([member()], 1204));
    render(<MembersClient />);

    expect(await screen.findByText('SHOWING 1–1 OF 1204')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PREV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'NEXT' })).toBeEnabled();
  });

  it('shows the empty line when nothing matches', async () => {
    stubFetch(payload([]));
    render(<MembersClient />);

    expect(await screen.findByText('No members match.')).toBeInTheDocument();
    expect(screen.getByText('SHOWING 0 OF 0')).toBeInTheDocument();
  });

  it('shows the honest error line when the roster fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ error: 'nope' }, false);
    render(<MembersClient />);

    expect(
      await screen.findByText('COULD NOT REACH THE DESK — refresh to retry')
    ).toBeInTheDocument();
  });

  it('opens the record modal from the row overflow menu', async () => {
    stubFetch();
    render(<MembersClient />);
    await screen.findByText('Jenny L.');

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Jenny L.' })
    );
    fireEvent.click(screen.getByText('Open record'));

    expect(screen.getByTestId('user-detail-modal')).toHaveTextContent(
      'record:u1'
    );
  });

  it('suspends via confirm dialog and PATCHes the legacy action body', async () => {
    const fetchMock = stubFetch();
    render(<MembersClient />);
    await screen.findByText('Jenny L.');

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Jenny L.' })
    );
    fireEvent.click(screen.getByText('Suspend'));
    fireEvent.click(screen.getByRole('button', { name: 'SUSPEND' }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit | undefined)?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      expect(String(patchCall![0])).toBe('/api/admin/users/u1');
      expect((patchCall![1] as RequestInit).body).toBe(
        JSON.stringify({ action: 'suspend' })
      );
    });
  });
});
