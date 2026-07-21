# Library Invitations: Join Codes, Bound Invites, QR, and Flyers

**Date:** 2026-07-20
**Status:** Approved for planning

## Problem

Getting someone into a library today has two paths, and both are strained.

`https://stufflibrary.org/j/958af19b78c64167c0e8eb0b9d85c979abc580ebf7844cd77d3838df9d88568e` is a
64-character hex token. It is intimidating in an email, hostile in a text message, and unprintable
on paper.

Worse, one object is being asked to do two incompatible jobs. `Invitation` is modeled as
addressed-to-one-person — required `email`, `@@unique([email, senderId, libraryId])`,
burned on accept by `acceptInvitation`. But link-sharing already has to lie to fit through it,
fabricating `link-${token}@share.stufflibrary.local` to satisfy the unique constraint
(`src/app/api/collections/[id]/invite/route.ts:240`). A QR code on a flyer in fifty mailboxes is one
code and fifty strangers. The current model cannot express that without lying harder.

And the personal invite is currently the worst of both worlds. `handleInviteLanding` never compares
the signed-in user's email to the invitation's, so a forwarded link silently works and burns Dave's
invite for a stranger — yet the recipient still pays full friction: guest preview, then email, then
a six-digit code. It carries the cost of intentionality while providing none of its safety.

## Decisions

### Two objects, not one

Personal invites and broadcast join codes are separate models. This mirrors how Google Drive
("invite specific people" vs "anyone with the link") and Figma both solve it. They want opposite
lifetimes and opposite revocation stories:

|               | Personal invite     | Join code           |
| ------------- | ------------------- | ------------------- |
| Addressed to  | One email           | Nobody              |
| Lifetime      | 7 days              | Until rotated       |
| Uses          | One                 | Unlimited           |
| Revocation    | Expires / cancelled | Owner rotates       |
| Attribution   | Sender → receiver   | Which code, not who |
| Guest preview | No                  | Yes                 |

### Personal invites become bound

Accepting requires the session's email to match the invitation's. A mismatch shows a dead end
modeled on Google's "You need access": _"This invitation was sent to d•••@example.com"_ with a
button to sign in as that address.

This is a deliberate product choice, not an industry mandate — research found genuine binding only
in Google (Restricted mode) and GitHub org invites. Figma's docs state the opposite, that
invitations "are not explicitly linked to a Figma account," and Notion's could not be verified. We
choose binding because the goal is intentional inviting, and because unbound-but-slow is the one
combination with no defense.

### The invite link never authenticates

Across all seven products researched, none use an invite link as a magic-link authenticator; every
one routes to normal sign-in. We follow suit. The invite **pre-authorizes an identity**; the user
still proves that identity with the existing email-code flow.

The friction win comes from prefilling instead: Dave arrives at sign-in with his email already
filled and locked, and types nothing but the code.

### 8-character Crockford base32

`32^8` = exactly 2^40 = 1,099,511,627,776.

Length is driven by **density**, not keyspace. An attacker sweeps for any valid code, so the hit
rate is live-codes ÷ keyspace:

| Format         | Keyspace  | At 250k libraries | Effort per hit           |
| -------------- | --------- | ----------------- | ------------------------ |
| 3 × base64     | 262,144   | ~1 in 1           | broken at any scale      |
| 5 × base64     | 1.07 B    | 1 in 4,300        | ~7 min at 10/sec         |
| **8 × base32** | **1.1 T** | **1 in 4.4 M**    | **~10 months at 10/min** |

Five characters is enumerable by a laptop, and what a sweep harvests is a neighborhood's item list
plus members on a map.

Crockford base32 specifically, over base64:

- Case-insensitive — typed off a flyer in caps, it works.
- No `+`, `/`, `=` — URL-safe and speakable.
- Excludes I, L, O, U — no 1-vs-I or 0-vs-O misreads in print, and dropping U makes accidental
  profanity far less likely on something printed fifty times.
