/**
 * Demo library seed (#427): a populated Elmwood (Berkeley) neighborhood for
 * marketing collateral — 12 fictional neighbors with Gemini-generated faces,
 * one library, ~24 items with style-matched watercolors, and ~8 weeks of
 * backdated borrow history so library cards and trust tiers showcase.
 *
 * Targeting is EXPLICIT: pass DATABASE_URL on the command line (dotenv will
 * not override it) and confirm with --confirm. Refuses localhost without
 * --local. Idempotent: every run removes the cohort (matched by email) and
 * recreates it. `--cleanup` removes it and stops.
 *
 *   DATABASE_URL=<staging-session-pooler> npx tsx scripts/seed-demo-library.ts --confirm
 *   DATABASE_URL=<...> npx tsx scripts/seed-demo-library.ts --cleanup --confirm
 *
 * All generated art is uploaded once to blob storage under demo/ and reused
 * on re-runs (HEAD-checked), so repeat runs cost no Gemini calls.
 */
import 'dotenv/config';

import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// The app's own trust recompute — resolves the same DATABASE_URL env.
import { recomputeUserTrustScore } from '../src/lib/trust-score';

const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * DAY);

// ---------------------------------------------------------------------------
// Cast: 12 fictional Elmwood neighbors. Owner uses a marc alias so Marc can
// sign in as her; everyone else gets an undeliverable demo domain.
// ---------------------------------------------------------------------------
interface Persona {
  slug: string;
  name: string;
  email: string;
  bio: string;
  face: string; // Gemini portrait prompt fragment
  address1: string;
  lat: number;
  lng: number;
  joinedDaysAgo: number;
}

