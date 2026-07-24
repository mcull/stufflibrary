# Invite Email Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the invitation email from a product newsletter into a personal note that reaches the Primary tab — personal from-name, Reply-To the sender's real address, an editable note, real item art + count, a plain-text part, a modest CTA to the guest preview, privacy in the footer — and drop the now-false "account created automatically" line.

**Architecture:** Three units. (1) `src/lib/invite-email.ts` — the pure builder, now returning `{ subject, html, text }` and reshaped note-first. (2) `src/app/api/collections/[id]/invite/route.ts` — the dispatch: load the sender, personal `from`, `replyTo`, item count, thread the `note`, multipart send. (3) `src/components/ManageMembersModal.tsx` — an optional pre-filled note field posting `{ email, note }`.

**Tech Stack:** Next.js App Router, Prisma, Resend `^6.0.1` (uses `replyTo` camelCase), MUI, Vitest + @testing-library/react. Tests mock `@/lib/db` / Resend with `vi.hoisted` mocks. `firstNameOnly` is _not_ imported into the pure email module — it derives the first name with a plain `.split(/\s+/)[0]` to keep the module dependency-light.

**Spec:** `docs/superpowers/specs/2026-07-24-invite-email-rebuild-design.md`. **Branch:** `feat/invite-email-rebuild` (already created off `main`, spec committed). Husky prints a deprecation warning on commit — ignore it. Commit messages get a one-line `Why:` trailer plus the `Co-Authored-By:` line.

**One design refinement to note:** the old `description` gray-box (which reused the library description) is **replaced** by the personal `note` aside. The builder's `LibraryInviteEmailInput` drops `description` and the route stops passing it. This is the spec's "reshape from newsletter to note" made concrete.

---

### Task 1: Baseline

**Files:** none modified.

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `feat/invite-email-rebuild`

- [ ] **Step 2: Run the existing email test as the baseline**

Run: `npx vitest run src/lib/__tests__/invite-email.test.ts`
Expected: PASS (6 tests). Task 2 rewrites this file; note the current green state.

---

### Task 2: Rebuild the email builder (`invite-email.ts`)

**Files:**

- Modify: `src/lib/invite-email.ts`
- Modify (rewrite): `src/lib/__tests__/invite-email.test.ts`

The builder gains `note`, `itemCount`, `location`; `senderName` now carries the full name; `description` is removed; it returns `{ subject, html, text }`.

- [ ] **Step 1: Rewrite the test to the new contract**

