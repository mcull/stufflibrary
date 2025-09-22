#!/usr/bin/env tsx
// Generate an SLFB slug for a given StuffLibrary userId
// Usage:
//   FEEDBACK_SLUG_SECRET=... tsx scripts/gen-feedback-slug.ts <userId>

import crypto from 'crypto';

const userId = process.argv[2];
const secret = process.env.FEEDBACK_SLUG_SECRET || '';

if (!userId || !secret) {
  console.error(
    'Usage: FEEDBACK_SLUG_SECRET=... tsx scripts/gen-feedback-slug.ts <userId>'
  );
  process.exit(1);
}

const sig = crypto
  .createHmac('sha256', secret)
  .update(`${userId}|SLFB|v1`)
  .digest('hex')
  .slice(0, 8);

const slug = `SLFB:v1:${userId}:${sig}`;
console.log(slug);
