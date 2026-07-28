import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { InvitedLibraries } from '../member-home/InvitedLibraries';

const INVITES = [
  {
    id: 'inv1',
    token: 'tok1',
    collection: {
      id: 'lib1',
      name: 'Maple Street Tools',
      location: null,
      owner: { name: 'Dana' },
      memberCount: 14,
    },
    invitedBy: { name: 'Dana' },
    createdAt: '2026-07-20T00:00:00.000Z',
    expiresAt: '2026-08-03T00:00:00.000Z',
  },
];

// URL+method-aware fetch: the pending GET the band hits on mount, plus the
// accept POST that Claim fires.
function stubFetch(opts?: { invitations?: unknown[]; acceptOk?: boolean }) {
  const acceptOk = opts?.acceptOk ?? true;
  const invitations = opts?.invitations ?? INVITES;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/accept') && init?.method === 'POST') {
      return {
        ok: acceptOk,
        status: acceptOk ? 200 : 400,
        json: async () =>
          acceptOk
            ? { library: { id: 'lib1' }, user: { firstName: 'Marc' } }
            : { error: 'Invitation has expired' },
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ invitations }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InvitedLibraries', () => {
  it('renders a card per pending invitation under the waiting label', async () => {
    stubFetch();
    render(<InvitedLibraries />);
    expect(await screen.findByText('Maple Street Tools')).toBeInTheDocument();
    expect(screen.getByText(/A LIBRARY CARD IS WAITING/)).toBeInTheDocument();
  });

  it('renders nothing when there are no invitations', async () => {
    stubFetch({ invitations: [] });
    const { container } = render(<InvitedLibraries />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('claims: posts to accept and redirects to the arrival', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    stubFetch();
    render(<InvitedLibraries />);
    fireEvent.click(
      await screen.findByRole('button', { name: /claim your card/i })
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        expect.stringContaining('/library/lib1?message=joined_successfully')
      )
    );
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining('welcomeName=Marc')
    );
  });

  it('shows an inline error and keeps the card when a claim fails', async () => {
    stubFetch({ acceptOk: false });
    render(<InvitedLibraries />);
    fireEvent.click(
      await screen.findByRole('button', { name: /claim your card/i })
    );
    expect(
      await screen.findByText(/expired|could not claim/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Maple Street Tools')).toBeInTheDocument();
  });

  it('uses the plural label for more than one invitation', async () => {
    const two = [
      INVITES[0]!,
      {
        ...INVITES[0]!,
        id: 'inv2',
        token: 'tok2',
        collection: {
          ...INVITES[0]!.collection,
          id: 'lib2',
          name: 'Cedar Ave Kitchen',
        },
      },
    ];
    stubFetch({ invitations: two });
    render(<InvitedLibraries />);
    expect(await screen.findByText('Cedar Ave Kitchen')).toBeInTheDocument();
    expect(
      screen.getByText(/LIBRARY CARDS WAITING FOR YOU/)
    ).toBeInTheDocument();
  });
});
