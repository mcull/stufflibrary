import OpenAI from 'openai';

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
   * Classify a photo (stub implementation)
   * In a real implementation, this would analyze the image and return classifications
   */
  static async classifyPhoto(
    imageUrl: string,
    options?: {
      identifier?: string; // For rate limiting (IP, user ID, etc.)
      maxTokens?: number;
    }
  ): Promise<{
    success: boolean;
    classifications?: string[];
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

      // STUB IMPLEMENTATION - Not making real API call yet
      // In a real implementation, this would call OpenAI Vision API
      const _mockClassifications = [
        'photograph',
        'digital_art',
        'illustration',
        'logo',
        'screenshot',
        'document',
      ];

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Return mock classifications based on URL pattern
      const urlLower = imageUrl.toLowerCase();
      let detectedType = 'photograph';

      if (urlLower.includes('logo')) detectedType = 'logo';
      else if (urlLower.includes('screenshot')) detectedType = 'screenshot';
      else if (urlLower.includes('document')) detectedType = 'document';
      else if (urlLower.includes('art')) detectedType = 'digital_art';

      return {
        success: true,
        classifications: [detectedType],
        confidence: 0.85,
      };
    } catch (error) {
      console.error('AI classification error:', error);
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