- Decodes `1`→`I` and `0`→`O`, so a misread still resolves.

Displayed hyphenated (`XKF7-2M9Q`), stored unhyphenated, normalized on lookup.

Length is **not** encoded anywhere. Lookup is exact-match, so 9- and 10-character codes can be
minted later with no migration and no invalidation of existing codes.

### Guest preview splits

Guest preview stays for join codes and is removed for personal invites.

A stranger who scanned a corkboard QR needs to see the shelf before deciding to bother. Dave, who
was personally invited to a specific library, asked a direct question and should get a direct answer.
His current detour through `/library/<id>?guest=1` is an artifact of one handler serving both cases,
not a decision anyone made.

## Data model

### New: `JoinCode`

```prisma
model JoinCode {
  id           String     @id @default(cuid())
  code         String     @unique              // 8 chars, Crockford base32, unhyphenated
  collectionId String     @map("libraryId")
  createdById  String
  isActive     Boolean    @default(true)
  label        String?                         // "corkboard flyer", "spring mailers"
  useCount     Int        @default(0)
  createdAt    DateTime   @default(now())
  rotatedAt    DateTime?
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  createdBy    User       @relation(fields: [createdById], references: [id])

  @@index([collectionId])
  @@map("join_codes")
}
```

No `expiresAt`. Figma and Notion both solve a leaked standing link with regenerate rather than
expiry, and that is the right shape for a code living in a mailbox — a flyer that dies after seven
days is worse than useless. Rotation deactivates the old row and mints a new one, so old flyers fail
closed and the audit trail survives.

`label` exists so an owner running both a mailbox drop and a corkboard posting can tell which one
worked.

### Changed: `Invitation`

```prisma
shortCode String? @unique   // 8 chars, Crockford base32, unhyphenated
```

Nullable because existing rows have none; they keep resolving through `/j/<token>` as before.

Binding itself needs no schema change — it is enforced in application code by comparing the session
email to `invitation.email`. The synthetic `link-*@share.stufflibrary.local` addresses stop being
generated once link-mode moves to `JoinCode`; existing rows are left alone.

The unused `qrCode` column stays unused — QR codes are rendered on demand, not stored.

### Changed: `CollectionMember`

```prisma
joinedViaCodeId String?   // JoinCode.id, null for personal invites and owner-adds
```

Borrowed from Nextdoor, whose invite codes exist mainly so the inviting neighbor gets credit. It is
what makes "who came in off that corkboard flyer?" answerable — including for the deferred
flagging work, where the provenance of a member is exactly what an owner wants when something
goes wrong.

## Routes

| Route             | Behavior                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `/join/<code>`    | New. Resolves against `JoinCode`, then `Invitation.shortCode`. Both indexed; two lookups. |
| `/j/<token>`      | Unchanged. Existing 64-hex links keep working indefinitely.                               |
| `/invite/<token>` | Unchanged legacy alias.                                                                   |

Personal invites gain a short code alongside their existing token; both resolve to the same
invitation. Emails and any SMS use the short form.

### Rate limiting

`/join/<code>` is rate-limited per IP on **failed** lookups specifically — a valid code resolving is
not suspicious, a sweep of invalid ones is. This is the control that turns the density table's
"10 months" from arithmetic into a guarantee.

## Flows

> **Two different codes appear below.** The **join code** is the 8-character Crockford string in the
> URL (`XKF7-2M9Q`). The **sign-in code** is the existing 6-digit number emailed by the `email-code`
> provider (`src/lib/auth.ts:33`). They are unrelated and never interchangeable.

### Personal invite

1. Owner invites `dave@example.com`. Row created, join code minted, email sent with
   `/join/XXXXXXXX`.
2. Dave clicks. The route resolves the join code to an `Invitation` and finds no session. It sets
   the existing `invite_token` + `invite_library` cookies and redirects to `/auth/signin` — not to
   the guest preview. Sign-in shows his address prefilled and locked.