const ZIP = '94705';
const PERSONAS: Persona[] = [
  {
    slug: 'maya',
    name: 'Maya Chen',
    email: 'marc.cull+demolib@gmail.com',
    bio: 'Started this library with a ladder and a hunch. If it lives in a garage and gets used twice a year, it belongs on a shelf we all share.',
    face: 'East Asian woman in her late 30s, shoulder-length black hair, denim jacket, warm confident smile',
    address1: '2743 Benvenue Ave',
    lat: 37.8583,
    lng: -122.2531,
    joinedDaysAgo: 220,
  },
  {
    slug: 'ray',
    name: 'Ray Delgado',
    email: 'ray@demo.stufflibrary.local',
    bio: 'Retired machinist. My tool wall is embarrassing and I would love an excuse to justify it. Ask me how to sharpen anything.',
    face: 'Latino man in his mid 60s, gray mustache, flannel shirt, kind weathered face',
    address1: '2934 Hillegass Ave',
    lat: 37.8562,
    lng: -122.2555,
    joinedDaysAgo: 210,
  },
  {
    slug: 'priya',
    name: 'Priya Natarajan',
    email: 'priya@demo.stufflibrary.local',
    bio: 'Garden person. I own every strange implement the nursery sells and regret nothing. Borrow the good loppers, they will change your life.',
    face: 'South Asian woman in her 40s, sun hat pushed back, gardening vest, bright easy laugh',
    address1: '2818 Regent St',
    lat: 37.8574,
    lng: -122.2601,
    joinedDaysAgo: 195,
  },
  {
    slug: 'sam',
    name: 'Sam Whitfield',
    email: 'sam@demo.stufflibrary.local',
    bio: 'New dad, lapsed backpacker. The tent is clean, the stove works, and I will trade either for a full night of sleep.',
    face: 'white man in his early 30s, short beard, baby carrier strap visible on shoulder, tired happy eyes',
    address1: '2609 Woolsey St',
    lat: 37.8508,
    lng: -122.2571,
    joinedDaysAgo: 180,
  },
  {
    slug: 'grace',
    name: 'Grace Okafor',
    email: 'grace@demo.stufflibrary.local',
    bio: 'I bake like other people jog. The stand mixer is a workhorse — treat her well and return her with a story.',
    face: 'Black woman in her 50s, colorful headwrap, apron dusted with flour, radiant smile',
    address1: '2725 Russell St',
    lat: 37.8556,
    lng: -122.2588,
    joinedDaysAgo: 175,
  },
  {
    slug: 'tom',
    name: 'Tom Alvarez',
    email: 'tom@demo.stufflibrary.local',
    bio: 'Bikes: riding them, fixing them, over-lubricating them. The repair stand lives on my porch, come use it.',
    face: 'Latino man in his late 20s, cycling cap, grease smudge on cheek, friendly grin',
    address1: '3021 Stuart St',
    lat: 37.8541,
    lng: -122.2549,
    joinedDaysAgo: 160,
  },
  {
    slug: 'jenny',
    name: 'Jenny Park',
    email: 'jenny@demo.stufflibrary.local',
    bio: 'Art teacher at the middle school. Projector, folding tables, and an unreasonable quantity of glue guns.',
    face: 'Korean woman in her mid 30s, paint-flecked overalls, round glasses, playful expression',
    address1: '2547 College Ave',
    lat: 37.8598,
    lng: -122.2534,
    joinedDaysAgo: 150,
  },
  {
    slug: 'marcus',
    name: 'Marcus Bell',
    email: 'marcus@demo.stufflibrary.local',
    bio: 'Weekend woodworker, weeknight griller. If you borrow the circular saw I will absolutely ask what you built.',
    face: 'Black man in his 40s, safety glasses pushed up on head, sawdust on shirt, easy confidence',
    address1: '2861 Oregon St',
    lat: 37.8568,
    lng: -122.2612,
    joinedDaysAgo: 140,
  },
  {
    slug: 'elena',
    name: 'Elena Petrova',
    email: 'elena@demo.stufflibrary.local',
    bio: 'Costumes, curtains, and the occasional wedding dress rescue. The sewing machine hums like a cat.',
    face: 'white woman in her late 50s, silver bob, measuring tape around neck, gentle focused look',
    address1: '2482 Derby St',
    lat: 37.8617,
    lng: -122.2559,
    joinedDaysAgo: 120,
  },
  {
    slug: 'dev',
    name: 'Dev Sharma',
    email: 'dev@demo.stufflibrary.local',
    bio: 'Climber, tinkerer, owner of one very good telescope. Saturn rings hit different from a sidewalk.',
    face: 'Indian man in his early 30s, tousled hair, puffy vest, headlamp around neck, enthusiastic',
    address1: '2650 Webster St',
    lat: 37.8524,
    lng: -122.2607,
    joinedDaysAgo: 95,
  },
  {
    slug: 'annie',
    name: 'Annie Laurent',
    email: 'annie@demo.stufflibrary.local',
    bio: 'Retired librarian — yes, a librarian in a library, we have heard the joke. Borrower of everything, believer in due dates.',
    face: 'white woman in her 70s, cropped gray hair, cardigan, reading glasses on a chain, wry knowing smile',
    address1: '2957 Ashby Ave',
    lat: 37.8547,
    lng: -122.2523,
    joinedDaysAgo: 200,
  },
  {
    slug: 'noah',
    name: 'Noah Kim',
    email: 'noah@demo.stufflibrary.local',
    bio: 'Grad student, new to the block. Own almost nothing, delighted to borrow almost anything.',
    face: 'Korean-American man in his early 20s, backpack strap, hoodie, open curious face',
    address1: '2588 Piedmont Ave',
    lat: 37.8606,
    lng: -122.2496,
    joinedDaysAgo: 12,
  },
];

const LIBRARY = {
  name: 'Elmwood Neighbors',
  description:
    'A dozen households around Benvenue and Russell sharing the stuff that spends most of its life waiting to be useful — tools, tents, table saws, and one legendary stand mixer.',
  location: 'Elmwood, Berkeley, CA',
};

// ---------------------------------------------------------------------------
// The shelves: ~24 items. Three reuse the invite-email stock art.
// ---------------------------------------------------------------------------
interface DemoItem {
  slug: string;
  name: string;
  description: string;
  subject: string | null; // Gemini watercolor subject; null = reuse existing art
  artUrl?: string; // set when subject is null
  owner: string; // persona slug
  category: string;
  location: string;
  condition: string;
  createdDaysAgo: number;
}

