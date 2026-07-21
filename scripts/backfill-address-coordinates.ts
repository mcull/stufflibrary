#!/usr/bin/env tsx
/*
  One-off backfill for addresses saved without coordinates.

  Members are plotted on library maps from Address.latitude/longitude. Those
  used to come only from the client (Google Places autocomplete), so any
  address typed free-form — or saved when the place-details lookup failed —
  landed with null coordinates and its owner was never plotted. Profile saves
  now geocode server-side (src/lib/geocode.ts); this script cleans up the rows
  that predate that.

  Dry-run by default: it reports what it would do and writes nothing. Pass
  --apply to actually persist coordinates.

  Usage:
    tsx scripts/backfill-address-coordinates.ts [--limit 100] [--apply]
    npm run backfill:address-coordinates -- --apply
*/

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { geocodeAddress } from '@/lib/geocode';

const prisma = new PrismaClient();

// Google's geocoding quota is generous but it throttles tight loops, and every
// call is billable. ~5/sec is well under the published limits and keeps a
// few-hundred-row backfill to under a minute.
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numericArg(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const parsed = Number(process.argv[index + 1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limit = numericArg('--limit', 100);

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY env var is required');
  }

  console.log(
    apply
      ? `✍️  APPLY mode — coordinates will be written. Limit: ${limit}`
      : `🔍 DRY RUN — nothing will be written. Pass --apply to persist. Limit: ${limit}`
  );

  const addresses = await prisma.address.findMany({
    where: {
      isActive: true,
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      address1: true,
      city: true,
      state: true,
      zip: true,
      country: true,
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (addresses.length === 0) {
    console.log('✅ No active addresses are missing coordinates.');
    return;
  }

  console.log(`🧩 Found ${addresses.length} address(es) to process.\n`);

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const address of addresses) {
    // Not enough text to be worth a billable lookup.
    if (!address.address1 || !address.city || !address.state) {
      console.log(`⏭️  ${address.id}: too little address text — skipped`);
      skipped++;
      continue;
    }

    const addressText = [
      address.address1,
      address.city,
      address.state,
      address.zip,
      address.country,
    ]
      .filter(Boolean)
      .join(', ');

    attempted++;

    try {
      const coordinates = await geocodeAddress(addressText);

      if (!coordinates) {
        console.log(`❌ ${address.id}: no coordinates for "${addressText}"`);
        failed++;
        continue;
      }

      if (apply) {
        await prisma.address.update({
          where: { id: address.id },
          data: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
        });
        console.log(
          `✅ ${address.id}: wrote ${coordinates.latitude}, ${coordinates.longitude}`
        );
      } else {
        console.log(
          `📍 ${address.id}: would write ${coordinates.latitude}, ${coordinates.longitude}`
        );
      }
      succeeded++;
    } catch (err) {
      // One bad row must not abort the run.
      console.error(`❌ ${address.id}: failed —`, err);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `\nDone (${apply ? 'applied' : 'dry run'}). ` +
      `Attempted: ${attempted}, Succeeded: ${succeeded}, Failed: ${failed}, Skipped: ${skipped}`
  );

  if (!apply && succeeded > 0) {
    console.log('Re-run with --apply to persist these coordinates.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
