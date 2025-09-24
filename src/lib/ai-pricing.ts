type PricingKey = `${'openai' | 'gemini'}:${string}`;

const PRICING_CENTS_PER_UNIT: Record<
  PricingKey,
  {
    perTokenIn?: number;
    perTokenOut?: number;
    perImageInKB?: number;
    perImageOutKB?: number;
  }
> = {
  'openai:gpt-4o-mini': { perTokenIn: 0.00015, perTokenOut: 0.0006 },
  'openai:gpt-4o': { perTokenIn: 0.005, perTokenOut: 0.015 },
  'gemini:gemini-2.5-flash-image-preview': {
    perImageInKB: 0.00002,
    perImageOutKB: 0.00002,
  },
  'gemini:gemini-2.5-flash': { perImageInKB: 0.00002, perImageOutKB: 0.00002 },
};

export function estimateCostCents(args: {
  provider: 'openai' | 'gemini';
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  inputBytes?: number;
  outputBytes?: number;
}): number {
  const key = `${args.provider}:${args.model}` as PricingKey;
  const pricing = PRICING_CENTS_PER_UNIT[key];
  if (!pricing) return 0;

  let cost = 0;
  if (pricing.perTokenIn && args.inputTokens) {
    cost += args.inputTokens * pricing.perTokenIn;
  }
  if (pricing.perTokenOut && args.outputTokens) {
    cost += args.outputTokens * pricing.perTokenOut;
  }
  if (pricing.perImageInKB && args.inputBytes) {
    cost += (args.inputBytes / 1024) * pricing.perImageInKB;
  }
  if (pricing.perImageOutKB && args.outputBytes) {
    cost += (args.outputBytes / 1024) * pricing.perImageOutKB;
  }
  return Math.round(cost);
}
