/**
 * Step 3 of the homepage watercolor parade: run Marc's curated item photos
 * (docs/homepage-item-photos/jpgs of stuff/) through the SAME photo→watercolor
 * transform the app uses for real items, pin 600px squares to blob under
 * homepage/watercolors/, and emit a review contact sheet.
 *
 *   npx tsx scripts/watercolor-homepage-items.ts <reviewOutDir>
 *
 * Idempotent: blob is HEAD-checked, so re-runs only paint new/missing slugs.
 */
import 'dotenv/config';

import { readdirSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import sharp from 'sharp';

const DROP_DIR = 'docs/homepage-item-photos/jpgs of stuff';
const BLOB_BASE = 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com';

// Human filename → canonical slug for the odd ones out.
const ALIASES: Record<string, string> = {
  handsaw: 'hand-saw',
  shopvac: 'shop-vacuum',
  'shop-vaccuum': 'shop-vacuum',
  'food-dehydrator': 'dehydrator',
  'odb-reader': 'obd-reader',
  'raclette-grille': 'raclette-grill',
  'mandoline-slicer': 'mandoline',
  'soil-tester': 'ph-tester',
  'oil-drain-pan': 'oil-pan',
  'socket-wrench-set': 'socket-set',
  puzzle: 'jigsaw-1000',
  'wooden-puzzle': 'brain-teasers',
};

// v2 of the app transform, tuned for marketing renders after Marc's review:
// louder painterliness, stricter whole-object framing, game-board override.
const PROMPT = `You are a production illustrator for StuffLibrary, a community tool-sharing app.
    Convert this item photo into a HAND-PAINTED WATERCOLOR illustration with an "analog librarian" feel.
    CRITICAL: If any people appear in this image, you MUST completely remove all people, faces, hands, body parts, and any reflections or silhouettes of people.

    Style — this is the most important requirement: the result must unmistakably read as a hand-painted watercolor, with visible brush strokes, soft washes, pigment granulation, and loose ink linework. It must NOT look like a photograph or a smooth digital product rendering. Simplify fine surface detail; let edges bleed slightly into the warm cream paper. Slightly desaturated palette; no drop shadows; no background clutter.
    Composition: the ENTIRE object must be fully inside the frame — never crop any part of it. Center it, filling roughly 75% of the canvas with even margins on all sides. Maintain real-world orientation and proportions.
    Constraints: remove any text labels, logos, faces, reflections, or household backgrounds.
    DE-BRANDING — MANDATORY: treat this as a GENERIC unbranded product. Paint every surface that carries a logo, wordmark, or model name as plain solid color instead. If you recognize the product's brand, you must NOT reproduce it.

    CRITICAL: Do not add any text, numbers, codes, labels, or written characters to the image. Zero letters, zero numbers, zero logos. An image containing any text is a FAILED result.

    Return a clean watercolor illustration ready for a community sharing platform.`;

function slugFor(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+\d+$/, '') // "circular saw 2" → "circular saw"
    .trim()
    .replace(/\s+/g, '-');
  return ALIASES[base] ?? base;
}

async function blobExists(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

async function main() {
  const outDir = process.argv[2];
  if (!outDir)
    throw new Error(
      'usage: watercolor-homepage-items.ts <outDir> [--redo slug1,slug2]'
    );
  const redoArg = process.argv.indexOf('--redo');
  const redo = new Set(
    redoArg > -1 ? (process.argv[redoArg + 1] || '').split(',') : []
  );
  mkdirSync(outDir, { recursive: true });

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY missing');
  const genAI = new GoogleGenAI({ apiKey });

  // Group files by slug; prefer the un-numbered filename when duplicated.
  const files = readdirSync(DROP_DIR).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f)
  );
  const bySlug = new Map<string, string>();
  for (const f of files.sort()) {
    const slug = slugFor(f);
    const existing = bySlug.get(slug);
    const isNumbered = /\s\d+\.[^.]+$/.test(f);
    if (!existing || (/\s\d+\./.test(existing) && !isNumbered)) {
      bySlug.set(slug, f);
    }
  }
  console.log(`🎨 ${bySlug.size} unique items from ${files.length} files\n`);

  const results: Array<{ slug: string; url: string; source: string }> = [];
  const failures: string[] = [];

  for (const [slug, file] of [...bySlug.entries()].sort()) {
    const url = `${BLOB_BASE}/homepage/watercolors/${slug}_600.webp`;
    if (!redo.has(slug) && (await blobExists(url))) {
      console.log(`↩︎ ${slug}`);
      results.push({ slug, url, source: file });
      continue;
    }
    try {
      // Downscale the input like the app does (768px, jpeg 85).
      const input = await sharp(path.join(DROP_DIR, file))
        .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [
          { text: PROMPT },
          {
            inlineData: {
              data: input.toString('base64'),
              mimeType: 'image/jpeg',
            },
          },
        ],
      });
      const part = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data
      );
      if (!part?.inlineData?.data) throw new Error('no image in response');

      const square = await sharp(Buffer.from(part.inlineData.data, 'base64'))
        .resize(600, 600, {
          fit: 'cover',
          position: 'center',
          background: { r: 249, g: 245, b: 235 },
        })
        .webp({ quality: 85 })
        .toBuffer();

      const uploaded = await put(
        `homepage/watercolors/${slug}_600.webp`,
        square,
        {
          access: 'public',
          contentType: 'image/webp',
          addRandomSuffix: false,
          allowOverwrite: true,
        }
      );
      results.push({ slug, url: uploaded.url, source: file });
      console.log(`✅ ${slug}`);
    } catch (e) {
      failures.push(slug);
      console.log(`❌ ${slug} — ${e instanceof Error ? e.message : e}`);
    }
  }

  writeFileSync(
    path.join(outDir, 'watercolors-manifest.json'),
    JSON.stringify({ results, failures }, null, 2)
  );
  writeFileSync(
    path.join(outDir, 'watercolor-sheet.html'),
    `<!doctype html><meta charset="utf-8"><title>Homepage watercolors — review</title>
    <style>
      body{font-family:system-ui;background:#F9F5EB;color:#333;padding:24px;max-width:1200px;margin:auto}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
      figure{margin:0;background:#fff;border:1px solid #E4DCC8;border-radius:8px;padding:8px}
      img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px}
      figcaption{font-size:12px;margin-top:6px;font-family:ui-monospace,monospace}
    </style>
    <h1>Homepage watercolors — ${results.length} painted${failures.length ? `, ${failures.length} failed: ${failures.join(', ')}` : ''}</h1>
    <div class="grid">
      ${results.map((r) => `<figure><img src="${r.url}" loading="lazy"/><figcaption>${r.slug}</figcaption></figure>`).join('')}
    </div>`
  );
  console.log(
    `\n📋 ${results.length} watercolors → ${outDir}/watercolor-sheet.html`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
