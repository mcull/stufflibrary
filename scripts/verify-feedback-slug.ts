#!/usr/bin/env tsx
// Verify an SLFB slug and print the parsed userId if valid.
// Usage:
//   FEEDBACK_SLUG_SECRET=... tsx scripts/verify-feedback-slug.ts <slug>
// Notes:
//   - If FEEDBACK_SLUG_SECRET is not set, NEXTAUTH_SECRET will be used as a fallback

import { parseFeedbackSlug } from '../src/lib/feedback-slug';

const slug = process.argv[2];

if (!slug) {
  console.error(
    'Usage: FEEDBACK_SLUG_SECRET=... tsx scripts/verify-feedback-slug.ts <slug>'
  );
  process.exit(1);
}

const parsed = parseFeedbackSlug(slug);
if (!parsed) {
  console.error('Invalid slug');
  process.exit(2);
}

console.log('Valid slug');
console.log('userId:', parsed.userId);
