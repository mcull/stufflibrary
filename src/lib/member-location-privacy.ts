// Pure helpers (no side-effectful imports — house pure-modules rule) for
// deciding how much of a neighbor's location a given viewer has earned.
//
// The library page promises guests: "We keep member details private until you
// join." This module is where that promise is kept. Members and owners see
// each other's exact pins — neighbors knowing where neighbors live is the
// product working. Everyone else sees a blurred aggregate: coordinates rounded
// to two decimals (~1.1km), identical points merged into one counted area.
//
// Deliberately NOT jittered. A random offset produces a wrong-but-specific
// coordinate, which points at some other real house. An honestly imprecise
// number is safer than a precisely wrong one.

export interface MemberArea {
  lat: number;
  lng: number;
  count: number;
}

export interface Locatable {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

/** What a fellow member is allowed to see of a neighbor's address. */
export interface NeighborAddress {
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface NeighborProfile {
  id: string;
  name: string | null;
  image: string | null;
  status: string | null;
  addresses: NeighborAddress[];
}

const AREA_DECIMALS = 2;
const AREA_FACTOR = 10 ** AREA_DECIMALS;

/** Round to ~1.1km — the width of the area we're willing to name. */
export function roundCoordinate(value: number): number {
  return Math.round(value * AREA_FACTOR) / AREA_FACTOR;
}

/**
 * Blur a set of member positions into counted areas. Anyone without usable
 * coordinates is dropped entirely — never defaulted to 0,0, never invented.
 * Coordinates are only ever populated at profile-save time from client-supplied
 * values, so "no coordinates" is a real and ordinary state for a member who
 * typed their address by hand.
 */
export function toMemberAreas(points: Locatable[]): MemberArea[] {
  const areas = new Map<string, MemberArea>();

  for (const point of points) {
    const { latitude, longitude } = point;
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) continue;
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) continue;

    const lat = roundCoordinate(latitude);
    const lng = roundCoordinate(longitude);
    const key = `${lat},${lng}`;
    const existing = areas.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      areas.set(key, { lat, lng, count: 1 });
    }
  }

  return Array.from(areas.values());
}

/**
 * True only for people who are actually inside the library. Guests (invite
 * cookie) and anonymous viewers of a public library both fall through to false.
 */
export function canSeeExactMemberLocations(
  role: string | null | undefined
): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

interface RawAddress {
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface RawUser {
  id: string;
  name?: string | null;
  image?: string | null;
  status?: string | null;
  addresses?: RawAddress[] | null;
}

/**
 * Project a user row down to what a fellow member may see. Explicitly rebuilt
 * field by field rather than spread, so a widened Prisma select can never
 * silently reintroduce email or street address into the payload.
 */
export function toNeighborProfile(user: RawUser): NeighborProfile {
  return {
    id: user.id,
    name: user.name ?? null,
    image: user.image ?? null,
    status: user.status ?? null,
    addresses: (user.addresses ?? []).map((address) => ({
      city: address.city ?? null,
      state: address.state ?? null,
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
    })),
  };
}
