#!/usr/bin/env tsx
/*
  One-time backfill to render watercolor illustrations for existing items
  that are active but missing watercolorUrl/watercolorThumbUrl.

  Usage:
    GOOGLE_AI_API_KEY=... BLOB_READ_WRITE_TOKEN=... tsx scripts/backfill-watercolors.ts [--limit 50]
*/

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { WatercolorService } from '@/lib/watercolor-service';

const prisma = new PrismaClient();

async function main() {
  const limitArgIndex = process.argv.indexOf('--limit');
  const limit =
    limitArgIndex !== -1 ? Number(process.argv[limitArgIndex + 1]) : 50;

  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY env var is required');
  }

  console.log(`🔎 Finding up to ${limit} items missing watercolor...`);
  const items = await prisma.item.findMany({
    where: {
      active: true,
      watercolorUrl: null,
      watercolorThumbUrl: null,
      imageUrl: { not: null },
    },
    select: { id: true, imageUrl: true },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (items.length === 0) {
    console.log('✅ No items need backfill.');
    return;
  }

  console.log(`🧩 Processing ${items.length} items...`);
  const watercolorService = new WatercolorService();

  let success = 0;
  let failed = 0;

  for (const item of items) {
    if (!item.imageUrl) continue;
    try {
      console.log(`🎨 Rendering watercolor for item ${item.id} ...`);
      const response = await fetch(item.imageUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      const result = await watercolorService.renderWatercolor({
        itemId: item.id,
        originalImageBuffer: buffer,
        originalImageName: `item-${item.id}.jpg`,
        mimeType: contentType,
      });

      await prisma.item.update({
        where: { id: item.id },
        data: {
          watercolorUrl: result.watercolorUrl,
          watercolorThumbUrl: result.watercolorThumbUrl,
          styleVersion: result.styleVersion,
          aiModel: result.aiModel,
          synthIdWatermark: result.synthIdWatermark,
          flags: result.flags,
        },
      });

      console.log(`✅ Saved watercolor for item ${item.id}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed item ${item.id}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
