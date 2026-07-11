#!/usr/bin/env node
// Renders scripts/og-card.html to public/og-image.jpg (1200x630) with
// Playwright. Re-run after editing the card:
//
//   node scripts/render-og-image.mjs

import { execFileSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

const html = resolve(process.cwd(), 'scripts/og-card.html');
const png = resolve(process.cwd(), 'public/og-image.png');
const jpg = resolve(process.cwd(), 'public/og-image.jpg');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2, // crisp on retina link previews
});
await page.goto(`file://${html}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250); // let the webp prints finish painting
await page.screenshot({ path: png, type: 'png' });
await browser.close();

// JPEG keeps the payload social-crawler friendly (PNG of this runs ~1MB+).
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '-o', jpg]);
unlinkSync(png);
console.log(`Rendered ${jpg}`);
