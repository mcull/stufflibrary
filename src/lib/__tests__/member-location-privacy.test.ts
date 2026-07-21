import { describe, it, expect } from 'vitest';

import {
  canSeeExactMemberLocations,
  toNeighborProfile,
  roundCoordinate,
  toMemberAreas,
} from '../member-location-privacy';

describe('roundCoordinate', () => {
  it('rounds to two decimal places (~1.1km)', () => {
    expect(roundCoordinate(37.774929)).toBe(37.77);
    expect(roundCoordinate(-122.419416)).toBe(-122.42);
    expect(roundCoordinate(37.775)).toBe(37.78);
  });
});

describe('toMemberAreas', () => {
  it('merges points that round to the same spot and counts them', () => {
    const areas = toMemberAreas([
      { latitude: 37.774929, longitude: -122.419416 },
      { latitude: 37.7712, longitude: -122.4155 }, // rounds to the same pair
      { latitude: 37.8044, longitude: -122.2712 },
    ]);

    expect(areas).toHaveLength(2);
    expect(areas).toContainEqual({ lat: 37.77, lng: -122.42, count: 2 });
    expect(areas).toContainEqual({ lat: 37.8, lng: -122.27, count: 1 });
  });

  it('never emits a coordinate more precise than two decimals', () => {
    const areas = toMemberAreas([{ latitude: 51.5074321, longitude: 0.1278 }]);
    for (const area of areas) {
      expect(area.lat).toBe(roundCoordinate(area.lat));
      expect(area.lng).toBe(roundCoordinate(area.lng));
    }
  });

  it('omits members with no coordinates instead of defaulting or jittering', () => {
    const areas = toMemberAreas([
      { latitude: 37.774929, longitude: -122.419416 },
      { latitude: null, longitude: null },
      { latitude: undefined, longitude: undefined },
      { latitude: 37.77, longitude: undefined },
      {},
    ]);

    expect(areas).toEqual([{ lat: 37.77, lng: -122.42, count: 1 }]);
    expect(areas.some((a) => a.lat === 0 || a.lng === 0)).toBe(false);
  });

  // Coordinates are populated only at profile-save time, from client-supplied
  // values (src/app/api/profile/route.ts, both writes `?? null`). A member who
  // typed their address by hand has city and state but no lat/lng, and the
  // route no longer ships address text for anyone to geocode. Such a member
  // must be omitted — never placed at 0,0, never nudged to the map's center.
  it('omits a member who has city and state but no coordinates', () => {
    const handTyped = {
      city: 'Oakland',
      state: 'CA',
      latitude: null,
      longitude: null,
    };
    const areas = toMemberAreas([
      { latitude: 37.774929, longitude: -122.419416 },
      handTyped,
    ]);

    expect(areas).toEqual([{ lat: 37.77, lng: -122.42, count: 1 }]);
  });

  it('drops non-finite coordinates', () => {
    expect(
      toMemberAreas([
        { latitude: Number.NaN, longitude: Number.POSITIVE_INFINITY },
      ])
    ).toEqual([]);
  });

  it('returns an empty list for an empty input', () => {
    expect(toMemberAreas([])).toEqual([]);
  });
});

describe('toNeighborProfile', () => {
  const raw = {
    id: 'u1',
    name: 'Grace',
    image: 'https://cdn.example/grace.png',
    status: 'active',
    email: 'grace@example.com',
    addresses: [
      {
        address1: '123 Precise Street',
        formattedAddress: '123 Precise Street, San Francisco, CA 94110',
        city: 'San Francisco',
        state: 'CA',
        latitude: 37.774929,
        longitude: -122.419416,
      },
    ],
  };

  it('keeps what neighbors legitimately see', () => {
    expect(toNeighborProfile(raw)).toEqual({
      id: 'u1',
      name: 'Grace',
      image: 'https://cdn.example/grace.png',
      status: 'active',
      addresses: [
        {
          city: 'San Francisco',
          state: 'CA',
          latitude: 37.774929,
          longitude: -122.419416,
        },
      ],
    });
  });

  it('drops email and street address even if the query hands them over', () => {
    const serialized = JSON.stringify(toNeighborProfile(raw));
    expect(serialized).not.toContain('grace@example.com');
    expect(serialized).not.toContain('Precise Street');
    expect(serialized).not.toContain('formattedAddress');
  });

  it('tolerates a user with no addresses', () => {
    expect(toNeighborProfile({ id: 'u2' }).addresses).toEqual([]);
  });
});

describe('canSeeExactMemberLocations', () => {
  it('admits owners, admins and members', () => {
    expect(canSeeExactMemberLocations('owner')).toBe(true);
    expect(canSeeExactMemberLocations('admin')).toBe(true);
    expect(canSeeExactMemberLocations('member')).toBe(true);
  });

  it('treats guests and anonymous viewers as outsiders', () => {
    expect(canSeeExactMemberLocations('guest')).toBe(false);
    expect(canSeeExactMemberLocations(null)).toBe(false);
    expect(canSeeExactMemberLocations(undefined)).toBe(false);
  });
});
