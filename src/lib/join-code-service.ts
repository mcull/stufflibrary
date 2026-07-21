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
 * Rotation is the only revocation. The old row is deactivated rather than
 * deleted so the audit trail — and every member's joinedViaCodeId — survives.
 *
 * Only the named row is touched: a library holds several live codes at once
 * (a mailbox drop and a corkboard posting are separate rows with separate
 * labels), so the blast radius of any rotation is one batch of paper.
 */
export async function rotateJoinCode(codeId: string, actorId: string) {
  const existing = await db.joinCode.findFirst({ where: { id: codeId } });
  if (!existing) return null;

  await db.joinCode.update({
    where: { id: codeId },
    data: { isActive: false, rotatedAt: new Date() },
  });

  // The replacement is credited to whoever rotated, not the original author —
  // the new paper is their doing.
  return createJoinCode(
    existing.collectionId,
    actorId,
    existing.label ?? undefined
  );
}

export async function recordJoinCodeUse(codeId: string) {
  await db.joinCode.update({
    where: { id: codeId },
    data: { useCount: { increment: 1 } },
  });
}
