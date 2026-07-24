# Invite email rebuild

**Date:** 2026-07-24
**Source:** "Invite Flow Redesign" dossier (claude.ai/design `b1e5907c-6dae-4a64-b6ae-90d68dffdfb8`), Section D ("The invitation email, rebuilt to reach Primary") and Finding 1, plus `docs/product/InviteFlows.md`.
**Sub-project:** A of the invite-flow redesign tier. B (guest preview / front porch) shipped in PR #508; the rest (C onboarding ceremony, D arrival, E sender funnel, F recovery, G flyer steward) keep their own spec→plan→build cycles. Decomposition tracked in memory `stufflibrary-invite-flow-redesign`.

## Why

The current invitation is a well-made _product_ email — which is exactly the problem. Gmail sorts by shape, and this one is shaped like a newsletter: a big wordmark badge, a centered library-name headline, "invited you to join their library on StuffLibrary," an exclamation-point subject, three images, a big button. Finding 1 of the dossier: it lands in Promotions, and most of the first six invitees plausibly never saw it. Two more current defects: there is no `Reply-To` (a reply bounces off `invites@`), and the footer still promises "an account will be created for you automatically" — false since the #503 auto-sign-in sunset. This sub-project reshapes the email to read like a personal note from the sender and reach the Primary tab.

## Decisions (from brainstorming)

