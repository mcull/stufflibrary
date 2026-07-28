import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ManageMembersModal } from '../ManageMembersModal';

const INVITES = [
  {
    id: 'inv_open',
    email: 'nora@example.com',
    status: 'SENT',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: '2026-07-27T00:00:00.000Z',
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
  {
    id: 'inv_unopened',
    email: 'dave@example.com',
    status: 'SENT',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: null,
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
  {
    id: 'inv_joined',
    email: 'jo@example.com',
    status: 'ACCEPTED',
    createdAt: '2026-07-26T00:00:00.000Z',
    sentAt: '2026-07-26T00:00:00.000Z',
    openedAt: null,
    isExpired: false,
    sender: { name: 'Marc', email: 'marc@example.com' },
  },
];

// URL+method-aware fetch: GET endpoints the modal hits on open, plus the
// invite POST that Resend reuses.
function stubFetch(onInvitePost?: (body: unknown) => void) {
  const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
    if (url.endsWith('/invite') && opts?.method === 'POST') {
      onInvitePost?.(JSON.parse(String(opts.body)));
      return { ok: true, json: async () => ({ success: true }) } as Response;
    }
    if (url.endsWith('/invitations')) {
      return {
        ok: true,
        json: async () => ({ invitations: INVITES }),
      } as Response;
    }
    if (url.endsWith('/members')) {
      return { ok: true, json: async () => ({ members: [] }) } as Response;
    }
    // the /api/collections/:id limit fetch
    return { ok: true, json: async () => ({ collection: {} }) } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

function open() {
  render(
    <ManageMembersModal
      open
      onClose={() => {}}
      collectionId="lib_1"
      collectionName="HAASS"
      userRole="owner"
      initialTab={1}
    />
  );
}

describe('ManageMembersModal — sender funnel', () => {
  it('shows opened / not-opened per invite and treats accepted as opened', async () => {
    stubFetch();
    open();
    expect(await screen.findByText('nora@example.com')).toBeInTheDocument();
    // opened invite shows an "Opened <date>" line — match shape, not the exact
    // day, so the assertion survives the runner's timezone.
    expect(screen.getByText(/^Opened \d+\/\d+\/\d+$/)).toBeInTheDocument();
    // unopened invite shows the muted not-opened line
    expect(screen.getByText(/Not opened yet/)).toBeInTheDocument();
    // accepted invite reads as opened (capital "Opened"; "Not opened yet" is
    // lowercase and won't match) — nora's dated line + jo's bare "Opened" = 2.
    const openedLabels = screen.getAllByText(/Opened/);
    expect(openedLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('Resend re-posts the invite email and reloads', async () => {
    let posted: unknown = null;
    stubFetch((body) => {
      posted = body;
    });
    open();
    await screen.findByText('dave@example.com');
    const resendButtons = screen.getAllByRole('button', { name: /resend/i });
    // one Resend per non-accepted invite (nora + dave), none for the accepted jo
    expect(resendButtons).toHaveLength(2);
    fireEvent.click(resendButtons[1]!); // dave's row
    await waitFor(() =>
      expect(posted).toEqual({ invitationId: 'inv_unopened' })
    );
  });

  it('hides Resend for an accepted invite', async () => {
    stubFetch();
    open();
    await screen.findByText('jo@example.com');
    // jo is ACCEPTED: its row has no Resend. Total Resend buttons = 2 (nora, dave).
    expect(screen.getAllByRole('button', { name: /resend/i })).toHaveLength(2);
  });

  it('surfaces the error when Resend fails', async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.endsWith('/invite') && opts?.method === 'POST') {
        return {
          ok: false,
          json: async () => ({ error: 'Rate limited' }),
        } as Response;
      }
      if (url.endsWith('/invitations')) {
        return {
          ok: true,
          json: async () => ({ invitations: INVITES }),
        } as Response;
      }
      if (url.endsWith('/members')) {
        return { ok: true, json: async () => ({ members: [] }) } as Response;
      }
      return { ok: true, json: async () => ({ collection: {} }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    open();
    await screen.findByText('dave@example.com');
    const resendButtons = screen.getAllByRole('button', { name: /resend/i });
    fireEvent.click(resendButtons[1]!); // dave's row
    expect(await screen.findByText(/Rate limited/)).toBeInTheDocument();
  });
});