const BLOB_BASE = 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com';

const ITEMS: DemoItem[] = [
  {
    slug: 'ladder',
    name: 'Extension Ladder (20 ft)',
    description: 'Reaches the second-story gutters with room to spare.',
    subject: null,
    artUrl: `${BLOB_BASE}/email/watercolors/ladder_600.webp`,
    owner: 'maya',
    category: 'tools',
    location: 'side yard',
    condition: 'good',
    createdDaysAgo: 218,
  },
  {
    slug: 'leaf-blower',
    name: 'Leaf Blower',
    description: 'Cordless, two batteries. Loud enough to feel productive.',
    subject: null,
    artUrl: `${BLOB_BASE}/email/watercolors/leaf-blower_600.webp`,
    owner: 'priya',
    category: 'yard',
    location: 'garden shed',
    condition: 'good',
    createdDaysAgo: 190,
  },
  {
    slug: 'tent',
    name: '4-Person Camping Tent',
    description:
      'Sets up in ten minutes, sleeps two adults and two kids diagonally.',
    subject: null,
    artUrl: `${BLOB_BASE}/email/watercolors/tent_600.webp`,
    owner: 'sam',
    category: 'sports',
    location: 'garage shelf',
    condition: 'excellent',
    createdDaysAgo: 178,
  },
  {
    slug: 'drill',
    name: 'Cordless Drill Kit',
    description: 'Driver bits, spade bits, two batteries, no excuses.',
    subject: 'a cordless power drill with a bit case',
    owner: 'ray',
    category: 'tools',
    location: 'workshop',
    condition: 'excellent',
    createdDaysAgo: 208,
  },
  {
    slug: 'circular-saw',
    name: 'Circular Saw',
    description: 'Fresh blade. Bring your own courage and clamps.',
    subject: 'a circular saw power tool',
    owner: 'marcus',
    category: 'tools',
    location: 'garage',
    condition: 'good',
    createdDaysAgo: 138,
  },
  {
    slug: 'shop-vac',
    name: 'Shop Vacuum',
    description: 'Swallows drywall dust, spilled screws, and regret.',
    subject: 'a wet-dry shop vacuum with hose',
    owner: 'ray',
    category: 'tools',
    location: 'workshop',
    condition: 'good',
    createdDaysAgo: 205,
  },
  {
    slug: 'stud-finder',
    name: 'Stud Finder + Laser Level',
    description: 'The two tools every picture-hanger deserves.',
    subject: 'a stud finder and small laser level',
    owner: 'ray',
    category: 'tools',
    location: 'workshop drawer',
    condition: 'excellent',
    createdDaysAgo: 200,
  },
  {
    slug: 'pressure-washer',
    name: 'Pressure Washer',
    description: 'Patio transformation device. Weirdly satisfying.',
    subject: 'an electric pressure washer with wand',
    owner: 'marcus',
    category: 'yard',
    location: 'garage',
    condition: 'good',
    createdDaysAgo: 130,
  },
  {
    slug: 'hedge-trimmer',
    name: 'Hedge Trimmer',
    description: 'Electric, light enough for overhead work.',
    subject: 'an electric hedge trimmer',
    owner: 'priya',
    category: 'yard',
    location: 'garden shed',
    condition: 'good',
    createdDaysAgo: 188,
  },
  {
    slug: 'wheelbarrow',
    name: 'Wheelbarrow',
    description:
      'One wheel, no flat tires since the great upgrade of last spring.',
    subject: 'a garden wheelbarrow',
    owner: 'priya',
    category: 'yard',
    location: 'side yard',
    condition: 'fair',
    createdDaysAgo: 185,
  },
  {
    slug: 'loppers',
    name: 'Long-Reach Loppers',
    description:
      'The good ones. Cut branches you have been glaring at for months.',
    subject: 'a pair of long-handled garden loppers',
    owner: 'priya',
    category: 'yard',
    location: 'garden shed',
    condition: 'excellent',
    createdDaysAgo: 180,
  },
  {
    slug: 'stand-mixer',
    name: 'Stand Mixer',
    description: 'The legendary one. Kneads bread dough without complaint.',
    subject: 'a classic kitchen stand mixer with bowl',
    owner: 'grace',
    category: 'kitchen',
    location: 'pantry',
    condition: 'excellent',
    createdDaysAgo: 172,
  },
  {
    slug: 'dehydrator',
    name: 'Food Dehydrator',
    description: 'Six trays. Apple chips are a gateway snack.',
    subject: 'a countertop food dehydrator with stacked trays',
    owner: 'grace',
    category: 'kitchen',
    location: 'pantry',
    condition: 'good',
    createdDaysAgo: 168,
  },
  {
    slug: 'pasta-machine',
    name: 'Pasta Machine',
    description: 'Hand-crank. Comes with the confidence of a nonna.',
    subject: 'a hand-crank pasta rolling machine',
    owner: 'grace',
    category: 'kitchen',
    location: 'pantry',
    condition: 'excellent',
    createdDaysAgo: 160,
  },
  {
    slug: 'canopy',
    name: 'Pop-Up Canopy (10×10)',
    description: 'Shade for birthdays, cover for bake sales.',
    subject: 'a pop-up outdoor canopy tent',
    owner: 'jenny',
    category: 'other',
    location: 'garage',
    condition: 'good',
    createdDaysAgo: 145,
  },
  {
    slug: 'folding-tables',
    name: 'Folding Tables (pair)',
    description: 'Two six-footers. The backbone of every block party.',
    subject: 'two folding banquet tables, one upright one folded',
    owner: 'jenny',
    category: 'furniture',
    location: 'garage',
    condition: 'good',
    createdDaysAgo: 145,
  },
  {
    slug: 'projector',
    name: 'HD Projector',
    description: 'Backyard movie nights. Comes with a long HDMI and a prayer.',
    subject: 'a compact home movie projector',
    owner: 'jenny',
    category: 'electronics',
    location: 'hall closet',
    condition: 'excellent',
    createdDaysAgo: 142,
  },
  {
    slug: 'camp-stove',
    name: 'Two-Burner Camp Stove',
    description: 'Simmers like a stovetop. Pancakes at altitude, proven.',
    subject: 'a two-burner propane camping stove',
    owner: 'sam',
    category: 'sports',
    location: 'garage shelf',
    condition: 'good',
    createdDaysAgo: 175,
  },
  {
    slug: 'kayak',
    name: 'Inflatable Kayak (tandem)',
    description:
      'Rolls into a duffel. Aquatic adventures, hatchback compatible.',
    subject: 'an inflatable tandem kayak with paddle',
    owner: 'dev',
    category: 'sports',
    location: 'basement',
    condition: 'good',
    createdDaysAgo: 90,
  },
  {
    slug: 'bike-stand',
    name: 'Bike Repair Stand',
    description: 'Clamps any frame. Porch privileges included.',
    subject: 'a bicycle repair work stand',
    owner: 'tom',
    category: 'sports',
    location: 'front porch',
    condition: 'good',
    createdDaysAgo: 155,
  },
  {
    slug: 'sewing-machine',
    name: 'Sewing Machine',
    description:
      'Hums like a cat. Threaded and ready for hems, costumes, repairs.',
    subject: 'a classic sewing machine',
    owner: 'elena',
    category: 'other',
    location: 'sewing room',
    condition: 'excellent',
    createdDaysAgo: 115,
  },
  {
    slug: 'telescope',
    name: 'Telescope (8-inch Dobsonian)',
    description: 'Saturn rings from the sidewalk. Includes moon filter.',
    subject: 'a dobsonian reflector telescope on its base',
    owner: 'dev',
    category: 'electronics',
    location: 'hall closet',
    condition: 'excellent',
    createdDaysAgo: 88,
  },
  {
    slug: 'carpet-cleaner',
    name: 'Carpet Cleaner',
    description: 'For the aftermath of parties, pets, and toddlers.',
    subject: 'an upright carpet cleaning machine',
    owner: 'elena',
    category: 'tools',
    location: 'hall closet',
    condition: 'good',
    createdDaysAgo: 110,
  },
  {
    slug: 'board-games',
    name: 'Board Game Library (crate)',
    description:
      'A crate of modern classics. Settlers, tickets, tiles, treachery.',
    subject: 'a wooden crate filled with colorful board game boxes',
    owner: 'annie',
    category: 'other',
    location: 'living room',
    condition: 'good',
    createdDaysAgo: 196,
  },
];

