import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockInvitationUpdateMany = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockMemberUpdateMany = vi.hoisted(() => vi.fn());
const mockCollectionFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRecordJoinCodeUse = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: {
    invitation: {
      updateMany: mockInvitationUpdateMany,
      findFirst: mockInvitationFindFirst,
    },
    collectionMember: { updateMany: mockMemberUpdateMany },
    collection: { findUnique: mockCollectionFindUnique },
    user: { findUnique: mockUserFindUnique },
  },
}));
vi.mock('@/lib/notification-service', () => ({
  createNotification: mockCreateNotification,
}));
vi.mock('@/lib/join-code-service', () => ({
  recordJoinCodeUse: mockRecordJoinCodeUse,
}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { acceptInvitation, attributeJoinCode } from '../invite';

beforeEach(() => {
  vi.clearAllMocks();
  mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  mockMemberUpdateMany.mockResolvedValue({ count: 1 });
  mockRecordJoinCodeUse.mockResolvedValue(undefined);
  mockCreateNotification.mockResolvedValue({});
  mockUserFindUnique.mockResolvedValue({ name: 'Nora Whitfield' });
});

describe('member-joined notification', () => {
  it('notifies the invitation sender when a bound invite is accepted', async () => {
    mockInvitationFindFirst.mockResolvedValue({ senderId: 'marc' });

    await acceptInvitation('tok', 'lib_1', 'nora');

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const arg = mockCreateNotification.mock.calls[0]![0];
    expect(arg.userId).toBe('marc');
    expect(arg.type).toBe('MEMBER_JOINED');
    expect(arg.actionUrl).toBe('/library/lib_1');
    expect(arg.message).toMatch(/Nora joined/i);
  });

  it('notifies the library owner when a join code is attributed', async () => {
    mockCollectionFindUnique.mockResolvedValue({ ownerId: 'owner_1' });

    await attributeJoinCode('nora', 'lib_1', 'code_1');

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification.mock.calls[0]![0].userId).toBe('owner_1');
  });

  it('does not notify when the recipient is the joiner themselves', async () => {
    mockInvitationFindFirst.mockResolvedValue({ senderId: 'nora' });

    await acceptInvitation('tok', 'lib_1', 'nora');

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('never lets a notification failure break the join (best-effort)', async () => {
    mockInvitationFindFirst.mockResolvedValue({ senderId: 'marc' });
    mockCreateNotification.mockRejectedValue(new Error('notify down'));

    await expect(
      acceptInvitation('tok', 'lib_1', 'nora')
    ).resolves.toBeUndefined();
    expect(mockInvitationUpdateMany).toHaveBeenCalled();
  });

  it('falls back to "A neighbor" when the joiner has no name', async () => {
    mockInvitationFindFirst.mockResolvedValue({ senderId: 'marc' });
    mockUserFindUnique.mockResolvedValue({ name: null });

    await acceptInvitation('tok', 'lib_1', 'nora');

    expect(mockCreateNotification.mock.calls[0]![0].message).toMatch(
      /A neighbor joined/i
    );
  });

  it('falls back to "your library" when the collection lookup misses', async () => {
    // attributeJoinCode and notifyMemberJoined share this same mock: the
    // first call resolves the owner (recipient) lookup, the second resolves
    // the collection-name lookup for the message. Sequencing them lets this
    // test exercise the name fallback without also nulling out the
    // recipient and short-circuiting the notification before it fires.
    mockCollectionFindUnique
      .mockResolvedValueOnce({ ownerId: 'owner_1' })
      .mockResolvedValueOnce(null);

    await attributeJoinCode('nora', 'lib_1', 'code_1');

    expect(mockCreateNotification.mock.calls[0]![0].message).toMatch(
      /your library/i
    );
  });

  it('does not notify when there is no recipient (no sender on the invite)', async () => {
    mockInvitationFindFirst.mockResolvedValue({ senderId: null });

    await acceptInvitation('tok', 'lib_1', 'nora');

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
