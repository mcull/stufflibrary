import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockMemberUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockResolveJoinCode = vi.hoisted(() => vi.fn());
const mockRecordJoinCodeUse = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    collection: { findUnique: mockCollectionFindUnique },
    collectionMember: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      update: mockMemberUpdate,
      updateMany: mockMemberUpdateMany,
    },
    invitation: {
      updateMany: mockInvitationUpdateMany,
      findFirst: mockInvitationFindFirst,
    },
  },
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/join-code-service', () => ({
  resolveJoinCode: mockResolveJoinCode,
  recordJoinCodeUse: mockRecordJoinCodeUse,
}));

import { handleJoinCodeLanding } from '../invite';

const CODE_ID = 'jcode_1';
const LIB = 'lib_1';

function req(url = 'http://localhost/join/XKF72M9Q') {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCreate.mockResolvedValue({});
  mockMemberUpdate.mockResolvedValue({});
  mockMemberUpdateMany.mockResolvedValue({ count: 1 });
  mockRecordJoinCodeUse.mockResolvedValue(undefined);
  mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner_1' });
  mockResolveJoinCode.mockResolvedValue({ id: CODE_ID, collectionId: LIB });
});

describe('handleJoinCodeLanding', () => {
  it('returns null when no active join code matches, so the route can try invitations', async () => {
    mockResolveJoinCode.mockResolvedValue(null);
    expect(await handleJoinCodeLanding(req(), 'NOPE1234')).toBeNull();
  });

  it('normalizes the code on the way to resolution', async () => {
    await handleJoinCodeLanding(req(), 'xkf7-2m9q');
    expect(mockResolveJoinCode).toHaveBeenCalledWith('XKF72M9Q');
  });

  describe('signed out — the corkboard stranger', () => {
    beforeEach(() => mockGetServerSession.mockResolvedValue(null));

    it('shows the guest preview rather than sending them to sign in', async () => {
      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');
      expect(res!.status).toBe(307);
      const location = res!.headers.get('location')!;
      expect(location).toContain(`/library/${LIB}`);
      expect(location).toContain('guest=1');
      expect(location).not.toContain('/auth/signin');
    });

    it('carries the code in a jc:-prefixed invite cookie', async () => {
      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');
      expect(res!.cookies.get('invite_token')?.value).toBe(`jc:${CODE_ID}`);
      expect(res!.cookies.get('invite_library')?.value).toBe(LIB);
    });

    it('grants no membership before they have decided', async () => {
      await handleJoinCodeLanding(req(), 'XKF72M9Q');
      expect(mockMemberCreate).not.toHaveBeenCalled();
      expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
    });
  });

  describe('signed in', () => {
    it('adds a new member, records provenance, and counts the use', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'u1', email: 'stranger@example.com' },
      });
      mockMemberFindUnique.mockResolvedValue(null);

      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(mockMemberCreate).toHaveBeenCalled();
      expect(mockMemberUpdateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', collectionId: LIB },
        data: { joinedViaCodeId: CODE_ID },
      });
      expect(mockRecordJoinCodeUse).toHaveBeenCalledWith(CODE_ID);
      expect(res!.headers.get('location')).toContain(
        'message=joined_successfully'
      );
    });

    it('counts a reactivated membership too', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
      mockMemberFindUnique.mockResolvedValue({ id: 'm1', isActive: false });

      await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(mockRecordJoinCodeUse).toHaveBeenCalledWith(CODE_ID);
    });

    // A join code is multi-use; someone re-scanning the same flyer must not
    // inflate the count the owner reads as "how many people did this bring in".
    it('does not count a use for someone who is already a member', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
      mockMemberFindUnique.mockResolvedValue({ id: 'm1', isActive: true });

      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
      expect(mockMemberUpdateMany).not.toHaveBeenCalled();
      expect(res!.headers.get('location')).toContain('message=already_member');
    });

    it('does not count a use for the owner testing their own flyer', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'owner_1' } });

      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(mockRecordJoinCodeUse).not.toHaveBeenCalled();
      expect(mockMemberCreate).not.toHaveBeenCalled();
      expect(res!.headers.get('location')).toContain('message=own_library');
    });

    // Join codes are bearer by design — there is no address to match against.
    it('never consults an invitation or an address', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'u1', email: 'anyone@example.com' },
      });
      mockMemberFindUnique.mockResolvedValue(null);

      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(mockInvitationFindFirst).not.toHaveBeenCalled();
      expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
      expect(res!.headers.get('location')).not.toContain('wrong_account');
    });

    it('clears the invite cookies once the join is done', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
      mockMemberFindUnique.mockResolvedValue(null);

      const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');

      expect(res!.cookies.get('invite_token')?.value).toBe('');
    });
  });

  // A database blip is not a bad guess; it must be distinguishable from a miss
  // or the rate limiter starts punishing users for our outage.
  it('reports an error rather than a miss when resolution throws', async () => {
    mockResolveJoinCode.mockRejectedValue(new Error('db down'));
    const res = await handleJoinCodeLanding(req(), 'XKF72M9Q');
    expect(res).not.toBeNull();
    expect(res!.headers.get('location')).toContain('invite=error');
  });
});
