// Pure helper (house pure-modules rule) deciding what the add-to-library
// picker should show. A brand-new user with nothing to pick shouldn't see a
// picker at all (#411) — least of all one implying they have items elsewhere.

export type PickerView = 'camera' | 'all-unavailable' | 'picker';

export function pickerView(opts: {
  ownedCount: number;
  availableCount: number;
}): PickerView {
  if (opts.ownedCount === 0) return 'camera';
  if (opts.availableCount === 0) return 'all-unavailable';
  return 'picker';
}