1. **Reply-To = the sender's real email.** A reply becomes a neighborly thread instead of bouncing. This reveals the sender's email to the person they invited; acceptable because the sender already chose to reveal themselves by name. Omitted only if the sender somehow has no email on file.
2. **Personal note:** an optional multiline field on the send form, **pre-filled with an editable default**, sent as a `note` param and rendered as the sender's voice in the email. Blank → a sensible default sentence in the email body.
3. **Scope:** A includes the note _input_ in `ManageMembersModal` (core to the dossier's "sender's own words" thesis) plus its API plumbing — but **not** the sender-side funnel visibility (opened/joined/cancel/resend), which stays sub-project E.

## Architecture

Three units, each independently testable.

### 1. Dispatch — `src/app/api/collections/[id]/invite/route.ts`

The email-send branch (`mode === 'email' && sendEmail`) changes:

- **Load the sender.** The route has `userId`; load `{ name, email }` for the acting user (the sender). (Today it only threads the sender's name via `invitationInclude`; the email address is needed for `replyTo`.)
- **From (personal, alignment-safe).** The sending address stays `invites@stufflibrary.org` so SPF/DKIM/DMARC alignment is untouched — only the display name changes:
  - `from: '"<Sender Full Name> (via StuffLibrary)" <invites@stufflibrary.org>'` — the display name is **double-quoted** because "(via StuffLibrary)" contains RFC 5322 comment characters. Falls back to `'StuffLibrary <invites@stufflibrary.org>'` when the sender has no name.
- **Reply-To.** `replyTo: <sender email>` when present; omit the field entirely when absent.
- **Item count.** Add a lightweight `db.item.count` for active items in the library (the route already fetches up to 3 watercolors; it does not currently have the total). Passed to the builder for the "…and N things on the shelves" line.
- **Note.** Read `note` from the request body (see unit 3), pass it to the builder.
- **Builder inputs.** The route passes `senderName` (full name), `note`, `itemCount`, and `location` to `buildLibraryInviteEmail` (which owns `subject`, `html`, and `text` — see unit 2).
- **Multipart send.** Pass the builder's new `text` part to `resend.emails.send({ from, to, replyTo, subject, html, text })`.

The `from` display name uses the sender's full `name`; the builder derives the subject's/footer's first name from the same `senderName` (a plain `.split(/\s+/)[0]` inline — the module stays dependency-light).

### 2. Template — `src/lib/invite-email.ts`

`buildLibraryInviteEmail(input)` returns **`{ subject, html, text }`** (adds the plain-text part). It stays a pure module (no side-effectful imports). The input gains `note`, `itemCount`, and `location`; the existing `senderName` now carries the sender's **full** name, and the builder derives the first name inline (`senderName.split(/\s+/)[0]`) for the subject and footer.

- **Subject** (built here). No exclamation point: `<SenderFirstName> invited you to <LibraryName>`, with a short location descriptor appended when `location` is set (`… — the stuff library for <location>`). Falls back to `Someone invited you to <LibraryName>` when `senderName` is absent.
- **Open like a note.** Drop the large centered wordmark badge + "Share more, buy less" lead. Begin "Hi —" then the sender's line: "**<Sender Full Name>** set aside a library card for you at **<Library>** — a lending library of stuff your neighbors stock together. Borrow anything, free." A small text wordmark may remain as a modest sign-off, not a banner.
- **The personal note** rendered as a short quoted aside in the sender's voice (the `note`, or the default sentence when blank).
- **Real item art + count.** The ≤3 watercolors (library's own, stock fallback) stay, followed by "…and <itemCount> things on the shelves" (singular/plural correct; omitted if count unavailable).
- **One modest CTA → the front porch.** `/join/<shortCode>` already lands on the guest preview post-#508. CTA copy becomes "**Have a look at the shelves**" (a look, not a commitment), with the plain URL printed as a fallback line beneath (survives link-stripping, works cross-device).
- **Footer.** Privacy answered — "Only members can see who's in a library — your name, face and address are never public." Plus "You can reply to this email — it goes to <SenderFirstName>." **Remove** the false "an account will be created for you automatically" line. Keep "expires in 7 days" and "didn't expect this? ignore it."
- **Deliverability constraints honored:** text-first, ≤3 images, no subject "!", plain-text part present, single link domain (`stufflibrary.org`).
- **Escaping:** the `note` is sender-authored and MUST be HTML-escaped (existing `escapeHtml`) in the HTML part; the text part uses it raw (plain text needs no escaping) but still length-capped upstream.

### 3. The personal note input — `src/components/ManageMembersModal.tsx` + API

- **Send form.** The email-invite form gains an optional multiline note field, **pre-filled** with an editable default: "I set aside a card for you at <Library> — borrow anything, free." The POST body becomes `{ email, note }`.
- **API.** The route accepts `note` (optional string): trim, cap at 500 characters, ignore if empty after trim. Passed to the builder. This is the only `ManageMembersModal` change in scope — no funnel/status UI.

## Error / edge handling

- **No sender name** → from-name falls back to `StuffLibrary <…>`, subject to "Someone invited you to <Library>".
- **No sender email** → `replyTo` omitted; everything else unchanged.
- **Blank/whitespace note** → the email renders the default sentence, not an empty aside.
- **Item count query fails / zero** → the "…and N things" line is omitted; the art block (with stock fallback) still renders.
- **Email send throws** → unchanged from today: the invitation is still created and the route returns success with a `warning` and the share link.

## Testing

**`src/lib/__tests__/invite-email.test.ts`** (extend existing):

- Subject contains no "!" and reads "<First> invited you to <Library>" (+ location descriptor when provided).
- Return value includes a non-empty `text` part carrying the note, the join link, and the item count.
- The `note` is HTML-escaped in `html` (inject `<script>`/`"` → escaped; injection guard).
- Blank note → default sentence appears in both parts.
- Stock-art fallback still applies when no `itemWatercolors`.
- The string "created for you automatically" no longer appears in `html` or `text`.

**Route test** (`src/app/api/collections/[id]/invite/__tests__/` — new or extend):

- `resend.emails.send` called with a quoted personal `from` display name and `replyTo` = sender email.
- `note` from the body is threaded to the builder (trimmed, capped).
- Sender missing name/email → from/subject/replyTo fall back per the edge rules.

**`ManageMembersModal`** (`src/components/__tests__/`):

- The note field renders pre-filled with the default; editing it and submitting posts `{ email, note }`.

## Out of scope

Sender-side funnel visibility (opened/joined/cancel/resend) — sub-project E. The onboarding ceremony — C. Any deliverability _infrastructure_ change (SPF/DKIM records, sending domain) — the from-address and domain are unchanged, so no DNS work; the checklist items are satisfied by the message shape, not new records. The join-code/share-link email path (there isn't one; share links are copied, not emailed).
