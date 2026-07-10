/**
 * Step 2 of the homepage watercolor parade: fetch openly-licensed photos of
 * the approved 60-item list from Openverse (commercial-use licenses only,
 * photographs only), for Marc's review before watercoloring. Saves images +
 * a license/attribution manifest + an HTML contact sheet to the given out dir.
 *
 *   npx tsx scripts/fetch-homepage-item-photos.ts <outDir>
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

interface Wanted {
  slug: string;
  name: string;
  query: string;
  category: string;
}

const W = (slug: string, name: string, query: string, category: string) => ({
  slug,
  name,
  query,
  category,
});

const ITEMS: Wanted[] = [
  // Hand & power tools (20)
  W('cordless-drill', 'Cordless drill', 'cordless drill power tool', 'tools'),
  W('circular-saw', 'Circular saw', 'circular saw power tool', 'tools'),
  W('jigsaw', 'Jigsaw', 'jigsaw power tool', 'tools'),
  W('orbital-sander', 'Orbital sander', 'orbital sander tool', 'tools'),
  W('shop-vacuum', 'Shop vacuum', 'wet dry shop vacuum', 'tools'),
  W('stud-finder', 'Stud finder', 'stud finder tool', 'tools'),
  W('laser-level', 'Laser level', 'laser level tool', 'tools'),
  W('socket-set', 'Socket wrench set', 'socket wrench set', 'tools'),
  W('claw-hammer', 'Claw hammer', 'claw hammer', 'tools'),
  W('hand-saw', 'Hand saw', 'hand saw woodworking', 'tools'),
  W('adjustable-wrench', 'Adjustable wrench', 'adjustable wrench', 'tools'),
  W('staple-gun', 'Staple gun', 'staple gun tool', 'tools'),
  W('heat-gun', 'Heat gun', 'heat gun tool', 'tools'),
  W('bar-clamps', 'Bar clamps', 'bar clamp woodworking', 'tools'),
  W(
    'extension-ladder',
    'Extension ladder',
    'aluminum extension ladder',
    'tools'
  ),
  W('step-stool', 'Step stool', 'folding step stool', 'tools'),
  W('pry-bar', 'Pry bar', 'pry bar crowbar tool', 'tools'),
  W('tile-cutter', 'Tile cutter', 'manual tile cutter', 'tools'),
  W('palm-router', 'Palm router', 'wood router power tool', 'tools'),
  W('pressure-washer', 'Pressure washer', 'electric pressure washer', 'tools'),
  // Kitchen (10)
  W('pasta-maker', 'Pasta maker', 'pasta maker machine hand crank', 'kitchen'),
  W('stand-mixer', 'Stand mixer', 'kitchen stand mixer', 'kitchen'),
  W('dehydrator', 'Food dehydrator', 'food dehydrator', 'kitchen'),
  W('ice-cream-maker', 'Ice cream maker', 'ice cream maker machine', 'kitchen'),
  W('fondue-set', 'Fondue set', 'fondue pot set', 'kitchen'),
  W('bundt-pan', 'Bundt pan', 'bundt cake pan', 'kitchen'),
  W('mandoline', 'Mandoline slicer', 'mandoline slicer kitchen', 'kitchen'),
  W('pressure-canner', 'Pressure canner', 'pressure canner', 'kitchen'),
  W('raclette-grill', 'Raclette grill', 'raclette grill', 'kitchen'),
  W('moka-pot', 'Moka pot', 'moka pot espresso maker', 'kitchen'),
  // Board games (10)
  W('catan', 'Catan', 'settlers of catan board game', 'games'),
  W('ticket-to-ride', 'Ticket to Ride', 'ticket to ride board game', 'games'),
  W('codenames', 'Codenames', 'codenames board game', 'games'),
  W('wingspan', 'Wingspan', 'wingspan board game', 'games'),
  W('carcassonne', 'Carcassonne', 'carcassonne board game', 'games'),
  W('pandemic', 'Pandemic', 'pandemic board game', 'games'),
  W('azul', 'Azul', 'azul board game tiles', 'games'),
  W('chess-set', 'Chess set', 'wooden chess set', 'games'),
  W('scrabble', 'Scrabble', 'scrabble board game', 'games'),
  W('monopoly', 'Monopoly', 'monopoly board game', 'games'),
  // Puzzles (5)
  W(
    'jigsaw-1000',
    '1,000-piece jigsaw',
    'jigsaw puzzle 1000 pieces',
    'puzzles'
  ),
  W('jigsaw-kids', "Kids' jigsaw", 'children jigsaw puzzle', 'puzzles'),
  W(
    'brain-teasers',
    'Wooden brain teasers',
    'wooden puzzle brain teaser',
    'puzzles'
  ),
  W('puzzle-3d', '3D puzzle', '3d puzzle globe', 'puzzles'),
  W('jigsaw-2000', '2,000-piece jigsaw', 'large jigsaw puzzle', 'puzzles'),
  // Car (5)
  W('jumper-cables', 'Jumper cables', 'jumper cables car battery', 'car'),
  W('oil-pan', 'Oil drain pan', 'oil drain pan automotive', 'car'),
  W('torque-wrench', 'Torque wrench', 'torque wrench', 'car'),
  W('obd-reader', 'OBD-II reader', 'obd2 scanner car diagnostic', 'car'),
  W(
    'tire-inflator',
    'Tire inflator',
    'portable tire inflator air compressor',
    'car'
  ),
  // Garden (10)
  W('loppers', 'Long-reach loppers', 'garden loppers pruning', 'garden'),
  W('wheelbarrow', 'Wheelbarrow', 'garden wheelbarrow', 'garden'),
  W('hedge-trimmer', 'Hedge trimmer', 'electric hedge trimmer', 'garden'),
  W('leaf-blower', 'Leaf blower', 'leaf blower', 'garden'),
  W('post-hole-digger', 'Post-hole digger', 'post hole digger', 'garden'),
  W('garden-cart', 'Garden cart', 'garden utility cart', 'garden'),
  W('ph-tester', 'Soil pH tester', 'soil ph meter', 'garden'),
  W('seed-spreader', 'Seed spreader', 'lawn seed spreader', 'garden'),
  W('pruning-shears', 'Pruning shears', 'pruning shears secateurs', 'garden'),
  W('watering-wand', 'Watering wand', 'garden watering wand hose', 'garden'),
];

// Prefer the freest licenses first; all are commercial-use via license_type.
const LICENSE_RANK: Record<string, number> = {
  cc0: 0,
  pdm: 1,
  by: 2,
  'by-sa': 3,
};

interface Pick {
  slug: string;
  name: string;
  category: string;
  url: string;
  license: string;
  creator?: string;
  attribution?: string;
  foreign_landing_url?: string;
  title?: string;
  file: string;
}

async function searchOpenverse(query: string, photographOnly: boolean) {
  const params = new URLSearchParams({
    q: query,
    license_type: 'commercial',
    page_size: '20',
  });
  if (photographOnly) params.set('category', 'photograph');
  const res = await fetch(
    `https://api.openverse.org/v1/images/?${params.toString()}`,
    {
      headers: {
        'User-Agent': 'StuffLibrary/1.0 (+https://www.stufflibrary.org)',
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const data = (await res.json()) as {
    results: Array<{
      url: string;
      title?: string;
      creator?: string;
      license: string;
      attribution?: string;
      foreign_landing_url?: string;
      width?: number;
      height?: number;
    }>;
  };
  return data.results || [];
}

async function main() {
  const outDir = process.argv[2];
  if (!outDir) throw new Error('usage: fetch-homepage-item-photos.ts <outDir>');
  mkdirSync(path.join(outDir, 'photos'), { recursive: true });

  const picks: Pick[] = [];
  const misses: string[] = [];

  const { existsSync, readFileSync } = await import('fs');

  // Merge with any previous run so the manifest stays complete.
  const manifestPath = path.join(outDir, 'manifest.json');
  const previous: Pick[] = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')).picks as Pick[])
    : [];
  const previousBySlug = new Map(previous.map((p) => [p.slug, p]));

  for (const item of ITEMS) {
    // Re-runs only chase the gaps (a file counts only if its metadata is known).
    const prior = previousBySlug.get(item.slug);
    if (prior && existsSync(path.join(outDir, prior.file))) {
      picks.push(prior);
      console.log(`↩︎ ${item.slug} already fetched`);
      continue;
    }
    try {
      // Widening passes: exact query as photos → simple name as photos →
      // exact query, any image type.
      const simpleQuery = item.name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      const passes: Array<[string, boolean]> = [
        [item.query, true],
        [simpleQuery, true],
        [item.query, false],
      ];
      const seen = new Set<string>();
      const results: Awaited<ReturnType<typeof searchOpenverse>> = [];
      for (const [q, photosOnly] of passes) {
        for (const r of await searchOpenverse(q, photosOnly)) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            results.push(r);
          }
        }
        if (results.length >= 12) break;
        await new Promise((r) => setTimeout(r, 400));
      }
      const usable = results
        .filter(
          (r) =>
            (r.width ?? 0) >= 400 &&
            (r.height ?? 0) >= 350 &&
            LICENSE_RANK[r.license] !== undefined
        )
        .sort((a, b) => LICENSE_RANK[a.license]! - LICENSE_RANK[b.license]!);

      let saved = false;
      for (const candidate of usable.slice(0, 8)) {
        try {
          const imgRes = await fetch(candidate.url, {
            headers: { 'User-Agent': 'StuffLibrary/1.0' },
          });
          if (!imgRes.ok) {
            console.log(
              `   ↳ ${imgRes.status} on ${candidate.url.slice(0, 60)}`
            );
            continue;
          }
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length < 12_000) continue; // skip thumbnails/broken
          const ext = candidate.url.split('.').pop()?.split('?')[0] || 'jpg';
          const file = `photos/${item.slug}.${ext.length <= 4 ? ext : 'jpg'}`;
          writeFileSync(path.join(outDir, file), buf);
          picks.push({
            slug: item.slug,
            name: item.name,
            category: item.category,
            url: candidate.url,
            license: candidate.license,
            ...(candidate.creator ? { creator: candidate.creator } : {}),
            ...(candidate.attribution
              ? { attribution: candidate.attribution }
              : {}),
            ...(candidate.foreign_landing_url
              ? { foreign_landing_url: candidate.foreign_landing_url }
              : {}),
            ...(candidate.title ? { title: candidate.title } : {}),
            file,
          });
          console.log(`✅ ${item.slug} (${candidate.license})`);
          saved = true;
          break;
        } catch {
          continue;
        }
      }
      if (!saved) {
        misses.push(item.slug);
        console.log(`❌ ${item.slug} — no usable result`);
      }
    } catch (e) {
      misses.push(item.slug);
      console.log(`❌ ${item.slug} — ${e}`);
    }
    // Be a polite API citizen.
    await new Promise((r) => setTimeout(r, 900));
  }

  writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ picks, misses }, null, 2)
  );

  // Contact sheet for review
  const byCategory = new Map<string, Pick[]>();
  for (const p of picks) {
    byCategory.set(p.category, [...(byCategory.get(p.category) || []), p]);
  }
  const sections = [...byCategory.entries()]
    .map(
      ([cat, items]) => `
    <h2>${cat} (${items.length})</h2>
    <div class="grid">
      ${items
        .map(
          (p) => `
        <figure>
          <img src="${p.file}" loading="lazy" />
          <figcaption><strong>${p.name}</strong><br/>${p.license.toUpperCase()}${p.creator ? ` · ${p.creator}` : ''}</figcaption>
        </figure>`
        )
        .join('')}
    </div>`
    )
    .join('');
  writeFileSync(
    path.join(outDir, 'contact-sheet.html'),
    `<!doctype html><meta charset="utf-8"><title>Homepage item photos — review</title>
    <style>
      body{font-family:system-ui;background:#F9F5EB;color:#333;padding:24px;max-width:1200px;margin:auto}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
      figure{margin:0;background:#fff;border:1px solid #E4DCC8;border-radius:8px;padding:8px}
      img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px}
      figcaption{font-size:12px;margin-top:6px;line-height:1.4}
      h2{font-family:Georgia,serif;text-transform:capitalize}
    </style>
    <h1>Homepage watercolor candidates — ${picks.length}/${ITEMS.length} fetched</h1>
    ${misses.length ? `<p><strong>Missing (${misses.length}):</strong> ${misses.join(', ')}</p>` : ''}
    ${sections}`
  );

  console.log(
    `\n📋 ${picks.length}/${ITEMS.length} fetched → ${outDir}/contact-sheet.html`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
