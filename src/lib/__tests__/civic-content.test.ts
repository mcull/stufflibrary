import { describe, it, expect } from 'vitest';

import { FAQ_CATEGORIES, faqPlainText, publishedFaq } from '@/data/faq';
import { readCivicContent } from '@/lib/civic-content';
import { LENDING_DIRECTORY as directory } from '@/lib/lending-libraries';

describe('lending-libraries directory data', () => {
  it('covers all 50 states + DC, none empty', () => {
    expect(directory.states.length).toBe(51);
    for (const state of directory.states) {
      expect(state.entries.length).toBeGreaterThan(0);
    }
  });

  it('every entry is complete enough to render', () => {
    for (const state of directory.states) {
      for (const entry of state.entries) {
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry.type.length).toBeGreaterThan(0);
        expect(entry.description.length).toBeGreaterThan(20);
        if (entry.url) expect(entry.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('preserves UNVERIFIED flags (never presents unverified as verified)', () => {
    const unverified = directory.states
      .flatMap((s) => s.entries)
      .filter((e) => !e.verified);
    // 22 entries were flagged UNVERIFIED in the July 2026 research pass.
    expect(unverified.length).toBe(22);
  });

  it('leaks no editorial apparatus into the data', () => {
    const blob = JSON.stringify(directory);
    expect(blob).not.toMatch(/[Ee]ditorial note/);
    expect(blob).not.toMatch(/not for publication/i);
    expect(blob).not.toMatch(/WebFetch/);
  });
});

describe('civic page markdown', () => {
  const names = [
    'further-reading',
    'sharing-world',
    'why-this-works',
    'lending-libraries-intro',
  ] as const;

  it('never includes editorial notes or draft headers', () => {
    for (const name of names) {
      const content = readCivicContent(name);
      expect(content.length).toBeGreaterThan(200);
      expect(content).not.toMatch(/[Ee]ditorial note/);
      expect(content).not.toMatch(/not for publication/i);
      expect(content).not.toMatch(/^> Draft page content/m);
    }
  });

  it('wires the cross-links between the pages', () => {
    const fr = readCivicContent('further-reading');
    expect(fr).toContain('](/why-this-works)');
    expect(fr).toContain('](/lending-libraries)');
    expect(fr).toContain('](/sharing-world)');
    expect(readCivicContent('sharing-world')).toContain(
      '](/lending-libraries)'
    );
  });

  it('gives every further-reading work a find-it-at-a-library link', () => {
    const fr = readCivicContent('further-reading');
    // 35 works across six threads; WorldCat is the spec-sanctioned target
    // (the reader's public library, never a bookstore).
    expect(fr.match(/search\.worldcat\.org/g) ?? []).toHaveLength(35);
    expect(fr).not.toMatch(/amazon\.|bookshop\.org/i);
  });
});

describe('faq data', () => {
  it('holds back the liability answer pending attorney review', () => {
    const held = FAQ_CATEGORIES.flatMap((c) => c.entries).filter(
      (e) => !e.published
    );
    expect(held.length).toBe(1);
    expect(held[0]!.question).toMatch(/gets hurt/);
    expect(held[0]!.holdReason).toMatch(/[Aa]ttorney/);

    const shipped = publishedFaq().flatMap((c) => c.entries);
    expect(shipped.some((e) => /gets hurt/.test(e.question))).toBe(false);
    expect(shipped.length).toBeGreaterThanOrEqual(23);
  });

  it('carries the questions merged from the retired Features & FAQ page', () => {
    const questions = publishedFaq().flatMap((c) =>
      c.entries.map((e) => e.question)
    );
    for (const q of [
      'What kinds of things can I share?',
      'Can I charge for lending my stuff?',
      'How do pickup and return actually happen?',
      'How long can I borrow something?',
      "What if nobody's shared the thing I need?",
    ]) {
      expect(questions).toContain(q);
    }
  });

  it('turns markdown answers into clean JSON-LD text', () => {
    expect(
      faqPlainText('see [our field guide](/sharing-world) — stuff *circulates*')
    ).toBe('see our field guide — stuff circulates');
  });
});