Replace the ENTIRE contents of `src/lib/__tests__/invite-email.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';

import { buildLibraryInviteEmail, STOCK_WATERCOLORS } from '../invite-email';

const base = {
  libraryName: 'Audit Test Shelf',
  senderName: 'Marc Cull',
  shareLink: 'https://www.stufflibrary.org/j/tok123',
};

describe('buildLibraryInviteEmail — subject', () => {
  it('names the inviter and library, with no exclamation point', () => {
    const { subject } = buildLibraryInviteEmail(base);
    expect(subject).toBe('Marc invited you to Audit Test Shelf');
    expect(subject).not.toContain('!');
  });

  it('appends a location descriptor when the library has one', () => {
    const { subject } = buildLibraryInviteEmail({
      ...base,
      location: 'Summit Rd',
    });
    expect(subject).toBe(
      'Marc invited you to Audit Test Shelf — the stuff library for Summit Rd'
    );
  });

  it('falls back to "Someone" when there is no sender name', () => {
    const { subject } = buildLibraryInviteEmail({
      ...base,
      senderName: null,
    });
    expect(subject).toBe('Someone invited you to Audit Test Shelf');
  });
});

describe('buildLibraryInviteEmail — brand + art', () => {
  it('uses the brand palette, not the generic blue template', () => {
    const { html } = buildLibraryInviteEmail(base);
    expect(html).toContain('#F9F5EB'); // warm cream
    expect(html).toContain('#1E3A5F'); // ink blue
    expect(html).not.toContain('#2563eb'); // the old generic blue
  });

  it("shows the library's real item watercolors when it has them", () => {
    const { html } = buildLibraryInviteEmail({
      ...base,
      itemWatercolors: [
        { url: 'https://blob/pillow.webp', name: 'Decorative Pillow' },
      ],
    });
    expect(html).toContain('https://blob/pillow.webp');
    expect(html).toContain('alt="Decorative Pillow"');
  });

  it('falls back to the stock trio for an empty library', () => {
    const { html } = buildLibraryInviteEmail(base);
    for (const art of STOCK_WATERCOLORS) {
      expect(html).toContain(art.url);
    }
  });

  it('states the item count when provided (plural), omits it otherwise', () => {
    const withCount = buildLibraryInviteEmail({ ...base, itemCount: 25 }).html;
    expect(withCount).toContain('25 things');
    const withoutCount = buildLibraryInviteEmail(base).html;
    expect(withoutCount).not.toMatch(/\bthings on the shelves\b/);
  });

  it('states the item count in the singular for one item', () => {
    const { html } = buildLibraryInviteEmail({ ...base, itemCount: 1 });
    expect(html).toContain('1 thing on the shelves');
  });
});

describe('buildLibraryInviteEmail — note', () => {
  it('renders the sender note when provided', () => {
    const { html, text } = buildLibraryInviteEmail({
      ...base,
      note: 'Grab the miter saw before Dan does.',
    });
    expect(html).toContain('Grab the miter saw before Dan does.');
    expect(text).toContain('Grab the miter saw before Dan does.');
  });

  it('renders a default sentence when the note is blank', () => {
    const { html } = buildLibraryInviteEmail({ ...base, note: '   ' });
    expect(html).toContain('set aside a library card for you');
  });

  it('escapes HTML in the note and other user fields (injection guard)', () => {
    const { html } = buildLibraryInviteEmail({
      ...base,
      note: '<script>alert(1)</script>',
      libraryName: '<b>x</b>',
      senderName: 'A & B',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('A &amp; B');
  });
});

describe('buildLibraryInviteEmail — text part + essentials', () => {
  it('returns a non-empty plain-text part carrying the link', () => {
    const { text } = buildLibraryInviteEmail(base);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain(base.shareLink);
  });

  it('keeps the join link, the 7-day notice, and the reply line', () => {
    const { html } = buildLibraryInviteEmail(base);
    expect(html).toContain(base.shareLink);
    expect(html).toContain('7 days');
    expect(html).toContain('it goes to Marc');
  });

  it('no longer promises an auto-created account', () => {
    const { html, text } = buildLibraryInviteEmail(base);
    expect(html).not.toContain('created for you automatically');
    expect(text).not.toContain('created for you automatically');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/invite-email.test.ts`
Expected: FAIL — the builder still returns the old subject/shape and has no `text` or `note`.

- [ ] **Step 3: Rewrite the builder**

Replace the ENTIRE contents of `src/lib/invite-email.ts` with:

```ts
// Pure module (no side-effectful imports — house rule): the library
// invitation email. Reshaped from product-newsletter to personal note so it
// reaches the Primary tab (dossier Section D): a note-first body, the
// sender's own words, real item art + count, one modest CTA to the guest
// preview, privacy answered in the footer. Inline styles + a single-column
// layout for email clients; images referenced by absolute blob URLs.

// Mirror of brandTokens (can't import the theme here without dragging in MUI).
const INK_BLUE = '#1E3A5F';
const WARM_CREAM = '#F9F5EB';
const CHARCOAL = '#333333';
const WORDMARK_TOMATO = '#FF6347'; // = brandTokens.tomatoRed (pure module, no import)

export interface InviteEmailArt {
  url: string;
  name: string;
}

/** Style-matched fallbacks generated with the app's own watercolor pipeline. */
export const STOCK_WATERCOLORS: InviteEmailArt[] = [
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/ladder_600.webp',
    name: 'A shared ladder',
  },
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/leaf-blower_600.webp',
    name: 'A shared leaf blower',
  },
  {
    url: 'https://znr9cqeimzcbaqpo.public.blob.vercel-storage.com/email/watercolors/tent_600.webp',
    name: 'A shared tent',
  },
];

export interface LibraryInviteEmailInput {
  libraryName: string;
  /** The sender's full name; the builder derives the first name for subject/footer. */
  senderName?: string | null | undefined;
  shareLink: string;
  /** The sender's own words (already trimmed/capped by the caller). Blank → a default sentence. */
  note?: string | null | undefined;
  /** Total active items on the shelves; omits the count line when undefined/0. */
  itemCount?: number | null | undefined;
  /** Neighborhood/location descriptor for the subject line. */
  location?: string | null | undefined;
  /** Up to 3 of the library's own item watercolors; stock art fills the gap. */
  itemWatercolors?: InviteEmailArt[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

export function buildLibraryInviteEmail(input: LibraryInviteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const rawLibraryName = input.libraryName;
  const rawSenderFull = input.senderName?.trim() || null;
  const rawSenderFirst = rawSenderFull ? firstName(rawSenderFull) : null;
  const rawLocation = input.location?.trim() || null;
  const rawNote = input.note?.trim() || null;
  const defaultNote = `I set aside a library card for you at ${rawLibraryName} — borrow anything, free.`;
  const noteText = rawNote || defaultNote;

  const count =
    typeof input.itemCount === 'number' && input.itemCount > 0
      ? input.itemCount
      : null;
  const countPhrase = count
    ? `${count} ${count === 1 ? 'thing' : 'things'} on the shelves`
    : null;

  // Subject — no exclamation point (deliverability).
  const subject = rawSenderFirst
    ? rawLocation
      ? `${rawSenderFirst} invited you to ${rawLibraryName} — the stuff library for ${rawLocation}`
      : `${rawSenderFirst} invited you to ${rawLibraryName}`
    : `Someone invited you to ${rawLibraryName}`;

  // Escaped for HTML.
  const libraryName = escapeHtml(rawLibraryName);
  const senderFull = escapeHtml(rawSenderFull || 'A neighbor');
  const senderFirst = escapeHtml(rawSenderFirst || 'them');
  const noteHtml = escapeHtml(noteText);

  const art = (
    input.itemWatercolors?.length ? input.itemWatercolors : STOCK_WATERCOLORS
  ).slice(0, 3);

  const artCells = art
    .map(
      (a) => `
              <td align="center" style="padding: 6px;">
                <img src="${a.url}" alt="${escapeHtml(a.name)}" width="150" height="150"
                     style="display: block; width: 150px; height: 150px; border-radius: 12px; border: 1px solid #eee4d0;" />
              </td>`
    )
    .join('');

  const countLineHtml = countPhrase
    ? `
      <p style="font-size: 13px; color: ${CHARCOAL}; opacity: 0.7; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        …and ${escapeHtml(countPhrase)}.
      </p>`
    : '';

  const html = `
  <div style="background-color: ${WARM_CREAM}; padding: 32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #eee4d0; border-radius: 16px; padding: 32px; box-sizing: border-box;">

      <p style="font-size: 16px; line-height: 1.7; color: ${CHARCOAL}; margin: 0 0 16px 0;">Hi —</p>

      <p style="font-size: 16px; line-height: 1.7; color: ${CHARCOAL}; margin: 0 0 20px 0;">
        <strong>${senderFull}</strong> set aside a library card for you at <strong>${libraryName}</strong> — a lending library of stuff your neighbors stock together. Borrow anything, free.
      </p>

      <div style="border-left: 3px solid ${WORDMARK_TOMATO}; background-color: ${WARM_CREAM}; padding: 12px 18px; margin: 0 0 24px 0;">
        <p style="margin: 0; color: ${CHARCOAL}; font-size: 15px; line-height: 1.6; font-style: italic;">${noteHtml}</p>
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 8px auto;">
        <tr>${artCells}
        </tr>
      </table>${countLineHtml}

      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${input.shareLink}"
           style="background-color: ${INK_BLUE}; color: #FFFFFF; padding: 15px 34px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; font-family: Arial, Helvetica, sans-serif;">
          Have a look at the shelves
        </a>
      </div>
      <p style="font-size: 13px; color: ${CHARCOAL}; opacity: 0.7; text-align: center; margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif;">
        No account needed to look. Or paste this in your browser:<br>${input.shareLink}
      </p>

      <hr style="border: none; border-top: 1px solid #eee4d0; margin: 24px 0 16px 0;" />
      <p style="font-size: 12.5px; color: ${CHARCOAL}; opacity: 0.7; line-height: 1.7; margin: 0; font-family: Arial, Helvetica, sans-serif;">
        This card is reserved for this email address and expires in 7 days. Only members can see who's in a library — your name, face and address are never public. Didn't expect this? Ignore it; nothing happens. You can reply to this email — it goes to ${senderFirst}.
      </p>
    </div>

    <p style="text-align: center; margin: 20px 0 0 0;">
      <span style="display: inline-block; background-color: ${WORDMARK_TOMATO}; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-weight: bold; letter-spacing: 3px; padding: 4px 10px; font-size: 12px;">STUFFLIBRARY</span>
    </p>
  </div>`;

  const textLines = [
    'Hi —',
    '',
    `${rawSenderFull || 'A neighbor'} set aside a library card for you at ${rawLibraryName} — a lending library of stuff your neighbors stock together. Borrow anything, free.`,
    '',
    noteText,
    '',
    countPhrase ? `On the shelves: ${countPhrase}.` : null,
    countPhrase ? '' : null,
    'Have a look at the shelves (no account needed to look):',
    input.shareLink,
    '',
    `This card is reserved for this email address and expires in 7 days. Only members can see who's in a library — your name, face and address are never public. Didn't expect this? Ignore it. You can reply to this email — it goes to ${rawSenderFirst || 'them'}.`,
  ].filter((line) => line !== null);

  const text = textLines.join('\n');

  return { subject, html, text };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/invite-email.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Typecheck (the return shape changed; callers compile next task)**

Run: `npx tsc --noEmit 2>&1 | grep -i "invite-email\|invite/route" || echo "no errors in the email module"`
Expected: the route may show an error about the removed `description` / new `text` — that is fixed in Task 3. Confirm the _builder_ file itself has no error. (If the only tsc errors are in `invite/route.ts`, proceed; Task 3 resolves them.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/invite-email.ts src/lib/__tests__/invite-email.test.ts
git commit -m "feat(invites): rebuild the invite email as a personal note

Note-first body, the sender's own words as a quoted aside, real item
art + count, a modest 'have a look' CTA, privacy in the footer, and a
plain-text part. Drops the newsletter framing and the false
account-created line. Builder now returns { subject, html, text }.

Why: dossier Finding 1 — the old email was shaped like a newsletter and landed in Promotions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Dispatch — sender, from-name, replyTo, count, note, multipart

**Files:**

- Modify: `src/app/api/collections/[id]/invite/route.ts` (the `mode === 'email' && sendEmail` branch, ~L310-345, and the body parse where `email`/`mode` are read)
- Test (create): `src/app/api/collections/[id]/invite/__tests__/route.email.test.ts`

- [ ] **Step 1: Write the failing test**

First, find where the route reads the request body (search the file for `await request.json()` or where `email`/`mode` are destructured) so the test's mock body matches. Create `src/app/api/collections/[id]/invite/__tests__/route.email.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  collection: { findFirst: vi.fn(), findUnique: vi.fn() },
  collectionMember: { findFirst: vi.fn(), count: vi.fn() },
  invitation: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  item: { findMany: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  joinCode: { findFirst: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ db }));
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));
vi.mock('@/lib/user-capabilities', () => ({
  getUserCapabilities: vi.fn().mockResolvedValue({ canInvite: true }),
}));
vi.mock('@/lib/join-code-service', () => ({
  createJoinCode: vi.fn(),
  generateJoinCode: vi.fn(() => 'SHORTCODE'),
}));

