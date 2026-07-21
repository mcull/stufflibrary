import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
    },
    invitation: {
      updateMany: mockInvitationUpdateMany,
      findFirst: mockInvitationFindFirst,
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import {
  emailMatchesInvitation,
  maskEmail,
  validateLibraryInvite,
  handleInviteLanding,
} from '../invite';

const FUTURE = () => new Date(Date.now() + 86400000);

/** The row `validateLibraryInvite` selects — every field it reads, always. */
const inviteRow = (over: Record<string, unknown> = {}) => ({
  libraryId: 'c1',
  expiresAt: FUTURE(),
  email: 'dave@example.com',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCreate.mockResolvedValue({});
  mockMemberUpdate.mockResolvedValue({});
  mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner-1' });
});

describe('emailMatchesInvitation', () => {
  it('matches identical addresses', () => {
    expect(emailMatchesInvitation('dave@example.com', 'dave@example.com')).toBe(
      true
    );
  });

  it('ignores case and surrounding whitespace', () => {
    expect(
      emailMatchesInvitation(' Dave@Example.COM ', 'dave@example.com')
    ).toBe(true);
  });

  it('ignores case on the invitation side too', () => {
    expect(emailMatchesInvitation('dave@example.com', 'DAVE@Example.com')).toBe(
      true
    );
  });

  it('rejects a different address — the forwarded-invite case', () => {
    expect(
      emailMatchesInvitation('stranger@example.com', 'dave@example.com')
    ).toBe(false);
  });

  it('rejects a same-local-part address at another domain', () => {
    expect(emailMatchesInvitation('dave@evil.com', 'dave@example.com')).toBe(
      false
    );
  });

  it('rejects a missing session address rather than passing', () => {
    expect(emailMatchesInvitation(undefined, 'dave@example.com')).toBe(false);
    expect(emailMatchesInvitation(null, 'dave@example.com')).toBe(false);
    expect(emailMatchesInvitation('', 'dave@example.com')).toBe(false);
    expect(emailMatchesInvitation('   ', 'dave@example.com')).toBe(false);
  });
});

describe('maskEmail', () => {
  it('shows enough to be recognized and not enough to be harvested', () => {
    expect(maskEmail('dave@example.com')).toBe('d•••@example.com');
  });

  it('never echoes the rest of the local part', () => {
    expect(maskEmail('dave@example.com')).not.toContain('ave');
  });

  it('degrades to fully masked on a malformed address', () => {
    expect(maskEmail('notanemail')).toBe('•••');
    expect(maskEmail('@example.com')).toBe('•••');
  });
});

describe('validateLibraryInvite', () => {
  it('carries the invited address back to the caller', async () => {
    mockInvitationFindFirst.mockResolvedValueOnce(inviteRow());
    const r = await validateLibraryInvite('tok');
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.invitation.email).toBe('dave@example.com');
  });

  it('selects email from the database', async () => {
    mockInvitationFindFirst.mockResolvedValueOnce(inviteRow());
    await validateLibraryInvite('tok');
    expect(mockInvitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ email: true }),
      })
    );
  });
});

// The binding check cannot fail on the prefilled sign-in path — the address was
// locked to the invitation, so it matches by construction. These are the paths
// that skip the locked field.
describe('handleInviteLanding — the already-signed-in forwardee', () => {
  const landing = (token = 'tok') =>
    handleInviteLanding(
      { url: 'https://x/j/tok' } as unknown as NextRequest,
      token
    );

  it('refuses a stranger arriving with a live session on a forwarded link', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await landing();

    expect(res.headers.get('location')).toContain('invite=wrong_account');
  });

  it('grants nothing to the stranger', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    await landing();

    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
  });

  it("burns nothing — Dave's invitation is still live afterwards", async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    await landing();

    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  // Masked is not harvestable, but it still lands in browser history and
  // outbound Referer — the same channel this design rejects for the plain
  // address. The dead-end screen reads the cookie instead.
  it('puts no form of the address in the URL, masked or otherwise', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await landing();
    const location = decodeURIComponent(res.headers.get('location') ?? '');

    expect(location).not.toContain('d•••@example.com');
    expect(location).not.toContain('dave@example.com');
    expect(location).not.toContain('invited=');
    expect(location).not.toContain('example.com');
  });

  // The dead end's offer is "sign in as that address". It reads the invited
  // address off the cookie, and consume needs the token still there once the
  // right person arrives — so the refusal has to leave one behind. Nothing is
  // granted by the cookie itself; every consumer re-checks the binding.
  it('leaves the stranger holding the invite cookies so the screen has something to recover', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await landing();

    expect(res.cookies.get('invite_token')?.value).toBe('tok');
    expect(res.cookies.get('invite_library')?.value).toBe('c1');
  });

  it('refuses an OAuth session with no email at all rather than passing', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({ user: { id: 'u2' } });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await landing();

    expect(res.headers.get('location')).toContain('invite=wrong_account');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('lets the real addressee through despite case and whitespace drift', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: ' Dave@Example.COM ' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await landing();

    expect(res.headers.get('location')).toContain(
      '/library/c1?message=joined_successfully'
    );
    expect(mockMemberCreate).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalled();
  });

  it('still shields the owner previewing their own link (#409)', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'owner-1', email: 'dave@example.com' },
    });

    const res = await landing();

    expect(res.headers.get('location')).toContain('message=own_library');
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  // Documenting a deliberate trade: the binding check runs before any lookup
  // of who owns the library, so an owner previewing a link addressed to
  // someone else gets the dead end rather than "your own library". The
  // outcome that matters is unchanged — nothing burned, nothing granted.
  it('sends the owner to the dead end when the link was addressed to someone else, burning nothing', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'owner-1', email: 'owner@example.com' },
    });

    const res = await landing();

    expect(res.headers.get('location')).toContain('invite=wrong_account');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('sends the unauthenticated invitee to sign-in, not the guest preview', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue(null);

    const res = await landing();
    const location = res.headers.get('location') ?? '';

    expect(location).toContain('/auth/signin');
    expect(location).not.toContain('guest=1');
  });

  // The whole point of the cookie: the address is what sign-in locks to, and
  // a query parameter would put it in browser history and outbound Referer.
  it('carries the invitation in cookies and never the address in the URL', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue(null);

    const res = await landing();
    const location = res.headers.get('location') ?? '';

    expect(res.cookies.get('invite_token')?.value).toBe('tok');
    expect(res.cookies.get('invite_library')?.value).toBe('c1');
    expect(res.cookies.get('invite_token')?.httpOnly).toBe(true);
    expect(decodeURIComponent(location)).not.toContain('dave@example.com');
    expect(location).not.toContain('dave%40example.com');
    expect(location).not.toContain('email=');
  });
});

