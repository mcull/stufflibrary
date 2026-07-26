import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockResolveJoinCode = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockIsBlocked = vi.hoisted(() => vi.fn());
const mockRecordFailure = vi.hoisted(() => vi.fn());

vi.mock('@/lib/join-code-service', () => ({
  resolveJoinCode: mockResolveJoinCode,
}));
vi.mock('@/lib/db', () => ({
  db: { invitation: { findFirst: mockInvitationFindFirst } },
}));
vi.mock('@/lib/join-code-rate-limit', () => ({
  isJoinLookupBlocked: mockIsBlocked,
  recordJoinLookupFailure: mockRecordFailure,
}));

import { POST } from '../route';

const IP = '203.0.113.7';

function call(code: unknown, headers: Record<string, string> = {}) {
  const request = new NextRequest('http://localhost/api/join/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ code }),
  });
  return POST(request);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBlocked.mockResolvedValue(false);
  mockRecordFailure.mockResolvedValue(undefined);
  mockResolveJoinCode.mockResolvedValue(null);
  mockInvitationFindFirst.mockResolvedValue(null);
});

describe('POST /api/join/resolve', () => {
  it('returns ok for a join code, without touching invitations', async () => {
    mockResolveJoinCode.mockResolvedValue({
      id: 'jc_1',
      collectionId: 'lib_1',
    });
    const res = await call('XKF72M9Q');
    expect(await res.json()).toEqual({ ok: true });
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('falls through to a personal invitation short code', async () => {
    mockInvitationFindFirst.mockResolvedValue({ id: 'inv_1' });
    const res = await call('ABCD1234');
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('normalizes before looking up', async () => {
    await call('xkf7-2m9q');
    expect(mockResolveJoinCode).toHaveBeenCalledWith('XKF72M9Q');
    expect(mockInvitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortCode: 'XKF72M9Q' } })
    );
  });

  it('returns ok:false and records the miss when nothing matches', async () => {
    const res = await call('ZZZZZZZZ', { 'x-forwarded-for': IP });
    expect(await res.json()).toEqual({ ok: false });
    expect(mockRecordFailure).toHaveBeenCalledWith(IP);
  });

  it('consults the limiter on every request', async () => {
    await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(mockIsBlocked).toHaveBeenCalledWith(IP);
  });

  it('refuses a blocked client with 429 before any lookup', async () => {
    mockIsBlocked.mockResolvedValue(true);
    const res = await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(res.status).toBe(429);
    expect(mockResolveJoinCode).not.toHaveBeenCalled();
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing code with 400 and does not count it as a guess', async () => {
    const res = await call(undefined, { 'x-forwarded-for': IP });
    expect(res.status).toBe(400);
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  // An outage is not a guess: a thrown lookup must not spend throttle budget.
  it('does not count a thrown lookup as a failed guess', async () => {
    mockResolveJoinCode.mockRejectedValue(new Error('db down'));
    await expect(call('XKF72M9Q', { 'x-forwarded-for': IP })).rejects.toThrow();
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });
});