import { POST } from '../route';

const LIBRARY_ID = 'lib_1';
const SENDER_ID = 'sender_1';

function request(body: Record<string, unknown>) {
  return {
    url: `http://t/api/collections/${LIBRARY_ID}/invite`,
    json: async () => body,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_URL = 'https://www.stufflibrary.org';
  process.env.RESEND_API_KEY = 'test';
  mockGetServerSession.mockResolvedValue({ user: { id: SENDER_ID } });
  db.collection.findFirst.mockResolvedValue({
    id: LIBRARY_ID,
    name: 'HAASS',
    location: 'Summit Rd',
    description: null,
    ownerId: SENDER_ID,
    owner: { name: 'Marc Cull', email: 'owner@example.com' },
    _count: {},
  });
  db.collection.findUnique.mockResolvedValue({
    id: LIBRARY_ID,
    name: 'HAASS',
    location: 'Summit Rd',
    description: null,
    owner: { name: 'Marc Cull', email: 'owner@example.com' },
    _count: {},
  });
  db.collectionMember.findFirst.mockResolvedValue(null);
  db.invitation.findFirst.mockResolvedValue(null);
  db.invitation.count.mockResolvedValue(0);
  db.invitation.create.mockResolvedValue({
    id: 'inv_1',
    email: 'nora@example.com',
    expiresAt: new Date(Date.now() + 7 * 864e5),
    collection: { name: 'HAASS', location: 'Summit Rd' },
    sender: { name: 'Marc Cull' },
  });
  db.invitation.update.mockResolvedValue({});
  db.item.findMany.mockResolvedValue([]);
  db.item.count.mockResolvedValue(25);
  db.user.findUnique.mockResolvedValue({
    name: 'Marc Cull',
    email: 'marc.cull@gmail.com',
  });
});

