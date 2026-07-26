import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';

import { clientIp } from '../client-ip';

function req(headers: Record<string, string>) {
  return new NextRequest('http://localhost/join/X', { headers });
}

describe('clientIp', () => {
  it('takes the first entry of x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7'
    );
  });

  it('falls back to x-real-ip', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('falls back to a shared bucket when no address is present', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
