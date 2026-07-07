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
  ensureActiveMembership,
  acceptInvitation,
  validateLibraryInvite,
  handleInviteLanding,
} from '../invite';

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCreate.mockResolvedValue({});
  mockMemberUpdate.mockResolvedValue({});
  mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  // Default: the acting user is NOT the library owner.
  mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner-1' });
});

describe('ensureActiveMembership', () => {
  it('creates a membership when none exists', async () => {
    mockMemberFindUnique.mockResolvedValueOnce(null);
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        collectionId: 'c1',
        role: 'member',
        isActive: true,
      },
    });
    expect(r).toEqual({ created: true, reactivated: false, owner: false });
  });
  it('reactivates an inactive membership', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: false });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { isActive: true },
    });
    expect(r).toEqual({ created: false, reactivated: true, owner: false });
  });
  it('is a no-op when already active', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: true });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    expect(r).toEqual({ created: false, reactivated: false, owner: false });
  });
  it('never creates a member row for the library owner (#409)', async () => {
    mockCollectionFindUnique.mockResolvedValue({ ownerId: 'u1' });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    expect(r).toEqual({ created: false, reactivated: false, owner: true });
  });
});

describe('acceptInvitation', () => {
  it('marks the invitation accepted by the user', async () => {
    await acceptInvitation('tok', 'c1', 'u1');
    expect(mockInvitationUpdateMany).toHaveBeenCalledWith({
      where: { token: 'tok', libraryId: 'c1' },
      data: {
        status: 'ACCEPTED',
        acceptedAt: expect.any(Date),
        receiverId: 'u1',
      },
    });
  });
});

describe('validateLibraryInvite', () => {
  it('returns ok with the invitation when valid', async () => {
    const future = new Date(Date.now() + 86400000);
    mockInvitationFindFirst.mockResolvedValueOnce({
      libraryId: 'c1',
      expiresAt: future,
    });
    const r = await validateLibraryInvite('tok');
    expect(r).toEqual({
      ok: true,
      invitation: { libraryId: 'c1', expiresAt: future },
    });
  });
  it('returns invalid when not found', async () => {
    mockInvitationFindFirst.mockResolvedValueOnce(null);
    expect(await validateLibraryInvite('tok')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });
  it('returns expired when past expiry', async () => {
    const past = new Date(Date.now() - 1000);
    mockInvitationFindFirst.mockResolvedValueOnce({
      libraryId: 'c1',
      expiresAt: past,
    });
    expect(await validateLibraryInvite('tok')).toEqual({
      ok: false,
      reason: 'expired',
    });
  });
});

describe('handleInviteLanding', () => {
  it('authenticated user joins, invitation is consumed, redirected to the library', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
    mockMemberFindUnique.mockResolvedValue(null);
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/library/c1?message=joined_successfully'
    );
    expect(mockMemberCreate).toHaveBeenCalled();
    expect(mockInvitationUpdateMany).toHaveBeenCalled();
  });

  it('owner clicking their own invite link neither joins nor consumes it (#409)', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'owner-1' } });
    mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner-1' });
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/library/c1?message=own_library'
    );
    expect(mockMemberCreate).not.toHaveBeenCalled();
    // The invitation stays live for its actual addressee.
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it('an existing active member does not consume the invitation (#409)', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
    mockMemberFindUnique.mockResolvedValue({ id: 'm1', isActive: true });
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain(
      '/library/c1?message=already_member'
    );
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });
  it('invalid token redirects home with invite=invalid', async () => {
    mockInvitationFindFirst.mockResolvedValue(null);
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.headers.get('location')).toContain('/?invite=invalid');
  });
  it('expired token redirects home with invite=expired', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.headers.get('location')).toContain('/?invite=expired');
  });
  it('unauthenticated user gets guest cookies and redirected to collection?guest=1', async () => {
    mockInvitationFindFirst.mockResolvedValue({
      libraryId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockGetServerSession.mockResolvedValue(null);
    const res = await handleInviteLanding(
      { url: 'https://x/j/tok' } as any,
      'tok'
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/library/c1?guest=1');
  });
});
