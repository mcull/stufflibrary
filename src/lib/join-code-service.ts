import { db } from '@/lib/db';
import { generateJoinCode, normalizeJoinCode } from '@/lib/join-code';

export interface ResolvedJoinCode {
  id: string;
  collectionId: string;
}

/**
 * Enough draws to make a genuine collision streak impossible without letting a
 * misdiagnosed error spin forever. Five is arbitrary in the same way a retry
 * budget always is; what matters is that it is bounded.
 */
const MAX_CREATE_ATTEMPTS = 5;

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

/**
 * Retries on the unique constraint. At 2^40 a collision is vanishingly
 * unlikely, but "vanishingly unlikely" surfaces to a user as a raw Prisma
 * error on a button click, and the recovery is one more random draw.
 */
export async function createJoinCode(
  collectionId: string,
  createdById: string,
  label?: string
) {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      return await db.joinCode.create({
        data: {
          code: generateJoinCode(),
          collectionId,
          createdById,
          label: label ?? null,
        },
      });
    } catch (error) {
      const outOfAttempts = attempt === MAX_CREATE_ATTEMPTS - 1;
      if (!isUniqueConstraintViolation(error) || outOfAttempts) throw error;
    }
  }
  // Unreachable: the final attempt either returns or rethrows above.
  throw new Error('Failed to generate a unique join code');
}

export async function resolveJoinCode(
  input: string
): Promise<ResolvedJoinCode | null> {
  const code = normalizeJoinCode(input);
  const row = await db.joinCode.findFirst({ where: { code, isActive: true } });
  if (!row) return null;
  return { id: row.id, collectionId: row.collectionId };
}

/**
 * The `jc:` cookie carries a JoinCode **id**, not a code, so the guest-preview
 * and join readers cannot go through `resolveJoinCode` — that one normalizes
 * its input and matches on `code`, and an id would never match. Same liveness
 * rule, different key. Callers must still compare `collectionId` against the
 * library being viewed: a cookie is not proof of which library it is for.
 */
export async function resolveJoinCodeById(
  id: string
): Promise<ResolvedJoinCode | null> {
  const row = await db.joinCode.findFirst({ where: { id, isActive: true } });
  if (!row) return null;
  return { id: row.id, collectionId: row.collectionId };
}

/**
 * Rotation is the only revocation. The old row is deactivated rather than
 * deleted so the audit trail — and every member's joinedViaCodeId — survives.
 *
 * Only the named row is touched: a library holds several live codes at once
 * (a mailbox drop and a corkboard posting are separate rows with separate
 * labels), so the blast radius of any rotation is one batch of paper.
 *
 * Already-rotated rows are refused rather than rotated again. Rotating a dead
 * code would mint a fresh *live* one descended from it, so rotating twice
 * would leave two live codes where the admin asked for one replacement —
 * silently widening access during the one operation meant to revoke it.
 *
 * ORDER IS LOAD-BEARING: create the replacement first, then deactivate the
 * old row. Do not "tidy" this back to the intuitive sequence. These two
 * statements cannot be made atomic — createJoinCode retries on P2002, and in
 * Postgres a constraint violation aborts the surrounding transaction, so
 * wrapping them would break the retry. Given that, order it so the partial
 * failure is the survivable one:
 *
 *   deactivate-then-create, create fails  -> ZERO live codes. Every flyer in
 *     every mailbox is dead, silently, and there is no way to recall paper.
 *   create-then-deactivate, deactivate fails -> TWO live codes, same label.
 *     Both work, nothing printed stops working, and the admin can just
 *     rotate again.
 *
 * Two live codes is visible, harmless and self-correcting. Zero is a silent
 * outage on physical paper.
 */
export async function rotateJoinCode(
  codeId: string,
  actorId: string,
  collectionId?: string
) {
  const existing = await db.joinCode.findFirst({
    // Scoped when the caller knows which library it authorized against, so a
    // code id from another library resolves to nothing rather than being
    // rotated by someone with no standing over it.
    where: {
      id: codeId,
      isActive: true,
      ...(collectionId && { collectionId }),
    },
  });
  if (!existing) return null;

  // The replacement is credited to whoever rotated, not the original author —
  // the new paper is their doing.
  const replacement = await createJoinCode(
    existing.collectionId,
    actorId,
    existing.label ?? undefined
  );

  await db.joinCode.update({
    where: { id: codeId },
    data: { isActive: false, rotatedAt: new Date() },
  });

  return replacement;
}

export async function recordJoinCodeUse(codeId: string) {
  await db.joinCode.update({
    where: { id: codeId },
    data: { useCount: { increment: 1 } },
  });
}
