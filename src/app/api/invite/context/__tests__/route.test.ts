import type { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    invitation: { findFirst: mockInvitationFindFirst },
    collection: { findUnique: mockCollectionFindUnique },
  },
}));

const get = async (cookies: Record<string, string>) => {
  const { GET } = await import('../route');
  return GET({
    cookies: {
      get: (name: string) =>
        name in cookies ? { name, value: cookies[name] } : undefined,
    },
  } as unknown as NextRequest);
};

const inviteRow = (over: Record<string, unknown> = {}) => ({
  libraryId: 'c1',
  expiresAt: new Date(Date.now() + 86400000),
  email: 'dave@example.com',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCollectionFindUnique.mockResolvedValue({ name: 'Tool Shed' });
});

describe('GET /api/invite/context', () => {
  it('returns the invited address for a pending personal invite', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());

    const body = await (await get({ invite_token: 'tok' })).json();

    expect(body.invite).toEqual({
      email: 'dave@example.com',
      libraryName: 'Tool Shed',
    });
  });

  // A join code is bearer — addressed to nobody. There is no address to
  // prefill, and inventing one would lock a stranger's sign-in to somebody
  // else's mailbox.
  it('returns nothing for a join-code cookie', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());

    const body = await (await get({ invite_token: 'jc:code_1' })).json();

    expect(body.invite).toBeNull();
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  it('returns nothing when there is no invite cookie at all', async () => {
    const body = await (await get({})).json();

    expect(body.invite).toBeNull();
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  it('returns nothing for a rotated-away or expired invite', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    expect(
      (await (await get({ invite_token: 'tok' })).json()).invite
    ).toBeNull();

    mockInvitationFindFirst.mockResolvedValue(
      inviteRow({ expiresAt: new Date(Date.now() - 1000) })
    );
    expect(
      (await (await get({ invite_token: 'tok' })).json()).invite
    ).toBeNull();
  });

  it('still answers when the library has been deleted out from under the invite', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockCollectionFindUnique.mockResolvedValue(null);

    const body = await (await get({ invite_token: 'tok' })).json();

    expect(body.invite.email).toBe('dave@example.com');
    expect(body.invite.libraryName).toBeNull();
  });
});
