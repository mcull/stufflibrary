import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  collection: { findFirst: vi.fn(), findUnique: vi.fn() },
  collectionMember: { findFirst: vi.fn(), count: vi.fn() },
  invitation: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  item: { findMany: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  joinCode: { findFirst: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ db }));
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: vi.fn().mockResolvedValue({ canInvite: true }),
}));
vi.mock('@/lib/join-code-service', () => ({
  createJoinCode: vi.fn(),
  generateJoinCode: vi.fn(() => 'SHORTCODE'),
}));

import { POST } from '../route';

const LIBRARY_ID = 'lib_1';
const SENDER_ID = 'sender_1';

function request(body: Record<string, unknown>) {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}/invite`,
    json: async () => body,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = 'https://www.stufflibrary.org';
  process.env.RESEND_API_KEY = 'test';
  mockGetServerSession.mockResolvedValue({ user: { id: SENDER_ID } });
  db.collection.findFirst.mockResolvedValue({
    id: LIBRARY_ID,
    name: 'HAASS',
    location: 'Summit Rd',
    description: null,
    ownerId: SENDER_ID,
    owner: { name: 'Marc Cull', email: 'owner@example.com' },
    _count: {},
  });
  db.collection.findUnique.mockResolvedValue({
    id: LIBRARY_ID,
    name: 'HAASS',
    location: 'Summit Rd',
    description: null,
    owner: { name: 'Marc Cull', email: 'owner@example.com' },
    _count: {},
  });
  db.collectionMember.findFirst.mockResolvedValue(null);
  db.invitation.findFirst.mockResolvedValue(null);
  db.invitation.count.mockResolvedValue(0);
  db.invitation.create.mockResolvedValue({
    id: 'inv_1',
    email: 'nora@example.com',
    expiresAt: new Date(Date.now() + 7 * 864e5),
    collection: { name: 'HAASS', location: 'Summit Rd' },
    sender: { name: 'Marc Cull', email: 'marc.cull@gmail.com' },
  });
  db.invitation.update.mockResolvedValue({});
  db.item.findMany.mockResolvedValue([]);
  db.item.count.mockResolvedValue(25);
});

describe('POST /api/collections/[id]/invite — email dispatch', () => {
  it('sends with a personal from-name, the sender reply-to, and a text part', async () => {
    await POST(request({ email: 'nora@example.com', mode: 'email' }), {
      params: Promise.resolve({ id: LIBRARY_ID }),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0]![0];
    expect(arg.from).toBe(
      '"Marc Cull (via StuffLibrary)" <invites@stufflibrary.org>'
    );
    expect(arg.replyTo).toBe('marc.cull@gmail.com');
    expect(arg.subject).toBe(
      'Marc invited you to HAASS — the stuff library for Summit Rd'
    );
    expect(typeof arg.text).toBe('string');
    expect(arg.text.length).toBeGreaterThan(0);
  });

  it('threads a trimmed sender note into the email', async () => {
    await POST(
      request({
        email: 'nora@example.com',
        mode: 'email',
        note: '  Grab the saw before Dan does.  ',
      }),
      { params: Promise.resolve({ id: LIBRARY_ID }) }
    );
    const arg = mockSend.mock.calls[0]![0];
    expect(arg.html).toContain('Grab the saw before Dan does.');
    expect(arg.html).not.toContain('  Grab'); // trimmed
  });

  it('falls back cleanly when the sender has no name or email', async () => {
    db.invitation.create.mockResolvedValue({
      id: 'inv_1',
      email: 'nora@example.com',
      expiresAt: new Date(Date.now() + 7 * 864e5),
      collection: { name: 'HAASS', location: 'Summit Rd' },
      sender: { name: null, email: null },
    });
    await POST(request({ email: 'nora@example.com', mode: 'email' }), {
      params: Promise.resolve({ id: LIBRARY_ID }),
    });
    const arg = mockSend.mock.calls[0]![0];
    expect(arg.from).toBe('StuffLibrary <invites@stufflibrary.org>');
    expect(arg.replyTo).toBeUndefined();
    expect(arg.subject).toBe('Someone invited you to HAASS');
  });
});
