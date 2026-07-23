import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { GET } from '../route';

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/magic-link?token=${token}`
    : 'http://localhost/api/auth/magic-link';
  return new NextRequest(url);
}

describe('GET /api/auth/magic-link — sunset (§6.3)', () => {
  it('redirects a token into the current invite flow, creating and signing in nothing', async () => {
    const res = await GET(makeRequest('tok_abc'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/invite/tok_abc');
  });

  it('redirects home with invite=invalid when the token is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/?invite=invalid'
    );
  });
});
