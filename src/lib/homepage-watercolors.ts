// Pure module (#438): the homepage parade's cast — real-photo-derived
// watercolors (Marc's curated shots through the app's own transform), pinned
// at stable blob URLs by scripts/watercolor-homepage-items.ts.
//
// labyrinth + qwirkle sit out pending replacement photos (box-art shots
// can't be transformed into the game itself). Add slugs to BLOCKLIST to pull
// anything else from the parade without touching blob.

const BLOB_BASE =
  'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/homepage/watercolors';

const BLOCKLIST: string[] = ['labyrinth', 'qwirkle'];

export interface ParadeItem {
  slug: string;
  name: string;
  url: string;
}

const RAW: Array<[string, string]> = [
  // tools
  ['adjustable-wrench', 'Adjustable wrench'],
  ['bar-clamps', 'Bar clamps'],
  ['circular-saw', 'Circular saw'],
  ['claw-hammer', 'Claw hammer'],
  ['cordless-drill', 'Cordless drill'],
  ['extension-ladder', 'Extension ladder'],
  ['hand-saw', 'Hand saw'],
  ['heat-gun', 'Heat gun'],
  ['jigsaw', 'Jigsaw'],
  ['laser-level', 'Laser level'],
  ['orbital-sander', 'Orbital sander'],
  ['palm-router', 'Palm router'],
  ['pressure-washer', 'Pressure washer'],
  ['pry-bar', 'Pry bar'],
  ['shop-vacuum', 'Shop vacuum'],
  ['socket-set', 'Socket wrench set'],
  ['staple-gun', 'Staple gun'],
  ['step-ladder', 'Step ladder'],
  ['step-stool', 'Step stool'],
  ['stud-finder', 'Stud finder'],
  ['tile-cutter', 'Tile cutter'],
  // kitchen
  ['bundt-pan', 'Bundt pan'],
  ['dehydrator', 'Food dehydrator'],
  ['fondue-set', 'Fondue set'],
  ['ice-cream-maker', 'Ice cream maker'],
  ['mandoline', 'Mandoline slicer'],
  ['moka-pot', 'Moka pot'],
  ['pasta-maker', 'Pasta maker'],
  ['raclette-grill', 'Raclette grill'],
  ['stand-mixer', 'Stand mixer'],
  // games
  ['azul', 'Azul'],
  ['carcassonne', 'Carcassonne'],
  ['catan', 'Catan'],
  ['codenames', 'Codenames'],
  ['labyrinth', 'Labyrinth'],
  ['pandemic', 'Pandemic'],
  ['qwirkle', 'Qwirkle'],
  ['ticket-to-ride', 'Ticket to Ride'],
  ['wingspan', 'Wingspan'],
  // puzzles
  ['brain-teasers', 'Wooden brain teasers'],
  ['jigsaw-1000', 'Jigsaw puzzle'],
  // car
  ['jumper-cables', 'Jumper cables'],
  ['obd-reader', 'OBD-II reader'],
  ['oil-pan', 'Oil drain pan'],
  ['tire-inflator', 'Tire inflator'],
  ['torque-wrench', 'Torque wrench'],
  // garden
  ['garden-cart', 'Garden cart'],
  ['garden-gloves', 'Garden gloves'],
  ['hedge-trimmer', 'Hedge trimmer'],
  ['leaf-blower', 'Leaf blower'],
  ['loppers', 'Long-reach loppers'],
  ['mattock', 'Mattock'],
  ['ph-tester', 'Soil pH tester'],
  ['post-hole-digger', 'Post-hole digger'],
  ['pruning-shears', 'Pruning shears'],
  ['wheelbarrow', 'Wheelbarrow'],
];

export function paradeItems(blocklist: string[] = BLOCKLIST): ParadeItem[] {
  const blocked = new Set(blocklist);
  return RAW.filter(([slug]) => !blocked.has(slug)).map(([slug, name]) => ({
    slug,
    name,
    url: `${BLOB_BASE}/${slug}_600.webp`,
  }));
}

export const PARADE_ITEMS = paradeItems();
