import OpenAI from 'openai';

import { estimateCostCents } from './ai-pricing';
import { recordAiUsage } from './ai-usage';
import { env } from './env';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
};

// Simple in-memory rate limiting (production should use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

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
   * Check rate limit for a given identifier (IP, user ID, etc.)
   */
  private static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = `ai_${identifier}`;
    const existing = rateLimitMap.get(key);

    if (!existing || now > existing.resetTime) {
      // Reset or create new window
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT.windowMs,
      });
      return true;
    }

    if (existing.count >= RATE_LIMIT.maxRequests) {
      return false;
    }

    existing.count++;
    return true;
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
      if (!this.checkRateLimit(identifier)) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try later.',
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
   * Classify a photo of a household object using OpenAI Vision API
   * Returns object name and condition description
   */
  static async classifyPhoto(
    imageUrl: string,
    options?: {
      identifier?: string; // For rate limiting (IP, user ID, etc.)
      maxTokens?: number;
    }
  ): Promise<{
    success: boolean;
    object?: string;
    description?: string;
    condition?: string;
    confidence?: number;
    error?: string;
  }> {
    try {
      const identifier = options?.identifier || 'anonymous';

      // Check rate limit
      if (!this.checkRateLimit(identifier)) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Validate image URL
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return {
          success: false,
          error: 'Invalid image URL provided',
        };
      }

      const client = this.getClient();
      const maxTokens = options?.maxTokens || 150;

      const t0 = Date.now();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image of a household object. Return a JSON response with:
- "object": the name of the main object (e.g., "coffee mug", "desk lamp", "bookshelf")
- "description": a brief description of the object (1-2 sentences)
- "condition": condition assessment ("excellent", "good", "fair", "poor", or "unknown")

Focus on household items, furniture, electronics, kitchenware, tools, books, etc. Be specific but concise.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low', // Use low detail for faster/cheaper processing
                },
              },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.1, // Low temperature for consistent responses
      });

      const latencyMs = Date.now() - t0;
      const inputTokens = (response as any).usage?.prompt_tokens as
        | number
        | undefined;
      const outputTokens = (response as any).usage?.completion_tokens as
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
        requestId: (response as any).id,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: 'No response from OpenAI Vision API',
        };
      }

      // Try to parse JSON response
      let parsed;
      try {
        // Try direct parsing first
        parsed = JSON.parse(content);
      } catch {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*\n(.*?)\n\s*```/s);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1]!);
          } catch {
            // Still couldn't parse, fall back to plain text processing
          }
        }
      }

      if (parsed && typeof parsed === 'object') {
        return {
          success: true,
          object: parsed.object || 'Unknown object',
          description: parsed.description || 'No description provided',
          condition: parsed.condition || 'unknown',
          confidence: 0.85, // Vision API doesn't provide confidence scores
        };
      }

      // If JSON parsing failed completely, try to extract information from plain text
      return {
        success: true,
        object: 'Household object',
        description:
          content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        condition: 'unknown',
        confidence: 0.75,
      };
    } catch (error) {
      console.error('AI classification error:', error);
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

      // Handle specific OpenAI errors
      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          return {
            success: false,
            error: 'OpenAI rate limit exceeded. Please try again later.',
          };
        }
        if (error.message.includes('insufficient_quota')) {
          return {
            success: false,
            error: 'OpenAI quota exceeded. Please check your account.',
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed',
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

  /**
   * Get current rate limit status for an identifier
   */
  static getRateLimitStatus(identifier: string): {
    remaining: number;
    resetTime: number;
  } {
    const key = `ai_${identifier}`;
    const existing = rateLimitMap.get(key);
    const now = Date.now();

    if (!existing || now > existing.resetTime) {
      return {
        remaining: RATE_LIMIT.maxRequests,
        resetTime: now + RATE_LIMIT.windowMs,
      };
    }

    return {
      remaining: Math.max(0, RATE_LIMIT.maxRequests - existing.count),
      resetTime: existing.resetTime,
    };
  }

  /**
   * Clear rate limit for an identifier (admin function)
   */
  static clearRateLimit(identifier: string): void {
    const key = `ai_${identifier}`;
    rateLimitMap.delete(key);
  }
}
