import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockHandleJoinCodeLanding = vi.hoisted(() => vi.fn());
const mockHandleInviteLanding = vi.hoisted(() => vi.fn());
const mockInvitationFindFirst = vi.hoisted(() => vi.fn());
const mockIsBlocked = vi.hoisted(() => vi.fn());
const mockRecordFailure = vi.hoisted(() => vi.fn());

vi.mock('@/lib/invite', () => ({
  handleJoinCodeLanding: mockHandleJoinCodeLanding,
  handleInviteLanding: mockHandleInviteLanding,
}));
vi.mock('@/lib/db', () => ({
  db: { invitation: { findFirst: mockInvitationFindFirst } },
}));
vi.mock('@/lib/join-code-rate-limit', () => ({
  isJoinLookupBlocked: mockIsBlocked,
  recordJoinLookupFailure: mockRecordFailure,
}));

import { GET } from '../route';

const IP = '203.0.113.7';

function call(code: string, headers: Record<string, string> = {}) {
  const request = new NextRequest(`http://localhost/join/${code}`, { headers });
  return GET(request, { params: Promise.resolve({ code }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBlocked.mockResolvedValue(false);
  mockRecordFailure.mockResolvedValue(undefined);
  mockInvitationFindFirst.mockResolvedValue(null);
  mockHandleJoinCodeLanding.mockResolvedValue(null);
  mockHandleInviteLanding.mockResolvedValue(
    NextResponse.redirect('http://localhost/library/lib_2?guest=1')
  );
});

describe('GET /join/[code] — dispatch', () => {
  it('serves a join code when one resolves, without touching invitations', async () => {
    const landed = NextResponse.redirect(
      'http://localhost/library/lib_1?guest=1'
    );
    mockHandleJoinCodeLanding.mockResolvedValue(landed);

    const res = await call('XKF72M9Q');

    expect(res).toBe(landed);
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
    expect(mockHandleInviteLanding).not.toHaveBeenCalled();
  });

  it('falls through to a personal invitation short code', async () => {
    mockInvitationFindFirst.mockResolvedValue({ token: 'tok_abc' });

    const res = await call('ABCD1234');

    expect(mockHandleInviteLanding).toHaveBeenCalledWith(
      expect.anything(),
      'tok_abc'
    );
    expect(res.headers.get('location')).toContain('/library/lib_2');
  });

  it('looks up the short code in its normalized form', async () => {
    await call('xkf7-2m9q');

    expect(mockHandleJoinCodeLanding).toHaveBeenCalledWith(
      expect.anything(),
      'XKF72M9Q'
    );
    expect(mockInvitationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortCode: 'XKF72M9Q' } })
    );
  });

  it('redirects to invite=invalid when nothing matches', async () => {
    const res = await call('ZZZZZZZZ');
    expect(res.headers.get('location')).toContain('invite=invalid');
  });
});

describe('GET /join/[code] — failure throttling', () => {
  it('records a failure only when the lookup missed', async () => {
    await call('ZZZZZZZZ', { 'x-forwarded-for': IP });
    expect(mockRecordFailure).toHaveBeenCalledWith(IP);
  });

  it('does not count a join code that resolved', async () => {
    mockHandleJoinCodeLanding.mockResolvedValue(
      NextResponse.redirect('http://localhost/library/lib_1?guest=1')
    );
    await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('does not count an invitation short code that resolved', async () => {
    mockInvitationFindFirst.mockResolvedValue({ token: 'tok_abc' });
    await call('ABCD1234', { 'x-forwarded-for': IP });
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it('consults the limiter on every request', async () => {
    await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(mockIsBlocked).toHaveBeenCalledWith(IP);
  });

  it('refuses a blocked client with 429', async () => {
    mockIsBlocked.mockResolvedValue(true);
    const res = await call('ZZZZZZZZ', { 'x-forwarded-for': IP });
    expect(res.status).toBe(429);
  });

  // The point of the limiter. Checking only after the work leaves the oracle
  // wide open: a sweeper over budget would still learn which codes are real,
  // because a hit would still be served.
  it('refuses a blocked client even when the code is valid, before any lookup', async () => {
    mockIsBlocked.mockResolvedValue(true);
    mockHandleJoinCodeLanding.mockResolvedValue(
      NextResponse.redirect('http://localhost/library/lib_1?guest=1')
    );

    const res = await call('XKF72M9Q', { 'x-forwarded-for': IP });

    expect(res.status).toBe(429);
    expect(mockHandleJoinCodeLanding).not.toHaveBeenCalled();
    expect(mockInvitationFindFirst).not.toHaveBeenCalled();
  });

  // An outage is not a guess.
  it('does not count an error response as a failed guess', async () => {
    mockHandleJoinCodeLanding.mockResolvedValue(
      NextResponse.redirect('http://localhost/?invite=error')
    );
    await call('XKF72M9Q', { 'x-forwarded-for': IP });
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });
});

describe('GET /join/[code] — client identity', () => {
  it('takes the first entry of x-forwarded-for', async () => {
    await call('ZZZZZZZZ', { 'x-forwarded-for': `${IP}, 10.0.0.1, 10.0.0.2` });
    expect(mockIsBlocked).toHaveBeenCalledWith(IP);
  });

  it('falls back to x-real-ip', async () => {
    await call('ZZZZZZZZ', { 'x-real-ip': IP });
    expect(mockIsBlocked).toHaveBeenCalledWith(IP);
  });

  it('falls back to a shared bucket when no address is present', async () => {
    await call('ZZZZZZZZ');
    expect(mockIsBlocked).toHaveBeenCalledWith('unknown');
  });
});
