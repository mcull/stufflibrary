import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockHandleInviteLanding = vi.hoisted(() => vi.fn());

vi.mock('@/lib/invite', () => ({
  handleInviteLanding: mockHandleInviteLanding,
}));

import { GET } from '../route';

describe('GET /api/invitations/[token] — legacy entry, sunset (§6.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the current invite landing instead of magic-link auto-sign-in', async () => {
    const landed = NextResponse.redirect(
      'http://localhost/library/lib_1?guest=1'
    );
    mockHandleInviteLanding.mockResolvedValue(landed);
    const request = new NextRequest('http://localhost/api/invitations/tok_abc');

    const res = await GET(request, {
      params: Promise.resolve({ token: 'tok_abc' }),
    });

    expect(mockHandleInviteLanding).toHaveBeenCalledWith(request, 'tok_abc');
    expect(res).toBe(landed);
  });
});
