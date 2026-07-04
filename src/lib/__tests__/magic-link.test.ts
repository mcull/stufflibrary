import { describe, it, expect } from 'vitest';

import { buildMagicSignInLink } from '../auth-codes';

describe('buildMagicSignInLink', () => {
  it('builds a one-tap sign-in link carrying the email and code', () => {
    const link = buildMagicSignInLink(
      'marc+t630c@cull.ventures',
      '123456',
      'https://www.stufflibrary.org'
    );
    expect(link).toBe(
      'https://www.stufflibrary.org/auth/signin?magic=true&auto=true&email=marc%2Bt630c%40cull.ventures&code=123456'
    );
  });

  it('tolerates a trailing slash on the base url', () => {
    const link = buildMagicSignInLink(
      'a@b.c',
      '654321',
      'https://www.stufflibrary.org/'
    );
    expect(link).toContain('https://www.stufflibrary.org/auth/signin?');
  });

  it('returns null without a base url (email falls back to code-only)', () => {
    expect(buildMagicSignInLink('a@b.c', '123456', undefined)).toBeNull();
    expect(buildMagicSignInLink('a@b.c', '123456', '')).toBeNull();
  });
});
