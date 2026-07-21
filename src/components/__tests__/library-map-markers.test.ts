import { describe, it, expect } from 'vitest';

import {
  buildAreaBadge,
  buildMemberInfoCard,
  buildMemberPin,
  areaTitle,
  displayName,
  type LibraryMember,
} from '../library-map-markers';

// The payload that used to work: this string was spliced into innerHTML, and
// its first character into an inline onerror= attribute.
const XSS_NAME = '<img src=x onerror=alert(1)>';

function member(overrides: Partial<LibraryMember> = {}): LibraryMember {
  return {
    id: 'm1',
    name: 'Ana Restrepo',
    image: null,
    latitude: 37.77,
    longitude: -122.42,
    ...overrides,
  };
}

describe('buildMemberPin', () => {
  it('renders a hostile name as text, not markup', () => {
    const pin = buildMemberPin(member({ name: XSS_NAME }), {
      isCurrentUser: false,
    });

    // The initial is '<', and it is a text node — no element was parsed out of
    // it, and nothing carries an inline handler.
    expect(pin.textContent).toBe('<');
    expect(pin.querySelector('img')).toBeNull();
    expect(pin.getAttribute('onerror')).toBeNull();
    expect(pin.innerHTML).not.toContain('onerror');
  });

  it('shows the initial when there is no avatar', () => {
    const pin = buildMemberPin(member({ image: null }), {
      isCurrentUser: false,
    });
    expect(pin.textContent).toBe('A');
  });

  it('shows the avatar when there is one, with the name only as alt text', () => {
    const pin = buildMemberPin(
      member({ image: 'https://avatars.example/ana.png' }),
      { isCurrentUser: false }
    );

    const img = pin.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://avatars.example/ana.png');
    expect(img?.getAttribute('alt')).toBe('Ana Restrepo');
    expect(img?.getAttribute('onerror')).toBeNull();
  });

  it('falls back to the initial as text when the avatar fails to load', () => {
    const pin = buildMemberPin(
      member({ name: XSS_NAME, image: 'https://avatars.example/broken.png' }),
      { isCurrentUser: false }
    );

    pin.querySelector('img')!.dispatchEvent(new Event('error'));

    expect(pin.querySelector('img')).toBeNull();
    expect(pin.textContent).toBe('<');
    expect(pin.innerHTML).not.toContain('onerror');
  });

  it('gives the current user a larger pin', () => {
    const mine = buildMemberPin(member(), { isCurrentUser: true });
    const theirs = buildMemberPin(member(), { isCurrentUser: false });
    expect(mine.style.width).toBe('56px');
    expect(theirs.style.width).toBe('40px');
  });
});

describe('buildMemberInfoCard', () => {
  it('renders a hostile name as text, not markup', () => {
    const card = buildMemberInfoCard(member({ name: XSS_NAME }), {
      isCurrentUser: false,
    });

    // Present as characters, absent as an element: no <img> was parsed out of
    // it, and serializing the card escapes the angle brackets it came in with.
    expect(card.textContent).toContain(XSS_NAME);
    expect(card.querySelector('img')).toBeNull();
    expect(card.innerHTML).toContain('&lt;img');
    expect(card.innerHTML).not.toContain('<img');
  });

  it('names the member and tags the current user', () => {
    const card = buildMemberInfoCard(member(), { isCurrentUser: true });
    expect(card.textContent).toContain('Ana Restrepo');
    expect(card.textContent).toContain('(You)');
  });

  it('leaves the (You) tag off everyone else', () => {
    const card = buildMemberInfoCard(member(), { isCurrentUser: false });
    expect(card.textContent).not.toContain('(You)');
  });
});

describe('buildAreaBadge', () => {
  it('shows the count and names nobody', () => {
    const badge = buildAreaBadge({ lat: 37.77, lng: -122.42, count: 4 });
    expect(badge.textContent).toBe('4');
    expect(badge.querySelector('img')).toBeNull();
  });

  it('titles an area without identifying anyone in it', () => {
    expect(areaTitle({ lat: 0, lng: 0, count: 1 })).toBe('1 member near here');
    expect(areaTitle({ lat: 0, lng: 0, count: 3 })).toBe('3 members near here');
  });
});

describe('displayName', () => {
  it('falls back to Anonymous for nothing', () => {
    expect(displayName(null)).toBe('Anonymous');
    expect(displayName('   ')).toBe('Anonymous');
    expect(displayName('Ana')).toBe('Ana');
  });
});