describe('POST /api/collections/[id]/invite — email dispatch', () => {
  it('sends with a personal from-name, the sender reply-to, and a text part', async () => {
    await POST(request({ email: 'nora@example.com', mode: 'email' }), {
      params: Promise.resolve({ id: LIBRARY_ID }),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0][0];
    expect(arg.from).toBe(
      '"Marc Cull (via StuffLibrary)" <invites@stufflibrary.org>'
    );
    expect(arg.replyTo).toBe('marc.cull@gmail.com');
    expect(arg.subject).toBe(
      'Marc invited you to HAASS — the stuff library for Summit Rd'
    );
    expect(typeof arg.text).toBe('string');
    expect(arg.text.length).toBeGreaterThan(0);
  });

  it('threads a trimmed sender note into the email', async () => {
    await POST(
      request({
        email: 'nora@example.com',
        mode: 'email',
        note: '  Grab the saw before Dan does.  ',
      }),
      { params: Promise.resolve({ id: LIBRARY_ID }) }
    );
    const arg = mockSend.mock.calls[0][0];
    expect(arg.html).toContain('Grab the saw before Dan does.');
    expect(arg.html).not.toContain('  Grab'); // trimmed
  });

  it('falls back cleanly when the sender has no name or email', async () => {
    db.user.findUnique.mockResolvedValue({ name: null, email: null });
    await POST(request({ email: 'nora@example.com', mode: 'email' }), {
      params: Promise.resolve({ id: LIBRARY_ID }),
    });
    const arg = mockSend.mock.calls[0][0];
    expect(arg.from).toBe('StuffLibrary <invites@stufflibrary.org>');
    expect(arg.replyTo).toBeUndefined();
    expect(arg.subject).toBe('Someone invited you to HAASS');
  });
});
```

NOTE: the mock `db` shape above is a superset; the real route may reference other `db` models. If `POST` throws for an unmocked model/method, add it to the `db` hoisted object (return a sensible default in `beforeEach`). Do not change route logic to satisfy the test — extend the mock. If the route reads the body differently (e.g. destructures more fields), keep the same `email`/`mode`/`note` keys and add whatever else it requires with safe defaults.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run "src/app/api/collections/[id]/invite/__tests__/route.email.test.ts"`
Expected: FAIL — current `from` is `StuffLibrary <…>`, no `replyTo`, no `text`, subject has "!".

- [ ] **Step 3: Load the sender and build the personal envelope**

The route already parses the body at the top of `POST`: `const body = await request.json();` (line 37), with `email`/`mode`/`sendEmail` read off `body`. So `body.note` is already reachable — no change needed at the parse site.

In `src/app/api/collections/[id]/invite/route.ts`, inside the `if (mode === 'email' && sendEmail) {` branch (line 309), BEFORE the `buildLibraryInviteEmail` call, add the sender load, count, and note read:

```ts
// The invitation now reads like a note from the sender, so it needs
// the sender's real name (for the from-line) and email (for reply-to).
const senderUser = await db.user.findUnique({
  where: { id: userId },
  select: { name: true, email: true },
});
const senderFullName = senderUser?.name?.trim() || null;
const senderEmail = senderUser?.email?.trim() || null;

// Total things on the shelves for the "…and N things" line.
const itemCount = await db.item.count({
  where: {
    collections: { some: { collectionId: libraryId } },
    active: true,
  },
});

// The sender's own words: optional, trimmed, capped.
const noteInput =
  typeof body?.note === 'string'
    ? (body.note as string).trim().slice(0, 500)
    : null;
```

(`userId` and `libraryId` are already in scope in this branch; `body` is the parsed request body from line 37.)

- [ ] **Step 4: Pass the new inputs to the builder and drop `description`**

The current builder call is:

```ts
const { subject, html } = buildLibraryInviteEmail({
  libraryName: invitation.collection?.name || 'a library',
  senderName: invitation.sender?.name,
  shareLink,
  description: (library as { description?: string | null }).description ?? null,
  itemWatercolors,
});
```

Replace it with (drop `description`; add `note`, `itemCount`, `location`; take `text`; use the loaded `senderFullName` so the from-line and body agree):

```ts
const { subject, html, text } = buildLibraryInviteEmail({
  libraryName: invitation.collection?.name || 'a library',
  senderName: senderFullName ?? invitation.sender?.name ?? null,
  shareLink,
  note: noteInput,
  itemCount,
  location: (library as { location?: string | null }).location ?? null,
  itemWatercolors,
});
```

- [ ] **Step 5: Personalize the Resend send**

The current send is:

```ts
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'StuffLibrary <invites@stufflibrary.org>',
  to: [email!],
  subject,
  html,
});
```

Replace it with:

```ts
// Display name changes; the sending address stays invites@ so
// SPF/DKIM/DMARC alignment is untouched. Quote the display name (it
// contains parens) and strip any stray quotes from the sender's name.
const fromName = senderFullName
  ? `"${senderFullName.replace(/"/g, '')} (via StuffLibrary)" <invites@stufflibrary.org>`
  : 'StuffLibrary <invites@stufflibrary.org>';

