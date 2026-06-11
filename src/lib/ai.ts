import OpenAI from 'openai';

import { estimateCostCents } from './ai-pricing';
import { recordAiUsage } from './ai-usage';
import { env } from './env';
import { rateLimit } from './rate-limit';
import { checkSpendCap, recordSpend } from './spend-cap';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
};

const aiRateLimiter = rateLimit({
  interval: RATE_LIMIT.windowMs,
  uniqueTokenPerInterval: 500,
  name: 'ai',
});

/**
 * AI Service with rate limiting and error handling
 */
export class AIService {
  private static openai: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.openai) {
      if (!env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  /**
   * Generate a friendly 10-second borrow request script
   */
  static async generateBorrowScript(args: {
    lenderName?: string | null;
    itemName: string;
    itemDescription?: string | null;
    identifier?: string; // for rate limiting
  }): Promise<{ success: boolean; script?: string; error?: string }> {
    try {
      const identifier = args.identifier || 'anonymous';
      try {
        await aiRateLimiter.check(RATE_LIMIT.maxRequests, identifier);
      } catch {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try later.',
        };
      }

      const spendCap = await checkSpendCap('openai');
      if (!spendCap.allowed) {
        return {
          success: false,
          error: spendCap.reason || 'Daily spend cap reached.',
        };
      }

      const client = this.getClient();
      const firstName = (args.lenderName || 'there').split(/\s+/)[0] || 'there';
      const itemName = args.itemName?.trim() || 'your item';
      const desc = args.itemDescription?.trim();

      const prompt = `Here is an item owned by ${firstName}.
Generate a brief ~10 second voice-friendly script for someone asking to borrow it.
Requirements:
- Begin exactly with: "Hey ${firstName}, I'd love to borrow your ${itemName} for a few days."
- Then add ONE playful but sensible reason for borrowing${desc ? ` (you can draw subtle inspiration from this description: ${desc})` : ''}.
- End with a pickup window like: "I could grab it any day after work."
- Keep it friendly, concise, and natural. 1–2 sentences after the opener.
- Return ONLY the script text, no quotes, no markdown.`;

      const t0 = Date.now();
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.7,
      });
      const latencyMs = Date.now() - t0;
      const inputTokens = (res as any).usage?.prompt_tokens as
        | number
        | undefined;
      const outputTokens = (res as any).usage?.completion_tokens as
        | number
        | undefined;
      const costCents = estimateCostCents({
        provider: 'openai',
        model: 'gpt-4o-mini',
        ...(inputTokens != null ? { inputTokens } : {}),
        ...(outputTokens != null ? { outputTokens } : {}),
      });
      await recordAiUsage({
        action: 'AI_RENDER',
        provider: 'openai',
        model: 'gpt-4o-mini',
        status: 'ok',
        latencyMs,
        ...(inputTokens != null ? { inputTokens } : {}),
        ...(outputTokens != null ? { outputTokens } : {}),
        costCents,
        requestId: (res as any).id,
      });
      await recordSpend('openai', costCents);
      const content = res.choices[0]?.message?.content?.trim();
      if (!content) {
        return { success: false, error: 'No script generated' };
      }
      return { success: true, script: content };
    } catch (error) {
      console.error('AI generateBorrowScript error:', error);
      try {
        await recordAiUsage({
          action: 'AI_RENDER',
          provider: 'openai',
          model: 'gpt-4o-mini',
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
      } catch {}
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      };
    }
  }

  /**
   * Test OpenAI connection
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!env.OPENAI_API_KEY) {
        return {
          success: false,
          message: 'OpenAI API key not configured',
        };
      }

      // Simple test call to models endpoint (cheap operation)
      const client = this.getClient();
      await client.models.list();

      return {
        success: true,
        message: 'OpenAI connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Future method: Generate image descriptions
   * Placeholder for future implementation
   */
  static async describeImage(
    _imageUrl: string,
    _options?: {
      identifier?: string;
      maxTokens?: number;
    }
  ): Promise<{
    success: boolean;
    description?: string;
    error?: string;
  }> {
    // Stub for future implementation
    return {
      success: false,
      error: 'Image description not implemented yet',
    };
  }

  /**
   * Future method: Content moderation
   * Placeholder for future implementation
   */
  static async moderateContent(
    _content: string,
    _options?: {
      identifier?: string;
    }
  ): Promise<{
    success: boolean;
    flagged?: boolean;
    categories?: string[];
    error?: string;
  }> {
    // Stub for future implementation
    return {
      success: false,
      error: 'Content moderation not implemented yet',
    };
  }
}
