import { describe, it, expect } from 'vitest';

import { buildLibraryInviteEmail, STOCK_WATERCOLORS } from '../invite-email';

const base = {
  libraryName: 'Audit Test Shelf',
  senderName: 'Marc',
  shareLink: 'https://www.stufflibrary.org/j/tok123',
};

describe('buildLibraryInviteEmail (#412 — the brand pass)', () => {
  it('uses the brand palette, not the generic blue template', () => {
    const { html } = buildLibraryInviteEmail(base);
    expect(html).toContain('#F9F5EB'); // warm cream
    expect(html).toContain('#1E3A5F'); // ink blue
    expect(html).not.toContain('#2563eb'); // the old generic blue
  });

  it("shows the library's real item watercolors when it has them", () => {
    const { html } = buildLibraryInviteEmail({
      ...base,
      itemWatercolors: [
        { url: 'https://blob/pillow.webp', name: 'Decorative Pillow' },
      ],
    });
    expect(html).toContain('https://blob/pillow.webp');
    expect(html).toContain('alt="Decorative Pillow"');
  });

  it('falls back to the stock trio for an empty library', () => {
    const { html } = buildLibraryInviteEmail(base);
    for (const art of STOCK_WATERCOLORS) {
      expect(html).toContain(art.url);
    }
  });

  it('speaks the naming ladder and keeps the essentials', () => {
    const { html, subject } = buildLibraryInviteEmail(base);
    expect(subject).toContain('Audit Test Shelf');
    expect(html).toContain('join their library');
    expect(html).not.toContain('sharing community');
    expect(html).toContain(base.shareLink);
    expect(html).toContain('expire in 7 days');
  });

  it('renders the description only when there is one (no empty gray box)', () => {
    const without = buildLibraryInviteEmail(base).html;
    const withDesc = buildLibraryInviteEmail({
      ...base,
      description: 'Tools and camping gear for the block.',
    }).html;
    expect(withDesc).toContain('Tools and camping gear for the block.');
    // The description block exists only in the with-description variant.
    expect(withDesc.length).toBeGreaterThan(without.length);
  });

  it('escapes HTML in user-controlled fields', () => {
    const { html } = buildLibraryInviteEmail({
      ...base,
      libraryName: '<script>alert(1)</script>',
      senderName: 'A & B',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });
});