const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: fromName,
  to: [email!],
  ...(senderEmail ? { replyTo: senderEmail } : {}),
  subject,
  html,
  text,
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run "src/app/api/collections/[id]/invite/__tests__/route.email.test.ts"`
Expected: PASS (3 tests). If a test fails because the route touches an unmocked `db` model, extend the hoisted `db` mock (not the route).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (Confirms the builder/route contract lines up and `replyTo` is a valid Resend field.)

- [ ] **Step 8: Commit**

```bash
git add "src/app/api/collections/[id]/invite/route.ts" "src/app/api/collections/[id]/invite/__tests__/route.email.test.ts"
git commit -m "feat(invites): personal from-name, reply-to sender, item count, multipart send

The invite email now goes out as \"<Sender> (via StuffLibrary)\" with
Reply-To the sender's real address and a plain-text part, threads the
sender's note, and counts the shelves. Sending address unchanged, so
SPF/DKIM alignment holds.

Why: make a reply reach the neighbor who invited you, and give Gmail the personal-mail signals that land it in Primary

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The note field in the send form

**Files:**

- Modify: `src/components/ManageMembersModal.tsx` (note state ~L105 area, the POST body ~L230, the invite form JSX ~L830-851)
- Test (create or extend): `src/components/__tests__/ManageMembersModal.note.test.tsx`

- [ ] **Step 1: Write the failing test**

First check whether a `ManageMembersModal` test already exists (`ls src/components/__tests__/ | grep -i managemembers`). If one exists and has usable setup, extend it; otherwise create `src/components/__tests__/ManageMembersModal.note.test.tsx`. Because the modal fetches on open and pulls many deps, the simplest reliable approach is to mock `fetch` and assert the POST body. Create:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ManageMembersModal } from '../ManageMembersModal';

// The modal calls fetch on open (load members, load limit) and on submit.
function mockFetchOk(body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ManageMembersModal — personal note', () => {
  it('pre-fills the note with an editable default and posts it', async () => {
    const fetchMock = mockFetchOk({ members: [], invitations: [] });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ManageMembersModal
        open
        onClose={() => {}}
        collectionId="lib_1"
        collectionName="HAASS"
        initialTab="add"
      />
    );

    // Move to the +Add tab if needed and find the note field pre-filled.
    const note = (await screen.findByLabelText(/note/i)) as HTMLTextAreaElement;
    expect(note.value).toContain('HAASS');

    // Fill email, edit the note, submit.
    const emailField = screen.getByLabelText(/email/i);
    fireEvent.change(emailField, { target: { value: 'nora@example.com' } });
    fireEvent.change(note, { target: { value: 'Come borrow the saw.' } });
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      const inviteCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          String(url).endsWith('/invite') && opts?.method === 'POST'
      );
      expect(inviteCall).toBeTruthy();
      const sent = JSON.parse(inviteCall![1].body);
      expect(sent.email).toBe('nora@example.com');
      expect(sent.note).toBe('Come borrow the saw.');
    });
  });
});
```

NOTE: match `initialTab` / prop names to the real `ManageMembersModalProps` (read the interface at ~L45). If the `+Add` tab isn't shown by `initialTab`, click it first (`fireEvent.click(screen.getByText('+Add'))`). If `getByLabelText(/note/i)` needs the exact label, align it with the label you give the field in Step 3. Adjust selectors to the real DOM, but keep the assertion: the POST body includes `email` and the edited `note`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/ManageMembersModal.note.test.tsx`
Expected: FAIL — no note field exists.

