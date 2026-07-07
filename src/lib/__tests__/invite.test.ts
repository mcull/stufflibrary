import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockMemberFindUnique = vi.hoisted(() => vi.fn());
const mockMemberCreate = vi.hoisted(() => vi.fn());
const mockMemberUpdate = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
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
    expect(r).toEqual({ created: true, reactivated: false });
  });
  it('reactivates an inactive membership', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: false });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { isActive: true },
    });
    expect(r).toEqual({ created: false, reactivated: true });
  });
  it('is a no-op when already active', async () => {
    mockMemberFindUnique.mockResolvedValueOnce({ id: 'm1', isActive: true });
    const r = await ensureActiveMembership('u1', 'c1');
    expect(mockMemberCreate).not.toHaveBeenCalled();
    expect(mockMemberUpdate).not.toHaveBeenCalled();
    expect(r).toEqual({ created: false, reactivated: false });
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
  it('authenticated user joins and is redirected to the collection', async () => {
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
