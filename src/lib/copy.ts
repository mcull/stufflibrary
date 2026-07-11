/**
 * Copy helpers for message templates.
 */

/**
 * Strips a leading English article so item names read naturally in
 * possessive templates (#451): 'wants to borrow your "A dinner plate"' →
 * 'wants to borrow your dinner plate'. Hyphenated names ("A-frame ladder")
 * are untouched — only whole-word articles come off.
 */
export function withoutLeadingArticle(name: string): string {
  const stripped = name.replace(/^(a|an|the)\s+/i, '');
  return stripped.length > 0 ? stripped : name;
}
