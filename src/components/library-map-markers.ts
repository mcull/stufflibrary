// DOM builders for the library map's markers.
//
// Built node by node with `textContent` rather than `innerHTML`. Display names
// are user-controlled, and these markers used to interpolate them straight into
// markup — including into an inline `onerror=` attribute, where a name like
// `<img src=x onerror=alert(1)>` was live script in every viewer's page. There
// is no escape helper here on purpose: the injection surface is gone rather
// than patched, because an escape helper only works while everyone remembers
// to call it.
//
// Kept out of the component so the construction can be tested directly,
// against a real DOM, without standing up a fake Google Maps.

import type { MemberArea } from '@/lib/member-location-privacy';

/**
 * Only members the caller could actually place. Coordinates are required: a
 * member whose location we don't know is left off the map, never invented.
 */
export interface LibraryMember {
  id: string;
  name?: string | null;
  image?: string | null;
  latitude: number;
  longitude: number;
}

function styled<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  return el;
}

/** The letter we fall back to when there's no avatar to show. */
function initialOf(name?: string | null): string {
  return name?.trim()?.[0] ?? 'A';
}

export function displayName(name?: string | null): string {
  return name?.trim() || 'Anonymous';
}

/**
 * One member's pin: a circular avatar, or their initial if there's no image
 * (or the image fails to load).
 */
export function buildMemberPin(
  member: LibraryMember,
  { isCurrentUser }: { isCurrentUser: boolean }
): HTMLDivElement {
  const size = isCurrentUser ? 56 : 40;

  const pin = styled('div', {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    border: `${isCurrentUser ? 3 : 2}px solid ${isCurrentUser ? '#1976d2' : '#ffffff'}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const showInitial = () => {
    // textContent, so a name is text forever — never re-parsed as markup.
    pin.textContent = initialOf(member.name);
    Object.assign(pin.style, {
      fontSize: `${size * 0.4}px`,
      fontWeight: 'bold',
      color: '#666',
    });
  };

  if (member.image) {
    const img = styled('img', {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    });
    // Assigned as properties, not spliced into an attribute string: there is
    // no quote for a name or a url to break out of.
    img.src = member.image;
    img.alt = displayName(member.name);
    // Replaces the old inline onerror= attribute, which was the sharpest edge
    // here — it ran a name through the HTML parser and then a JS string.
    img.addEventListener('error', () => {
      img.remove();
      showInitial();
    });
    pin.appendChild(img);
  } else {
    showInitial();
  }

  pin.addEventListener('mouseenter', () => {
    pin.style.transform = 'scale(1.1)';
  });
  pin.addEventListener('mouseleave', () => {
    pin.style.transform = 'scale(1)';
  });

  return pin;
}

/**
 * The card shown when a pin is clicked: avatar, full name, and a "(You)" tag.
 * Only ever built for viewers who were given members in the first place —
 * outsiders get areas, which have no card.
 */
export function buildMemberInfoCard(
  member: LibraryMember,
  { isCurrentUser }: { isCurrentUser: boolean }
): HTMLDivElement {
  const card = styled('div', {
    padding: '12px',
    textAlign: 'center',
    fontFamily: "'Roboto', sans-serif",
  });

  const avatarRow = styled('div', { marginBottom: '8px' });
  if (member.image) {
    const img = styled('img', {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '2px solid #fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    });
    img.src = member.image;
    img.alt = displayName(member.name);
    avatarRow.appendChild(img);
  } else {
    const fallback = styled('div', {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#1976d2',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      margin: '0 auto',
    });
    fallback.textContent = initialOf(member.name);
    avatarRow.appendChild(fallback);
  }
  card.appendChild(avatarRow);

  const name = styled('strong', { color: '#333' });
  name.textContent = displayName(member.name);
  card.appendChild(name);

  if (isCurrentUser) {
    card.appendChild(document.createElement('br'));
    const you = styled('span', { color: '#1976d2', fontWeight: '600' });
    you.textContent = '(You)';
    card.appendChild(you);
  }

  return card;
}

/**
 * An outsider's view of a cluster: how many neighbors round to this ~1.1km
 * point, and nothing else. No name, no face, no click target — there is no
 * individual behind a badge to reveal.
 */
export function buildAreaBadge(area: MemberArea): HTMLDivElement {
  const badge = styled('div', {
    minWidth: '40px',
    height: '40px',
    padding: '0 8px',
    borderRadius: '20px',
    border: '2px solid #ffffff',
    background: 'rgba(30, 58, 95, 0.85)',
    color: '#ffffff',
    fontFamily: "'Roboto', sans-serif",
    fontWeight: '700',
    fontSize: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  badge.textContent = String(area.count);
  return badge;
}

export function areaTitle(area: MemberArea): string {
  return `${area.count} member${area.count === 1 ? '' : 's'} near here`;
}