describe('POST /api/invite/consume — binding', () => {
  // NextRequest does not surface a `cookie` header as `.cookies` in this
  // environment, so the request is stood up directly. The route reads exactly
  // `url` and `cookies.get`.
  const consume = async (cookies: Record<string, string>) => {
    const { POST } = await import('@/app/api/invite/consume/route');
    return POST({
      url: 'http://t/api/invite/consume',
      cookies: {
        get: (name: string) =>
          name in cookies ? { name, value: cookies[name] } : undefined,
      },
    } as unknown as NextRequest);
  };

  const COOKIES = { invite_token: 'tok', invite_library: 'c1' };

  it('refuses when the session email is not the invited one', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await consume(COOKIES);
    const body = await res.json();

    expect(body.redirect).toBeNull();
    expect(body.error).toBe('invite_bound_to_other_email');
    expect(body.invitedEmail).toBe('d•••@example.com');
  });

  it('grants no membership on mismatch', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    await consume(COOKIES);

    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
  });

  // The mutation this test exists for: an implementation that accepts the
  // invitation and *then* rejects the user looks fine from the browser and
  // still destroys Dave's invitation.
  it('burns nothing on mismatch — the invitation survives for its addressee', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    await consume(COOKIES);

    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses a session carrying no email rather than passing', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({ user: { id: 'u2' } });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await consume(COOKIES);
    const body = await res.json();

    expect(body.error).toBe('invite_bound_to_other_email');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('admits the real addressee and burns the invitation exactly once', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'DAVE@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await consume(COOKIES);
    const body = await res.json();

    expect(body.redirect).toBe('/library/c1');
    expect(body.error).toBeUndefined();
    expect(mockMemberCreate).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('names an expired invitation instead of silently redirecting', async () => {
    mockInvitationFindFirst.mockResolvedValue(
      inviteRow({ expiresAt: new Date(Date.now() - 1000) })
    );
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'dave@example.com' },
    });

    const res = await consume(COOKIES);
    const body = await res.json();

    expect(body.redirect).toBeNull();
    expect(body.error).toBe('invite_expired');
  });

  it('names a rotated-away invitation instead of dropping the user at a library door they cannot open', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'dave@example.com' },
    });

    const res = await consume(COOKIES);
    const body = await res.json();

    expect(body.redirect).toBeNull();
    expect(body.error).toBe('invite_invalid');
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });

  it('still returns a bare null redirect when there is no invite at all', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'dave@example.com' },
    });

    const res = await consume({});
    const body = await res.json();

    expect(body.redirect).toBeNull();
    expect(body.error).toBeUndefined();
  });

  // The dead end's whole offer is "sign in as that address". Clearing the
  // cookies here would leave that button with nothing left to consume.
  it('leaves the invite cookies intact on refusal so the right person can still claim it', async () => {
    mockInvitationFindFirst.mockResolvedValue(inviteRow());
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u2', email: 'stranger@example.com' },
    });
    mockMemberFindUnique.mockResolvedValue(null);

    const res = await consume(COOKIES);

    expect(res.cookies.get('invite_token')).toBeUndefined();
  });

  it('clears the cookies on a dead invite, which no address can revive', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'dave@example.com' },
    });

    const res = await consume(COOKIES);

    expect(res.cookies.get('invite_token')?.value).toBe('');
  });
});
