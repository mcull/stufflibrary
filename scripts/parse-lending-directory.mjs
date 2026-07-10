#!/usr/bin/env node
// Parses docs/content/directory-lending-libraries.md (the July 2026 research
// snapshot) into src/data/lending-libraries.json for the /lending-libraries
// page. Re-run after editing the source doc:
//
//   node scripts/parse-lending-directory.mjs
//
// The framing intro and editorial notes are deliberately NOT captured here —
// the intro lives in the page itself; editorial notes never ship.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'docs/content/directory-lending-libraries.md');
const OUT = resolve(process.cwd(), 'src/data/lending-libraries.json');

const NON_STATE_SECTIONS = new Set(['Framing (page intro)', 'Editorial notes (not for publication)']);

const lines = readFileSync(SRC, 'utf8').split('\n');

const states = [];
let state = null;
let entry = null;

const flushEntry = () => {
  if (entry && state) {
    entry.description = entry.description.join(' ').trim();
    state.entries.push(entry);
  }
  entry = null;
};

for (const line of lines) {
  const h2 = line.match(/^## (.+)$/);
  if (h2) {
    flushEntry();
    const title = h2[1].trim();
    state = NON_STATE_SECTIONS.has(title) ? null : { name: title, entries: [] };
    if (state) states.push(state);
    continue;
  }
  if (!state) continue;

  const nameLine = line.match(/^- \*\*(.+?)\*\* — (.+)$/);
  if (nameLine) {
    flushEntry();
    entry = {
      name: nameLine[1].trim(),
      city: nameLine[2].trim(),
      type: '',
      description: [],
      address: null,
      hours: null,
      url: null,
      verified: false,
      verifiedNote: null,
    };
    continue;
  }
  if (!entry) continue;

  const sub = line.match(/^  - (.*)$/);
  if (!sub) continue;
  const text = sub[1].trim();

  const keyed = text.match(/^(Type|Address|Hours|URL|Verified):\s*(.*)$/);
  if (!keyed) {
    // Some entries carry bare address/URL lines without a "Key:" prefix.
    if (/^https?:\/\/\S+$/.test(text)) entry.url = text;
    else if (/\b[A-Z]{2},? \d{5}(-\d{4})?$/.test(text)) entry.address = text;
    else entry.description.push(text);
    continue;
  }
  const [, key, value] = keyed;
  if (key === 'Type') entry.type = value;
  else if (key === 'Address') entry.address = value;
  else if (key === 'Hours') entry.hours = value;
  // A non-http "URL" (e.g. "toolboxproject.org (offline)") isn't linkable;
  // the entry's description carries that story.
  else if (key === 'URL') entry.url = /^https?:\/\//.test(value) ? value : null;
  else if (key === 'Verified') {
    if (/UNVERIFIED/.test(value)) {
      entry.verified = false;
      const note = value.replace(/\*\*UNVERIFIED\*\*/, '').replace(/^[\s—–-]+/, '').trim();
      entry.verifiedNote = note || null;
    } else if (/^yes/i.test(value)) {
      entry.verified = true;
      const note = value.replace(/^yes\s*/i, '').replace(/^\(July 2026\)?\s*/, '').trim();
      // Keep only substantive caveats, not the bare "(July 2026)" stamp.
      entry.verifiedNote = note && note !== ')' ? note.replace(/^[\s—–;-]+|[()]/g, '').trim() || null : null;
    } else {
      throw new Error(`Unrecognized Verified value in ${state.name}/${entry.name}: ${value}`);
    }
  }
}
flushEntry();

// Sanity checks — fail loudly rather than ship a truncated directory.
if (states.length !== 51) {
  throw new Error(`Expected 51 states + DC, parsed ${states.length}`);
}
const total = states.reduce((n, s) => n + s.entries.length, 0);
for (const s of states) {
  if (s.entries.length === 0) throw new Error(`No entries parsed for ${s.name}`);
  for (const e of s.entries) {
    if (!e.name || !e.type || !e.description) {
      throw new Error(`Incomplete entry in ${s.name}: ${JSON.stringify(e)}`);
    }
  }
}

// Verification-method apparatus (how the researcher confirmed the site) is
// not reader-facing; keep only notes a visitor would care about.
for (const s of states) {
  for (const e of s.entries) {
    if (e.verifiedNote && /WebFetch|automated fetch|robots\.txt|fetched directly/i.test(e.verifiedNote)) {
      e.verifiedNote = null;
    }
  }
}

writeFileSync(
  OUT,
  JSON.stringify({ snapshot: 'July 2026', states }, null, 1) + '\n'
);
console.log(`Wrote ${OUT}: ${states.length} states, ${total} entries`);
