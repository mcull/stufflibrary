// Pure helpers (no side-effectful imports — house pure-modules rule) for
// presenting a library's membership. The owner is anchored by ownership, not
// a member row; #409 showed self-rows can exist in the wild (owner clicked
// their own invite link pre-fix), so display surfaces dedupe defensively.

export function nonOwnerMemberRows<T extends { userId: string }>(
  ownerId: string,
  rows: T[]
): T[] {
  return rows.filter((row) => row.userId !== ownerId);
}

/** Active members + the owner, counting the owner exactly once. */
export function libraryMemberCount(opts: {
  ownerId: string;
  ownerActive: boolean;
  rows: { userId: string }[];
}): number {
  return (
    nonOwnerMemberRows(opts.ownerId, opts.rows).length +
    (opts.ownerActive ? 1 : 0)
  );
}
