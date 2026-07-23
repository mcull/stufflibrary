import { describe, it, expect } from 'vitest';

import { buildPostAuthCallbackUrl, safeRelativePath } from '../post-auth';

describe('safeRelativePath', () => {
  it('accepts a same-origin relative path', () => {
    expect(safeRelativePath('/feedback')).toBe('/feedback');
    expect(safeRelativePath('/library/abc?guest=1')).toBe(
      '/library/abc?guest=1'
    );
  });
  it('rejects absolute URLs', () => {
    expect(safeRelativePath('https://evil.example/x')).toBeNull();
  });
  it('rejects protocol-relative URLs', () => {
    expect(safeRelativePath('//evil.example/x')).toBeNull();
  });
  it('rejects empty and missing values', () => {
    expect(safeRelativePath('')).toBeNull();
    expect(safeRelativePath(null)).toBeNull();
    expect(safeRelativePath(undefined)).toBeNull();
  });
  it('rejects backslash authority-injection tricks browsers normalize', () => {
    expect(safeRelativePath('/\\evil.example')).toBeNull();
    expect(safeRelativePath('/\\/evil.example')).toBeNull();
  });
  it('rejects control characters', () => {
    expect(safeRelativePath('/foo\nbar')).toBeNull();
    expect(safeRelativePath('/foo\tbar')).toBeNull();
  });
});

describe('buildPostAuthCallbackUrl', () => {
  it('routes through /auth/callback with no extras by default', () => {
    expect(buildPostAuthCallbackUrl({})).toBe('/auth/callback');
  });
  it('demotes a requested callbackUrl to a next= fallback — never a replacement', () => {
    expect(buildPostAuthCallbackUrl({ requested: '/feedback' })).toBe(
      '/auth/callback?next=%2Ffeedback'
    );
  });
  it('drops an unsafe requested destination', () => {
    expect(
      buildPostAuthCallbackUrl({ requested: 'https://evil.example' })
    ).toBe('/auth/callback');
    expect(buildPostAuthCallbackUrl({ requested: '//evil.example' })).toBe(
      '/auth/callback'
    );
    expect(buildPostAuthCallbackUrl({ requested: '/\\evil.example' })).toBe(
      '/auth/callback'
    );
  });
  it('does not point the callback at itself', () => {
    expect(buildPostAuthCallbackUrl({ requested: '/auth/callback' })).toBe(
      '/auth/callback'
    );
  });
  it('carries the legacy invitation params', () => {
    expect(
      buildPostAuthCallbackUrl({ invitationToken: 'tok', libraryId: 'lib' })
    ).toBe('/auth/callback?invitation=tok&library=lib');
  });
});