- [ ] **Step 3: Add the note state, pre-filled from the library name**

In `src/components/ManageMembersModal.tsx`, near `const [email, setEmail] = useState('');` (~L105), add:

```ts
const defaultNote = `I set aside a card for you at ${collectionName} — borrow anything, free.`;
const [note, setNote] = useState(defaultNote);
```

`collectionName` is already a prop (see `ManageMembersModalProps`).

- [ ] **Step 4: Send the note in the POST body**

In `handleInviteSubmit`, change the invite POST body from:

```ts
        body: JSON.stringify({ email: email.trim() }),
```

to:

```ts
        body: JSON.stringify({ email: email.trim(), note: note.trim() }),
```

- [ ] **Step 5: Render the note field in the form**

In the invite form JSX, immediately AFTER the closing `</Box>` of the email `TextField` block (the `<Box sx={{ mb: 3 }}>…</Box>` that wraps the "Friend's Email" field, ~L851) and BEFORE the rate-limit hint `<Box>`, add:

```tsx
<Box sx={{ mb: 3 }}>
  <TextField
    fullWidth
    multiline
    minRows={3}
    label="A note (optional)"
    value={note}
    onChange={(e) => setNote(e.target.value)}
    disabled={isLoading || Boolean(inviteGate)}
    helperText="Your own words land this in their inbox, not their spam. Edit freely."
    inputProps={{ maxLength: 500 }}
    sx={{
      '& .MuiOutlinedInput-root': {
        backgroundColor: brandColors.white,
      },
    }}
  />
</Box>
```

- [ ] **Step 6: Reset the note after a successful send**

In `handleInviteSubmit`, where it currently does `setEmail('');` on success (~L237), also reset the note to the default:

```ts
setSuccess(`Invitation sent to ${email}`);
setEmail('');
setNote(defaultNote);
loadData(); // Refresh the invitations list
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/ManageMembersModal.note.test.tsx`
Expected: PASS. Adjust selectors (not behavior) if the DOM query needs it.

- [ ] **Step 8: Typecheck + lint the file**

Run: `npx tsc --noEmit && npx eslint src/components/ManageMembersModal.tsx`
Expected: exit 0 / no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/ManageMembersModal.tsx src/components/__tests__/ManageMembersModal.note.test.tsx
git commit -m "feat(invites): optional personal note on the send form

An editable, pre-filled note field on the invite form; its text posts
as `note` and becomes the sender's words in the email.

Why: the dossier asks for the sender's own words in the email — the sentences the first invitees praised in person

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final verification and PR

**Files:** none modified (unless verification finds regressions).

- [ ] **Step 1: Full unit suite**

Run: `npm run test:unit 2>&1 | tail -8`
Expected: no failures beyond any pre-existing ones (this session's main-branch baseline was 991 pass / 2 skip before this branch; this plan rewrites the email tests and adds route + modal tests, so counts shift — there must be no failures).

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean (only pre-existing `any` warnings).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/invite-email-rebuild
```

Open a PR to `main` titled `feat(invites): rebuild the invite email to reach Primary`. Body: summarize the note-first template (`{subject, html, text}`), the personal from-name + `replyTo` sender + multipart send, the optional note field, and the removal of the false auto-account line. Note SPF/DKIM alignment is untouched (sending address unchanged) and that sender-funnel visibility stays sub-project E. Link the spec. End the body with:

```
Field-Note-Why:         dossier Finding 1 — the invitation was shaped like a newsletter, landed in Promotions, and most of the first six invitees plausibly never saw it
Field-Note-Interesting: nothing about deliverability here is DNS work — the fix is message shape (personal from-name, reply-to, text part, one link, no "!")
Field-Note-Deferred:    sender-side funnel visibility (opened/joined/cancel/resend) — sub-project E

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Manual check (human, on preview)**

Send a real invite to yourself: confirm it arrives in Primary (not Promotions), the from-line reads "<You> (via StuffLibrary)", a reply is addressed to your real email, the note you typed appears, the CTA lands on the guest preview, and there is no "account created automatically" line.
