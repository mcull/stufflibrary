import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('../auth', () => ({
  authOptions: {},
}));

import { isAdmin, requireAdminAuth } from '../admin-auth';

describe('admin-auth', () => {
  const ORIGINAL = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = ORIGINAL;
  });

  describe('isAdmin', () => {
    it('grants access to an allowlisted GitHub username', () => {
      expect(isAdmin({ user: { githubUsername: 'mcull' } })).toBe(true);
    });

    it('grants access to an allowlisted email (case-insensitive)', () => {
      process.env.ADMIN_EMAILS = 'marc.cull@gmail.com';
      expect(isAdmin({ user: { email: 'Marc.Cull@Gmail.com' } })).toBe(true);
    });

    it('supports a comma-separated list of admin emails', () => {
      process.env.ADMIN_EMAILS = 'a@x.com, marc.cull@gmail.com ,b@y.com';
      expect(isAdmin({ user: { email: 'marc.cull@gmail.com' } })).toBe(true);
    });

    it('denies a non-allowlisted user', () => {
      process.env.ADMIN_EMAILS = 'marc.cull@gmail.com';
      expect(isAdmin({ user: { email: 'stranger@example.com' } })).toBe(false);
    });

    it('denies when there is no session', () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin({})).toBe(false);
    });

    it('does not grant access on empty ADMIN_EMAILS', () => {
      process.env.ADMIN_EMAILS = '';
      expect(isAdmin({ user: { email: 'marc.cull@gmail.com' } })).toBe(false);
    });
  });

  describe('requireAdminAuth', () => {
    it('throws when unauthenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(requireAdminAuth()).rejects.toThrow(/auth/i);
    });

    it('throws when authenticated but not an admin', async () => {
      process.env.ADMIN_EMAILS = 'marc.cull@gmail.com';
      mockGetServerSession.mockResolvedValue({
        user: { email: 'stranger@example.com' },
      });
      await expect(requireAdminAuth()).rejects.toThrow(/admin/i);
    });

    it('returns the session for an allowlisted email', async () => {
      process.env.ADMIN_EMAILS = 'marc.cull@gmail.com';
      const session = { user: { email: 'marc.cull@gmail.com' } };
      mockGetServerSession.mockResolvedValue(session);
      await expect(requireAdminAuth()).resolves.toBe(session);
    });

    it('returns the session for an allowlisted GitHub username', async () => {
      const session = { user: { githubUsername: 'mcull' } };
      mockGetServerSession.mockResolvedValue(session);
      await expect(requireAdminAuth()).resolves.toBe(session);
    });
  });
});
