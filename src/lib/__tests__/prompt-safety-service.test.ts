import { describe, it, expect, beforeEach } from 'vitest';

import { PromptSafetyService } from '../prompt-safety-service';

describe('PromptSafetyService', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  it('rejects descriptions with prohibited content', async () => {
    const result = await PromptSafetyService.validatePrompt({
      name: 'Handgun',
      description: 'Compact handgun with magazine',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('prohibited');
  });

  it('allows safe descriptions when no issues found', async () => {
    const result = await PromptSafetyService.validatePrompt({
      name: 'Cordless drill',
      description: '18V drill with two batteries',
    });

    expect(result.allowed).toBe(true);
  });
});
