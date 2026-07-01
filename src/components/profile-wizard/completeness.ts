export type CompletenessKey = 'basics' | 'photo' | 'address';

export interface CompletenessItem {
  key: CompletenessKey;
  label: string;
  done: boolean;
}

/**
 * The three things a full "library card" holds, in fill-in order. Drives the
 * completeness indicator that replaced the linear 1-2-3 stepper: it shows what
 * the card needs (global) and checks each off as it's added (progress),
 * without implying a forced multi-step sequence.
 */
export function profileCardStatus(flags: {
  hasBasics: boolean;
  hasPhoto: boolean;
  hasAddress: boolean;
}): CompletenessItem[] {
  return [
    { key: 'basics', label: 'Name & agreements', done: flags.hasBasics },
    { key: 'photo', label: 'Photo', done: flags.hasPhoto },
    { key: 'address', label: 'Address', done: flags.hasAddress },
  ];
}

/** How many of the card's parts are filled in. */
export function completedCardCount(items: CompletenessItem[]): number {
  return items.filter((i) => i.done).length;
}
