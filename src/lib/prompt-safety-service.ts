import { GoogleGenAI } from '@google/genai';

const DISALLOWED_KEYWORDS = [
  /bomb/i,
  /weapon/i,
  /gun/i,
  /explosive/i,
  /drug/i,
  /narcotic/i,
  /meth/i,
  /cocaine/i,
  /heroin/i,
  /fentanyl/i,
  /grenade/i,
  /machete/i,
  /dead body/i,
  /corpse/i,
  /blood/i,
  /gore/i,
];

const PROHIBITED_RESPONSE = 'BLOCKED';

export interface PromptSafetyInput {
  name?: string | null;
  description?: string | null;
  brand?: string | null;
}

export interface PromptSafetyResult {
  allowed: boolean;
  reason?: string;
}

export class PromptSafetyService {
  static async validatePrompt(
    input: PromptSafetyInput
  ): Promise<PromptSafetyResult> {
    const combined = [input.name, input.brand, input.description]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!combined) {
      return { allowed: false, reason: 'Description is required' };
    }

    for (const keyword of DISALLOWED_KEYWORDS) {
      if (keyword.test(combined)) {
        return {
          allowed: false,
          reason: 'Description contains prohibited content',
        };
      }
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      // If we cannot call advanced safety checks, fall back to keyword filter
      return { allowed: true };
    }

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a trust and safety classifier for a community item-sharing app.
Classify the following description. Respond with a single word: "SAFE" if the text is acceptable, or "${PROHIBITED_RESPONSE}" if it references anything illegal, violent, hateful, adult, or otherwise inappropriate for a community lending library.

Text:
"""
${combined}
"""`,
              },
            ],
          },
        ],
      });

      const raw =
        response.candidates?.[0]?.content?.parts?.[0]?.text
          ?.trim()
          .toUpperCase() || '';

      if (!raw) {
        return {
          allowed: false,
          reason: 'Safety classification failed',
        };
      }

      if (raw.includes(PROHIBITED_RESPONSE) || raw.includes('UNSAFE')) {
        return {
          allowed: false,
          reason: 'Description flagged by safety classifier',
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Prompt safety classification failed:', error);
      return {
        allowed: false,
        reason: 'Safety check error, please refine description',
      };
    }
  }
}
