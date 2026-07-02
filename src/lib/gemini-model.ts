import type { GoogleGenAI } from '@google/genai';

import { redis } from './redis';

/**
 * Self-healing Gemini model resolution.
 *
 * We standardize on ONE model per role (e.g. a single watercolor style) and
 * keep it pinned for months. If Google removes that model, a call 404s — at
 * which point we introspect ListModels once, pick the best current successor,
 * remember it (Redis + in-process), retry, and fire a Sentry note so we can
 * re-pin deliberately. No per-call introspection; static until a model actually
 * disappears.
 */

export type GeminiRole = 'image' | 'text';

// The deliberate pins. Bump these to adopt a new generation on purpose.
const PINNED: Record<GeminiRole, string> = {
  image: 'gemini-2.5-flash-image',
  text: 'gemini-2.5-flash',
};

const redisKey = (role: GeminiRole) => `gemini:model:${role}`;

// In-process cache so hot paths never touch Redis; seeded lazily.
const memo = new Map<GeminiRole, string>();

export async function resolveGeminiModel(role: GeminiRole): Promise<string> {
  const cached = memo.get(role);
  if (cached) return cached;

  let model = PINNED[role];
  try {
    const stored = redis ? await redis.get<string>(redisKey(role)) : null;
    if (stored) model = stored;
  } catch {
    // Redis unavailable — the pinned default is fine.
  }
  memo.set(role, model);
  return model;
}

export function isModelNotFoundError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  const msg = (e?.message ?? '').toLowerCase();
  return (
    e?.status === 404 ||
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('is not supported for generatecontent')
  );
}

interface ListedModel {
  name?: string | undefined;
  supportedActions?: string[] | undefined;
}

/**
 * Pure, testable: pick the best current model for a role from a ListModels
 * result. Same gemini-*-flash family (image-capable for the image role),
 * stable over preview/exp, highest version, must support generateContent.
 */
export function chooseBestGeminiModel(
  role: GeminiRole,
  models: ListedModel[]
): string | null {
  const wantsImage = role === 'image';

  const names = models
    .filter((m) => {
      const name = (m.name ?? '').replace(/^models\//, '');
      if (!name) return false;
      const actions = m.supportedActions;
      if (actions && actions.length && !actions.includes('generateContent')) {
        return false;
      }
      if (!/^gemini-/i.test(name) || !/flash/i.test(name)) return false;
      return wantsImage ? /image/i.test(name) : !/image/i.test(name);
    })
    .map((m) => (m.name ?? '').replace(/^models\//, ''));

  if (!names.length) return null;

  const versionOf = (n: string) => {
    const m = n.match(/gemini-(\d+)(?:\.(\d+))?/i);
    return m ? Number(m[1]) * 100 + Number(m[2] ?? 0) : 0;
  };
  const isStable = (n: string) => !/(exp|preview)/i.test(n);

  names.sort((a, b) => {
    const stable = Number(isStable(b)) - Number(isStable(a));
    if (stable) return stable;
    const version = versionOf(b) - versionOf(a);
    if (version) return version;
    return a.length - b.length; // prefer the plainer base name
  });

  return names[0] ?? null;
}

async function healGeminiModel(
  role: GeminiRole,
  client: GoogleGenAI,
  currentModel: string
): Promise<string | null> {
  const models: ListedModel[] = [];
  try {
    const pager = await client.models.list();
    for await (const m of pager) {
      models.push({ name: m.name, supportedActions: m.supportedActions });
    }
  } catch (e) {
    console.error('[gemini-model] ListModels introspection failed:', e);
    return null;
  }

  const best = chooseBestGeminiModel(role, models);
  if (!best || best === currentModel) return null;

  memo.set(role, best);
  try {
    if (redis) await redis.set(redisKey(role), best);
  } catch {
    // best-effort persistence; the in-process memo still holds for this instance
  }

  const note = `Gemini "${role}" model "${currentModel}" is gone; self-healed to "${best}". Consider re-pinning deliberately.`;
  console.warn(`[gemini-model] ${note}`);
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureMessage(note, 'warning');
  } catch {
    // Sentry not configured — the console warning is enough.
  }
  return best;
}

type FailoverRequest = Omit<
  Parameters<GoogleGenAI['models']['generateContent']>[0],
  'model'
>;

/**
 * generateContent with one-time self-healing failover if the pinned model has
 * been removed. Static in the common case; introspects only on a 404.
 */
export async function generateContentWithFailover(
  client: GoogleGenAI,
  role: GeminiRole,
  request: FailoverRequest
) {
  const model = await resolveGeminiModel(role);
  try {
    return await client.models.generateContent({ model, ...request });
  } catch (err) {
    if (!isModelNotFoundError(err)) throw err;
    const healed = await healGeminiModel(role, client, model);
    if (healed) {
      return await client.models.generateContent({ model: healed, ...request });
    }
    throw err;
  }
}
