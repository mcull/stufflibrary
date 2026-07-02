import { describe, it, expect } from 'vitest';

import { chooseBestGeminiModel, isModelNotFoundError } from '../gemini-model';

const listing = (names: string[], actions: string[] = ['generateContent']) =>
  names.map((name) => ({ name, supportedActions: actions }));

describe('chooseBestGeminiModel', () => {
  it('picks the highest stable image model for the image role', () => {
    const best = chooseBestGeminiModel(
      'image',
      listing([
        'models/gemini-2.0-flash-image',
        'models/gemini-2.5-flash-image',
        'models/gemini-2.5-flash', // text, excluded for image
      ])
    );
    expect(best).toBe('gemini-2.5-flash-image');
  });

  it('excludes image models for the text role', () => {
    const best = chooseBestGeminiModel(
      'text',
      listing(['models/gemini-2.5-flash-image', 'models/gemini-2.5-flash'])
    );
    expect(best).toBe('gemini-2.5-flash');
  });

  it('prefers a stable model over a newer preview', () => {
    const best = chooseBestGeminiModel(
      'image',
      listing([
        'models/gemini-3.0-flash-image-preview',
        'models/gemini-2.5-flash-image',
      ])
    );
    expect(best).toBe('gemini-2.5-flash-image');
  });

  it('falls back to a preview when nothing stable exists', () => {
    const best = chooseBestGeminiModel(
      'image',
      listing(['models/gemini-3.0-flash-image-preview'])
    );
    expect(best).toBe('gemini-3.0-flash-image-preview');
  });

  it('ignores models that do not support generateContent', () => {
    const best = chooseBestGeminiModel('text', [
      { name: 'models/gemini-2.5-flash', supportedActions: ['embedContent'] },
    ]);
    expect(best).toBeNull();
  });

  it('returns null when there are no gemini flash candidates', () => {
    expect(
      chooseBestGeminiModel('image', listing(['models/imagen-3.0']))
    ).toBeNull();
  });
});

describe('isModelNotFoundError', () => {
  it('detects a 404 status', () => {
    expect(isModelNotFoundError({ status: 404 })).toBe(true);
  });

  it('detects a NOT_FOUND message', () => {
    expect(
      isModelNotFoundError({
        message:
          'models/gemini-x is not found for API version v1beta, or is not supported for generateContent.',
      })
    ).toBe(true);
  });

  it('is false for unrelated errors', () => {
    expect(isModelNotFoundError({ status: 500, message: 'boom' })).toBe(false);
  });
});