// ---------------------------------------------------------------------------
// Eight weeks of history. lender = item owner; conditions mostly OK.
// [itemSlug, borrower, startedDaysAgo, lengthDays, condition, late?]
// status: RETURNED unless noted.
// ---------------------------------------------------------------------------
type Hist = [string, string, number, number, ('OK' | 'MINOR_WEAR')?, boolean?];
const RETURNED: Hist[] = [
  ['ladder', 'annie', 56, 3],
  ['drill', 'annie', 52, 4],
  ['stand-mixer', 'annie', 47, 5],
  ['board-games', 'sam', 45, 7],
  ['projector', 'annie', 41, 2],
  ['tent', 'dev', 40, 6],
  ['loppers', 'annie', 35, 3],
  ['pressure-washer', 'maya', 34, 2],
  ['sewing-machine', 'annie', 30, 6],
  ['canopy', 'grace', 28, 3],
  ['folding-tables', 'grace', 28, 3],
  ['ladder', 'ray', 26, 2],
  ['camp-stove', 'noah', 25, 4, 'OK', true],
  ['shop-vac', 'jenny', 22, 3],
  ['wheelbarrow', 'marcus', 20, 4, 'MINOR_WEAR'],
  ['dehydrator', 'priya', 18, 8],
  ['telescope', 'annie', 15, 3],
  ['bike-stand', 'dev', 12, 2],
  ['kayak', 'tom', 10, 4],
  ['circular-saw', 'ray', 9, 2],
  ['stud-finder', 'elena', 8, 2],
  ['pasta-machine', 'annie', 6, 3, 'MINOR_WEAR'],
  ['hedge-trimmer', 'sam', 5, 2],
];
// Live right now: two active loans + one awaiting return confirmation.
const ACTIVE: Array<[string, string, number, number]> = [
  ['projector', 'noah', 2, 5],
  ['ladder', 'grace', 1, 3],
];
const RETURN_PENDING: Array<[string, string, number, number]> = [
  ['drill', 'jenny', 4, 3],
];

