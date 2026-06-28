export type TrustTier = 'NEW' | 'BUILDING' | 'TRUSTED' | 'HIGHLY_TRUSTED';

export interface TrustFacts {
  completedBorrows: number;
  onTimeReturns: number;
  lateReturns: number;
  damagedReturns: number;
  openDisputes: number;
  reportsAgainst: number;
  profileComplete: boolean;
  emailVerified: boolean;
  addressVerified: boolean;
  accountAgeDays: number;
}

// --- Tunable weights (intentionally simple; adjust freely) ---
const STANDING_BASE = 25;
const STANDING_PROFILE = 15;
const STANDING_EMAIL = 10;
const STANDING_ADDRESS = 10;
const STANDING_AGE_MAX = 15;
const STANDING_AGE_DAYS = 60; // days to reach full age credit

const PENALTY_DAMAGED = 15;
const PENALTY_LATE = 10;
const PENALTY_DISPUTE = 20;
const PENALTY_REPORT = 10;
const VOLUME_BONUS_CAP = 10; // +1 per completed borrow, capped

const CONFIDENCE_BORROWS = 5; // borrows to fully trust behavior over standing

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function accountStanding(f: TrustFacts): number {
  let s = STANDING_BASE;
  if (f.profileComplete) s += STANDING_PROFILE;
  if (f.emailVerified) s += STANDING_EMAIL;
  if (f.addressVerified) s += STANDING_ADDRESS;
  s += Math.min(f.accountAgeDays / STANDING_AGE_DAYS, 1) * STANDING_AGE_MAX;
  return clamp(s);
}

function behaviorScore(f: TrustFacts): number {
  // Cap at 90 so volume bonus (+up to 10) can push to 100, and penalties have room
  const onTimeRate = (90 * f.onTimeReturns) / Math.max(f.completedBorrows, 1);
  let s = onTimeRate;
  s -= f.damagedReturns * PENALTY_DAMAGED;
  s -= f.lateReturns * PENALTY_LATE;
  s -= f.openDisputes * PENALTY_DISPUTE;
  s -= f.reportsAgainst * PENALTY_REPORT;
  s += Math.min(f.completedBorrows, VOLUME_BONUS_CAP);
  return clamp(s);
}

export function computeTrustScore(f: TrustFacts): number {
  const w = Math.min(f.completedBorrows / CONFIDENCE_BORROWS, 1);
  return Math.round(clamp(behaviorScore(f) * w + accountStanding(f) * (1 - w)));
}

export function tierForScore(
  score: number,
  completedBorrows: number
): TrustTier {
  if (completedBorrows === 0) return 'NEW';
  if (score < 60) return 'BUILDING';
  if (score < 85) return 'TRUSTED';
  return 'HIGHLY_TRUSTED';
}

import { db } from './db';

export async function recomputeUserTrustScore(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        profileCompleted: true,
        emailVerified: true,
        createdAt: true,
        addresses: { where: { isActive: true }, select: { verifiedAt: true } },
      },
    });
    if (!user) return;

    const borrows = await db.borrowRequest.findMany({
      where: { borrowerId: userId },
      select: { status: true, returnedLate: true, returnCondition: true },
    });
    const completed = borrows.filter((b) => b.status === 'RETURNED');
    const completedBorrows = completed.length;
    const lateReturns = completed.filter((b) => b.returnedLate === true).length;
    const damagedReturns = completed.filter(
      (b) => b.returnCondition === 'DAMAGED'
    ).length;
    const onTimeReturns = completedBorrows - lateReturns;

    const openDisputes = await db.dispute.count({
      where: {
        status: 'OPEN',
        OR: [{ partyAId: userId }, { partyBId: userId }],
      },
    });
    // Count reports that are active against the user (not dismissed/resolved)
    const reportsAgainst = await db.userReport.count({
      where: {
        reportedId: userId,
        status: { in: ['PENDING', 'UNDER_REVIEW', 'ESCALATED'] },
      },
    });

    const facts: TrustFacts = {
      completedBorrows,
      onTimeReturns,
      lateReturns,
      damagedReturns,
      openDisputes,
      reportsAgainst,
      profileComplete: Boolean(user.profileCompleted),
      emailVerified: Boolean(user.emailVerified),
      addressVerified: user.addresses.some((a) => a.verifiedAt != null),
      accountAgeDays: Math.max(
        0,
        (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000
      ),
    };

    const score = computeTrustScore(facts);
    const tier = tierForScore(score, facts.completedBorrows);
    await db.user.update({
      where: { id: userId },
      data: { trustScore: score, trustTier: tier },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('recomputeUserTrustScore failed:', error);
    }
  }
}