3. He requests a **sign-in code**, which is emailed to that locked address, and enters the 6 digits.
   `authorize()` verifies it and upserts him with `profileCompleted: false`. NextAuth redirects to
   `/auth/callback`.
4. `/auth/callback` POSTs `/api/invite/consume` exactly as it does today
   (`src/app/auth/callback/page.tsx:75`). Membership is created, the invitation is burned, and he
   lands on the library — or `/profile/create?returnTo=/library/<id>` if name and terms are
   outstanding. Unchanged.

Signed-in behavior is unchanged, including the #409 rules: owners and existing members never burn
an invite for its real addressee.

**Where the prefilled address comes from.** `invitation.email`, on the row resolved in step 2,
carried forward in the httpOnly invite cookie — **not** a query parameter. `?email=dave@example.com`
would land in browser history and outbound `Referer` headers, and the sign-in page can read the
cookie server-side instead. No reason to leak it.

### Binding enforcement

`/api/invite/consume` gains one comparison: does `session.user.email` equal `invitation.email`? On
mismatch nothing is burned and nothing is granted — the user sees _"This invitation was sent to
d•••@example.com"_ with a button to sign in as that address.

**This check cannot fail during the flow above.** Dave signed in by proving control of an address
that was locked to the invitation, so it matches by construction. Prefilling is what makes the happy
path pass automatically.

The check exists to catch arrivals by every _other_ route:

- **OAuth.** `GitHubProvider` is configured (`src/lib/auth.ts:27`). A user who signs in with GitHub
  under a different address never touches the locked field.
- **An existing session.** Sessions last 90 days (`src/lib/auth.ts:21`), so a forwardee may already
  be signed in as themselves and skip sign-in entirely.
- **The signed-in branch of the join route**, which bypasses sign-in by design.

Implement it once, in `consume`, rather than per-entry-path — every route converges there.

### Join code

1. Owner generates a code, gets a QR and a flyer.
2. Stranger scans. Not signed in → `/library/<id>?guest=1` with the code in a cookie, as today.
3. Sees the library, decides, signs in normally.
4. On consume: membership created with `joinedViaCodeId` set, `useCount` incremented. The code is
   not consumed.

## Roster privacy (folded in)

`GET /api/collections/[id]/members` currently returns, for every member, to every member:

```
name, email, image, addresses: { address1, city, state, zip, formattedAddress }
```

Full street address and email, and any member can `curl` it. That is defensible when the only door
is a deliberate personal invite. It is not defensible once a QR code on a corkboard is a front door
— a stranger joins and immediately has every neighbor's home address and email.

`address1`, `formattedAddress`, and `email` come out of the default response — `formattedAddress`
included, since it embeds the street address the other two are being removed to protect. `city`,
`state`, and `zip` remain, since the map is a real feature and they place a member on a block
without placing them at a door.

This ships **with or before** join codes, not after; it is a prerequisite, not a follow-up. The
owner-facing member management view may still need contact details — if so, that is an explicit
separate response shaped for owners, never the default roster payload.

## QR and flyer

QR uses the existing `qrcode@1.5.4` dependency, already used in `LibraryCard.tsx`. Rendered on
demand, encoding `https://stufflibrary.org/join/XXXXXXXX`, in ink blue on warm cream.

The flyer is a **zero-to-one mailbox letter**, and every constraint follows from that framing:

- It must work when the library is **empty**. A new library has one member and no items, so the
  flyer sells the idea and the founder's credibility, never inventory.
- It must not read as junk mail. A short note from a house number on your own street survives the
  walk to the recycling bin; an advertisement does not.
- **No neighbor names, ever.** "pressure washer — Dev" tells an unknown reader that Dev has a
  pressure washer and lives within walking distance.

**Founder writes** (prefilled, fully rewritable, character-limited with a live-rerendering preview):
greeting, three body paragraphs, sign-off, and house number.

