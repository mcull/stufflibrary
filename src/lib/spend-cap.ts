import { redis } from '@/lib/redis';

export type PaidProvider = 'openai' | 'gemini' | 'places';

export type SpendCapResult = {
  allowed: boolean;
  reason?: string;
};

const DEFAULT_DAILY_CAP_CENTS = 1000; // $10/day
const COUNTER_TTL_SECONDS = 60 * 60 * 48; // keep counters 48h for inspection

// Flat per-call estimates for Gemini, since token/byte usage isn't surfaced
// uniformly across call sites. Image generation (~$0.04/image) vs text/vision.
const GEMINI_IMAGE_CALL_CENTS = 4;
const GEMINI_TEXT_CALL_CENTS = 1;

export class SpendCapExceededError extends Error {
  constructor(reason?: string) {
    super(reason || 'Daily spend cap reached. Please try again tomorrow.');
    this.name = 'SpendCapExceededError';
  }
}

function dailyCapCents(): number {
  const raw = process.env.DAILY_SPEND_CAP_CENTS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_CAP_CENTS;
}

function utcDayKey(suffix: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `spend:${day}:${suffix}`;
}

/**
 * Hard global daily spend cap on paid third-party API calls.
 * Call before making any paid call; if not allowed, the caller must
 * short-circuit (typically with a 429).
 *
 * Fails open if Redis is unavailable: an unreachable/unconfigured Redis is an
 * ops problem, not attacker-controllable, and failing closed would take down
 * profile creation and item flows.
 */
export async function checkSpendCap(
  _provider: PaidProvider
): Promise<SpendCapResult> {
  if (!redis) {
    console.error(
      'Spend cap DISABLED: Redis not configured (KV_REST_API_URL/KV_REST_API_TOKEN). Paid API calls are uncapped.'
    );
    return { allowed: true };
  }

  try {
    const raw = await redis.get(utcDayKey('global'));
    const spentCents = raw ? Number(raw) : 0;
    if (spentCents >= dailyCapCents()) {
      return {
        allowed: false,
        reason: 'Daily spend cap reached. Please try again tomorrow.',
      };
    }
    return { allowed: true };
  } catch (error) {
    console.error('Spend cap check failed; allowing call (fail-open):', error);
    return { allowed: true };
  }
}

/**
 * Guard a Gemini call with the spend cap: throws SpendCapExceededError when
 * the cap is reached, otherwise runs the call and records a flat per-call
 * estimate based on the model.
 */
export async function withGeminiSpendCap<T>(
  model: string,
  call: () => Promise<T>
): Promise<T> {
  const cap = await checkSpendCap('gemini');
  if (!cap.allowed) {
    throw new SpendCapExceededError(cap.reason);
  }
  const result = await call();
  await recordSpend(
    'gemini',
    model.includes('image') ? GEMINI_IMAGE_CALL_CENTS : GEMINI_TEXT_CALL_CENTS
  );
  return result;
}

/**
 * Record estimated spend (in cents) after a paid call. Every paid call counts
 * at least 1 cent so high request volume can't fly under the cap via
 * rounding to zero. Never throws.
 */
export async function recordSpend(
  provider: PaidProvider,
  estimatedCents: number
): Promise<void> {
  if (!redis) {
    console.error(
      'Spend cap DISABLED: Redis not configured; spend not recorded.'
    );
    return;
  }

  const cents = Math.max(1, Math.round(estimatedCents));
  const globalKey = utcDayKey('global');
  const providerKey = utcDayKey(provider);

  try {
    await Promise.all([
      redis.incrby(globalKey, cents),
      redis.incrby(providerKey, cents),
    ]);
    await Promise.all([
      redis.expire(globalKey, COUNTER_TTL_SECONDS),
      redis.expire(providerKey, COUNTER_TTL_SECONDS),
    ]);
  } catch (error) {
    console.error('Spend cap recording failed:', error);
  }
}
