import { describe, it, expect } from 'vitest';

import { pickerView } from '../add-item-flow';

describe('pickerView (#411 — first-item users skip the inventory picker)', () => {
  it('sends a user with no items at all straight to the camera', () => {
    expect(pickerView({ ownedCount: 0, availableCount: 0 })).toBe('camera');
  });

  it('shows the honest empty state when items exist but none are available', () => {
    expect(pickerView({ ownedCount: 3, availableCount: 0 })).toBe(
      'all-unavailable'
    );
  });

  it('shows the picker when there is something to pick', () => {
    expect(pickerView({ ownedCount: 3, availableCount: 2 })).toBe('picker');
  });
});
