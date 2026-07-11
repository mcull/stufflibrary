import { describe, it, expect } from 'vitest';

import { withoutLeadingArticle } from '../copy';

describe('withoutLeadingArticle (#451)', () => {
  it('drops leading articles for possessive templates', () => {
    expect(withoutLeadingArticle('A dinner plate')).toBe('dinner plate');
    expect(withoutLeadingArticle('An extension ladder')).toBe(
      'extension ladder'
    );
    expect(withoutLeadingArticle('The Settlers of Catan')).toBe(
      'Settlers of Catan'
    );
  });

  it('leaves hyphenated and article-free names alone', () => {
    expect(withoutLeadingArticle('A-frame ladder')).toBe('A-frame ladder');
    expect(withoutLeadingArticle('Stand mixer')).toBe('Stand mixer');
    expect(withoutLeadingArticle('Theremin')).toBe('Theremin');
  });

  it('never returns an empty string', () => {
    expect(withoutLeadingArticle('The ')).toBe('The ');
  });
});