// ---------------------------------------------------------------------------

const WATERCOLOR_STYLE = `You are a production illustrator for StuffLibrary, a community tool-sharing app.
Create a watercolor illustration of {SUBJECT} with an "analog librarian" feel.
Style: subtle ink linework and soft watercolor washes; paper color warm cream (soft off-white); slightly desaturated palette; no drop shadows; no background clutter; no visible people.
Composition: center the object on canvas with ~10% margin; real-world proportions; no cartoonification.
CRITICAL: Do not add any text, numbers, codes, labels, or written characters.`;

const PORTRAIT_STYLE = `Photorealistic head-and-shoulders portrait of a FICTIONAL person who does not exist: {FACE}.
Setting: warm late-afternoon light on a leafy residential street, softly blurred background.
Natural, candid, friendly. No text, no watermarks, no borders.`;

async function blobExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function generateImage(
  genAI: GoogleGenAI,
  prompt: string,
  path: string,
  size: number
): Promise<string> {
  const url = `${BLOB_BASE}/${path}`;
  if (await blobExists(url)) {
    console.log(`  ↩︎ reusing ${path}`);
    return url;
  }
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ text: prompt }],
  });
  const part = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data
  );
  if (!part?.inlineData?.data) throw new Error(`No image for ${path}`);
  const square = await sharp(Buffer.from(part.inlineData.data, 'base64'))
    .resize(size, size, {
      fit: 'cover',
      position: 'attention',
      background: { r: 249, g: 245, b: 235 },
    })
    .webp({ quality: 85 })
    .toBuffer();
  const uploaded = await put(path, square, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`  ✅ generated ${path}`);
  return uploaded.url;
}

