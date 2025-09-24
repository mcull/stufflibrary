import { db } from '@/lib/db';

export type AiUsageLog = {
  action: 'AI_RENDER';
  provider: 'openai' | 'gemini';
  model: string;
  status: 'ok' | 'error';
  itemId?: string;
  userId?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  inputBytes?: number;
  outputBytes?: number;
  costCents?: number;
  requestId?: string;
  pricingVersion?: string;
  errorMessage?: string;
};

export async function recordAiUsage(log: AiUsageLog): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: 'AI_RENDER',
        entityType: 'Item',
        entityId: log.itemId ?? 'n/a',
        userId: log.userId ?? null,
        metadata: {
          provider: log.provider,
          model: log.model,
          status: log.status,
          cost_cents: log.costCents ?? 0,
          latency_ms: log.latencyMs ?? null,
          input_tokens: log.inputTokens ?? null,
          output_tokens: log.outputTokens ?? null,
          input_bytes: log.inputBytes ?? null,
          output_bytes: log.outputBytes ?? null,
          request_id: log.requestId ?? null,
          pricing_version: log.pricingVersion ?? 'v1',
          itemId: log.itemId ?? null,
          error_message: log.errorMessage ?? null,
        },
      },
    });
  } catch (e) {
    // Do not throw; logging failure should not break primary flows
    console.error('AI usage logging failed', e);
  }
}
