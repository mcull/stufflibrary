// Which single line, if any, goes under the library map.
//
// Pulled out of the JSX so the precedence is testable on its own. It matters
// more than a caption usually would: "some neighbors aren't on the map"
// deliberately suppresses the pre-existing "invite a neighbor" CTA, because
// when three members are here but unplaceable, inviting a fourth is the wrong
// next step — the map is already understating the neighborhood.

export type MapCaption = 'none' | 'unplotted' | 'invite';

export interface MapCaptionInput {
  /** null for anonymous viewers; 'guest' for invite-cookie holders. */
  userRole: 'owner' | 'admin' | 'member' | 'guest' | null | undefined;
  /** Members we hold no coordinates for, so cannot honestly place. */
  unplottedCount: number;
  /** Whether the map cleared the bar for its full-height treatment. */
  mapEarnsFullSize: boolean;
}

export function chooseMapCaption({
  userRole,
  unplottedCount,
  mapEarnsFullSize,
}: MapCaptionInput): MapCaption {
  // Outsiders are told about member privacy in their own panel below the map;
  // a second line about who is missing would be noise, and the counts under it
  // aren't theirs to know.
  if (!userRole || userRole === 'guest') return 'none';

  if (unplottedCount > 0) return 'unplotted';
  if (!mapEarnsFullSize) return 'invite';
  return 'none';
}

export function unplottedCaptionText(unplottedCount: number): string {
  return unplottedCount === 1
    ? '1 member hasn’t added a location yet'
    : `${unplottedCount} members haven’t added a location yet`;
}
