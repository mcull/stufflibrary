import { describe, it, expect } from 'vitest';

import { buildLibraryInviteEmail, STOCK_WATERCOLORS } from '../invite-email';

const base = {
  libraryName: 'Audit Test Shelf',
  senderName: 'Marc Cull',
  shareLink: 'https://www.stufflibrary.org/j/tok123',
};

describe('buildLibraryInviteEmail — subject', () => {
  it('names the inviter and library, with no exclamation point', () => {
    const { subject } = buildLibraryInviteEmail(base);
    expect(subject).toBe('Marc invited you to Audit Test Shelf');
    expect(subject).not.toContain('!');
  });

  it('appends a location descriptor when the library has one', () => {
    const { subject } = buildLibraryInviteEmail({
      ...base,
      location: 'Summit Rd',
    });
    expect(subject).toBe(
      'Marc invited you to Audit Test Shelf — the stuff library for Summit Rd'
    );
  });

  it('falls back to "Someone" when there is no sender name', () => {
    const { subject } = buildLibraryInviteEmail({
      ...base,
      senderName: null,
    });
    expect(subject).toBe('Someone invited you to Audit Test Shelf');
  });
});

describe('buildLibraryInviteEmail — brand + art', () => {
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

  it('states the item count when provided (plural), omits it otherwise', () => {
    const withCount = buildLibraryInviteEmail({ ...base, itemCount: 25 }).html;
    expect(withCount).toContain('25 things');
    const withoutCount = buildLibraryInviteEmail(base).html;
    expect(withoutCount).not.toMatch(/\bthings on the shelves\b/);
  });

  it('states the item count in the singular for one item', () => {
    const { html } = buildLibraryInviteEmail({ ...base, itemCount: 1 });
    expect(html).toContain('1 thing on the shelves');
  });
});

describe('buildLibraryInviteEmail — note', () => {
  it('renders the sender note when provided', () => {
    const { html, text } = buildLibraryInviteEmail({
      ...base,
      note: 'Grab the miter saw before Dan does.',
    });
    expect(html).toContain('Grab the miter saw before Dan does.');
    expect(text).toContain('Grab the miter saw before Dan does.');
  });

  it('renders a default sentence when the note is blank', () => {
    const { html } = buildLibraryInviteEmail({ ...base, note: '   ' });
    expect(html).toContain('set aside a library card for you');
  });

  it('escapes HTML in the note and other user fields (injection guard)', () => {
    const { html } = buildLibraryInviteEmail({
      ...base,
      note: '<script>alert(1)</script>',
      libraryName: '<b>x</b>',
      senderName: 'A & B',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('A &amp; B');
  });
});

describe('buildLibraryInviteEmail — text part + essentials', () => {
  it('returns a non-empty plain-text part carrying the link', () => {
    const { text } = buildLibraryInviteEmail(base);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain(base.shareLink);
  });

  it('keeps the join link, the 7-day notice, and the reply line', () => {
    const { html } = buildLibraryInviteEmail(base);
    expect(html).toContain(base.shareLink);
    expect(html).toContain('7 days');
    expect(html).toContain('it goes to Marc');
  });

  it('no longer promises an auto-created account', () => {
    const { html, text } = buildLibraryInviteEmail(base);
    expect(html).not.toContain('created for you automatically');
    expect(text).not.toContain('created for you automatically');
  });

  it('states the count in the text part without doubling "on the shelves"', () => {
    const { text } = buildLibraryInviteEmail({ ...base, itemCount: 25 });
    expect(text).toContain('On the shelves: 25 things.');
    expect(text).not.toContain('25 things on the shelves');
  });
});