async function main() {
  const args = process.argv.slice(2);
  const dbUrl = process.env.DATABASE_URL || '';
  const host = dbUrl.replace(/^[^@]*@/, '').replace(/\/.*$/, '');

  if (!args.includes('--confirm')) {
    console.error(`Target: ${host}\nRe-run with --confirm to proceed.`);
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/.test(dbUrl) && !args.includes('--local')) {
    console.error('DATABASE_URL is localhost; pass --local if intentional.');
    process.exit(1);
  }
  console.log(`🎯 Target database: ${host}`);

  const prisma = new PrismaClient();
  const emails = PERSONAS.map((p) => p.email);

  // -- Cleanup (cascades take memberships, items, borrows, addresses) --------
  const existing = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  if (existing.length) {
    console.log(`🧹 Removing existing cohort (${existing.length} users)…`);
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  if (args.includes('--cleanup')) {
    console.log('✅ Cleanup complete.');
    await prisma.$disconnect();
    return;
  }

  const genAI = new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
  });

  // -- Art -------------------------------------------------------------------
  console.log('🎨 Portraits…');
  const portraitUrls = new Map<string, string>();
  for (const p of PERSONAS) {
    portraitUrls.set(
      p.slug,
      await generateImage(
        genAI,
        PORTRAIT_STYLE.replace('{FACE}', p.face),
        `demo/portraits/${p.slug}_400.webp`,
        400
      )
    );
  }
  console.log('🎨 Item watercolors…');
  const itemArtUrls = new Map<string, string>();
  for (const item of ITEMS) {
    if (!item.subject) {
      itemArtUrls.set(item.slug, item.artUrl!);
      continue;
    }
    itemArtUrls.set(
      item.slug,
      await generateImage(
        genAI,
        WATERCOLOR_STYLE.replace('{SUBJECT}', item.subject),
        `demo/items/${item.slug}_600.webp`,
        600
      )
    );
  }

  // -- People ----------------------------------------------------------------
  console.log('👥 Neighbors…');
  const userIds = new Map<string, string>();
  for (const p of PERSONAS) {
    const created = daysAgo(p.joinedDaysAgo);
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        emailVerified: created,
        image: portraitUrls.get(p.slug)!,
        bio: p.bio,
        profileCompleted: true,
        onboardingStep: 'complete',
        agreedToTermsAt: created,
        agreedTermsVersion: '2026-06-28',
        createdAt: created,
        movedInDate: daysAgo(p.joinedDaysAgo + 400),
      },
    });
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        address1: p.address1,
        city: 'Berkeley',
        state: 'CA',
        zip: ZIP,
        latitude: p.lat,
        longitude: p.lng,
        formattedAddress: `${p.address1}, Berkeley, CA ${ZIP}, USA`,
        verificationMethod: 'demo_seed',
        verifiedAt: created,
        isActive: true,
        createdAt: created,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { currentAddressId: address.id },
    });
    userIds.set(p.slug, user.id);
  }

  // -- Library + members (owner anchors by ownership, no member row) --------
  console.log('🏛️ Library…');
  const ownerId = userIds.get('maya')!;
  const library = await prisma.collection.create({
    data: {
      name: LIBRARY.name,
      description: LIBRARY.description,
      location: LIBRARY.location,
      isPublic: false,
      ownerId,
      createdAt: daysAgo(220),
    },
  });
  for (const p of PERSONAS) {
    if (p.slug === 'maya') continue;
    await prisma.collectionMember.create({
      data: {
        userId: userIds.get(p.slug)!,
        collectionId: library.id,
        role: 'member',
        isActive: true,
        joinedAt: daysAgo(p.joinedDaysAgo),
      },
    });
  }

  // -- Items -----------------------------------------------------------------
  console.log('📦 Items…');
  const itemIds = new Map<string, string>();
  for (const item of ITEMS) {
    const art = itemArtUrls.get(item.slug)!;
    const created = await prisma.item.create({
      data: {
        name: item.name,
        description: item.description,
        category: item.category,
        condition: item.condition,
        location: item.location,
        watercolorUrl: art,
        watercolorThumbUrl: art,
        styleVersion: 'wc_v1',
        aiModel: 'gemini-2.5-flash-image',
        active: true,
        ownerId: userIds.get(item.owner)!,
        createdAt: daysAgo(item.createdDaysAgo),
        collections: { create: { collectionId: library.id } },
      },
    });
    itemIds.set(item.slug, created.id);
  }
  const itemOwner = (slug: string) =>
    userIds.get(ITEMS.find((i) => i.slug === slug)!.owner)!;

  // -- History ---------------------------------------------------------------
  console.log('🔁 Borrow history…');
  for (const [slug, borrower, start, len, condition = 'OK', late] of RETURNED) {
    const created = daysAgo(start);
    const due = daysAgo(start - len);
    const returned = late
      ? daysAgo(start - len - 2)
      : daysAgo(start - len + 0.5);
    await prisma.borrowRequest.create({
      data: {
        status: 'RETURNED',
        requestMessage: 'Would love to borrow this for a few days!',
        lenderMessage: 'Of course — come grab it any time.',
        requestedReturnDate: due,
        actualReturnDate: returned,
        returnedAt: returned,
        returnCondition: condition,
        returnConfirmedAt: returned,
        returnConfirmedBy: itemOwner(slug),
        returnedLate: Boolean(late),
        createdAt: created,
        approvedAt: daysAgo(start - 0.2),
        borrowerId: userIds.get(borrower)!,
        lenderId: itemOwner(slug),
        itemId: itemIds.get(slug)!,
      },
    });
  }
  for (const [slug, borrower, start, len] of ACTIVE) {
    const req = await prisma.borrowRequest.create({
      data: {
        status: 'ACTIVE',
        requestMessage: 'Is this free this week?',
        lenderMessage: 'All yours!',
        requestedReturnDate: daysAgo(start - len),
        createdAt: daysAgo(start),
        approvedAt: daysAgo(start - 0.1),
        borrowerId: userIds.get(borrower)!,
        lenderId: itemOwner(slug),
        itemId: itemIds.get(slug)!,
      },
    });
    await prisma.item.update({
      where: { id: itemIds.get(slug)! },
      data: { currentBorrowRequestId: req.id },
    });
  }
  for (const [slug, borrower, start, len] of RETURN_PENDING) {
    const req = await prisma.borrowRequest.create({
      data: {
        status: 'RETURN_PENDING',
        requestMessage: 'Perfect timing for a weekend project.',
        lenderMessage: 'Enjoy!',
        requestedReturnDate: daysAgo(start - len),
        borrowerReturnNote: 'Left it on your porch — thanks again!',
        createdAt: daysAgo(start),
        approvedAt: daysAgo(start - 0.1),
        borrowerId: userIds.get(borrower)!,
        lenderId: itemOwner(slug),
        itemId: itemIds.get(slug)!,
      },
    });
    await prisma.item.update({
      where: { id: itemIds.get(slug)! },
      data: { currentBorrowRequestId: req.id },
    });
  }

  // -- Trust -----------------------------------------------------------------
  console.log('🤝 Trust recompute…');
  for (const p of PERSONAS) {
    await recomputeUserTrustScore(userIds.get(p.slug)!);
  }
  const tiers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { name: true, trustScore: true, trustTier: true },
    orderBy: { trustScore: 'desc' },
  });
  console.table(
    tiers.map((t) => ({
      name: t.name,
      score: Math.round(t.trustScore),
      tier: t.trustTier,
    }))
  );

  console.log(`\n✅ Seeded "${LIBRARY.name}" → /library/${library.id}`);
  console.log(`   Owner sign-in: marc.cull+demolib@gmail.com`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