The house number is prefilled from their address record but must be visibly labeled as printed and
easily removable. It is what makes the letter credible — a claim you can check by walking outside —
and it is also a disclosure. Prefilling it silently would be wrong.

Body text is editable rather than fixed because a letter that sounds personal but ships identically
to ten thousand people is a form letter in costume — and would be false. If the founder does not own
a pressure washer, their flyer must not say so.

**Template fixes:** the QR (never resizable below scan threshold), the join URL as one readable
string, the line _"Scan it, or type it in. Same place either way."_, and the about block:

> **StuffLibrary** is a free website anyone can use to host virtual libraries of real stuff. No ads,
> nothing for sale, no data sold. Just more sharing, less buying, and a checkout system that makes it
> easy to remember to return stuff on time.

The URL appears as one string (`stufflibrary.org/join/XKF7-2M9Q`) rather than a code beside a base
URL, so there is no "where do I put the code?" moment. Its job is not convenience — the QR handles
that — it is trust. QR phishing is common enough that an opaque black box on an anonymous flyer is
a reason to hesitate, and a human-readable URL is the answer.

Output is print-ready PDF at US Letter.

## SMS

A "Send this as a text" button on the **join code**, not the personal invite, using the `sms:` URI
scheme to open the native messaging app with a prefilled body. Client-side only; no Twilio.

Platform quirks: iOS wants `sms:&body=`, Android `sms:?body=`. On mobile, prefer the existing
`navigator.share()` path already used in `ManageMembersModal.tsx:743-840`, which surfaces Messages
as a share target; the `sms:` link is the fallback where Web Share is unavailable.

It belongs on the join code because the personal invite is now bound — texting Dave a bound invite
works, but he still needs the matching email, so the text is only a nudge. The join code has no
address to match.

**Note:** `src/lib/twilio.ts` exports a stubbed `sendSMS` that logs and returns `success: true`
while sending nothing. Nothing in this spec depends on it, but callers in the borrow-notification
path currently believe SMS is being delivered.

## Testing

- **Code generation:** alphabet excludes I/L/O/U; profanity filter rejects and regenerates;
  collision retry; case-insensitive and `1`/`I`, `0`/`O` normalization on lookup.
- **Binding:** matching email joins; non-matching email is refused, invite not burned, no membership
  created; owner and existing-member paths still do not burn (#409 regression coverage). Cover the
  paths that actually trigger it, not just the prefilled happy path — OAuth sign-in under a
  different address, and a forwardee arriving with a live session of their own. The happy path
  passes by construction and proves nothing.
- **Prefill:** the invited address reaches the sign-in page via cookie and never appears in the
  URL.
- **Join codes:** multi-use; `useCount` increments; rotation deactivates the old code and the old
  code then fails; `joinedViaCodeId` is recorded.
- **Roster:** default member response contains neither `address1` nor `email`.
- **Rate limiting:** repeated invalid `/join` lookups from one IP are throttled; valid lookups are not.
- **Flyer:** renders at maximum-length field content without pushing the QR off the page.

## Out of scope

**Deferred, to be specced separately: roster UI and member flagging.** Both are closer to done than
they appear. The roster API already serves every member to every member. `UserReport`
(`prisma/schema.prisma:434-458`) is fully modeled with a `libraryId`, an eight-value reason enum, a
status and priority workflow, an admin review queue in `ReportManagement.tsx`, a PENDING counter on
the admin desk, and it feeds `trust-score.ts`.

What is missing is remarkable: `grep -rln "userReport.create" src` returns nothing. There is no way
for a human to file one. The entire pipeline exists downstream of an event that cannot occur. That
work needs `POST /api/reports` and an affordance — small, and worth doing soon after this.

Also out of scope: server-sent SMS (Twilio), postal mail integration, per-code access levels, and
max-use limits on join codes.

## Open questions

- Should join-code rotation notify existing members, or is it silent?
- Does the flyer generator need a corkboard variant with tear-off strips, or is the mailbox letter
  enough for now? (Deferred; the letter was the requested artifact.)
