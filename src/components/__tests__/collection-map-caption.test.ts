import { describe, it, expect } from 'vitest';

import {
  chooseMapCaption,
  unplottedCaptionText,
  type MapCaptionInput,
} from '../collection-map-caption';

function input(overrides: Partial<MapCaptionInput> = {}): MapCaptionInput {
  return {
    userRole: 'member',
    unplottedCount: 0,
    mapEarnsFullSize: true,
    ...overrides,
  };
}

describe('chooseMapCaption', () => {
  it('says nothing to guests or anonymous viewers, whatever the counts', () => {
    expect(chooseMapCaption(input({ userRole: 'guest' }))).toBe('none');
    expect(chooseMapCaption(input({ userRole: null }))).toBe('none');
    expect(chooseMapCaption(input({ userRole: undefined }))).toBe('none');
    expect(
      chooseMapCaption(
        input({
          userRole: 'guest',
          unplottedCount: 5,
          mapEarnsFullSize: false,
        })
      )
    ).toBe('none');
  });

  it('names unplotted members ahead of the invite CTA', () => {
    // The case the rule exists for: alone on the map, but three neighbors are
    // here and simply unplaceable. "Invite a neighbor" would be wrong.
    expect(
      chooseMapCaption(input({ unplottedCount: 3, mapEarnsFullSize: false }))
    ).toBe('unplotted');
  });

  it('names unplotted members even on a full-size map', () => {
    expect(
      chooseMapCaption(input({ unplottedCount: 1, mapEarnsFullSize: true }))
    ).toBe('unplotted');
  });

  it('pitches the invite only when everyone we know of is already placed', () => {
    expect(
      chooseMapCaption(input({ unplottedCount: 0, mapEarnsFullSize: false }))
    ).toBe('invite');
  });

  it('says nothing when the map is full and everyone is on it', () => {
    expect(
      chooseMapCaption(input({ unplottedCount: 0, mapEarnsFullSize: true }))
    ).toBe('none');
  });

  it('applies the same rule to owners and admins', () => {
    for (const userRole of ['owner', 'admin'] as const) {
      expect(chooseMapCaption(input({ userRole, unplottedCount: 2 }))).toBe(
        'unplotted'
      );
      expect(
        chooseMapCaption(input({ userRole, mapEarnsFullSize: false }))
      ).toBe('invite');
    }
  });
});

describe('unplottedCaptionText', () => {
  it('agrees with itself about number', () => {
    expect(unplottedCaptionText(1)).toBe(
      '1 member hasn’t added a location yet'
    );
    expect(unplottedCaptionText(4)).toBe(
      '4 members haven’t added a location yet'
    );
  });
});
