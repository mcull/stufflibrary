# UX Friction Ledger

**What this is:** a ranked inventory of friction in StuffLibrary's core funnel, from a **live walkthrough of production** (2026-07-04) — driven end-to-end as a brand-new account (`marc+ux01@cull.ventures`, "Sam Tester"): landing → join → email code → minimal entry → arrival → create library → empty shelf. Logged-in beats (stacks with data, collection with items, profile) walked on the existing test account.

**The lens** (see product north star): a new user who isn't sure what they're using or why, but knows libraries and sharing deeply. Not a tech enthusiast; probably invited. The product should disappear in their hands. Test for every screen: _does this make them notice the product, or the sharing?_

**Not yet walked:** borrowing/lending, invite send/accept, add-item camera flow, trust mechanics. This ledger covers entry → library → stuff only.

---

## What's working — protect these

- **Landing page.** "Borrow, Lend, Belong." + the picket-fence hero is exactly the warmth we want. Don't touch it.
- **The watercolor item cards.** They ARE the brand. (Text-leak fix #393 protects them.)
- **The library page header block** — big serif title, Owner/Private chips, "Since July 2026", 📍 location. Feels like a real library card.
- **The under-a-minute promise is true.** Name + 5 checkboxes → in. Timed live: ~30s.
- **The new-library funnel** (built this week) works as designed: create → land _inside_ your library → exactly two invitations ("Put your library on the map" + "Add Your First Item"). The map CTA copy lands.
- **Empty-state examples** ("Smith Family", "Oak Street Neighbors") — concrete, warm, useful.

---

## Findings (verified live, ranked within journey stage)

Tags: **[copy]** words only · **[mech]** mechanical code, low risk · **[struct]** needs design conviction first · **(glue)** touches this week's still-settling work.

### A. Joining

| #   | Finding                                                       | Detail & direction                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **"Join Now" → "Enter your email to sign in"** [copy]         | The brand-new user's first screen after committing says _sign in_; the button under the code field also says "Sign in". The one-door design is right — own it in copy: "Enter your email to get started. New or returning, this is the door."                                                                                     |
| A2  | **Step-1 copy says the same thing three times** [copy] (glue) | Card subtitle ("Just your name and a few community basics — you can be in in under a minute.") + section header ("Let's start with the basics") + section body ("Tell us your name and agree to a few community basics. You can add a photo and your address in a minute.") Also the "be **in in**" stumble. One voice, one line. |

### B. Arrival (the highest-leverage moment)

| #   | Finding                                                                                    | Detail & direction                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **"Welcome to Stuff Central, Sam Tester!" / "This is your lending/borrowing hub."** [copy] | A _fourth_ name for home (see D1), and "lending/borrowing hub" is engineer-speak with a slash, at the exact moment to sound human. Direction: "Welcome, Sam. This is your library card catalog — start a library, or wait for a neighbor's invite." (exact words = D1 decision). |
| B2  | **Arrival janks**: spinner-in-a-box, footer riding high, then content pops [mech]          | Stacks has no skeleton yet (pattern exists from #392). Same fix.                                                                                                                                                                                                                 |
| B3  | Root `/` renders an **empty band + footer for ~2s** before redirecting [mech]              | The logged-in front door lurches before every session. Redirect server-side (or hold a full-height shell) so `/` never paints empty.                                                                                                                                             |

### C. Stacks with data

| #   | Finding                                                                 | Detail & direction                                                                                                                                                    |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **"All (1) / Started (1)" chips + "Libraries I Started (1)"** [mech]    | Filter machinery and parenthetical counts for ONE library reads as database admin UI. Hide filter chips below ~4 libraries; drop "(N)" from section headers entirely. |
| C2  | Library card face is a generic people-icon + "1 member" [struct, later] | The shelf's card should feel like its library (e.g., a mosaic of its items' watercolors once it has any). Park until item flows settle.                               |

### D. Naming system (the "cognitively locks together" blocker)

| #   | Finding                                                                    | Detail & direction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **One place, four+ names** [struct — decide before touching]               | Live on prod today: **Stuff Central** (welcome), **/stacks** (URL), **Libraries** (tab), **Current Library** (breadcrumb), **collection** ("Your collection is waiting to come alive!" on a _library_ page), plus /collection/ and /library/ both in URLs. A library-literate person feels the seams instantly. Decide ONE public metaphor ladder (proposal: **Library** = the shared thing; your home = "your Stacks" _only if_ it's used everywhere; item = "stuff"), then a single copy-sweep PR. Cheap to execute, needs Marc's conviction first. |
| D2  | Breadcrumb says "**Current Library**" instead of the library's name [mech] | Use the actual name. Quick.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### E. The library page

| #   | Finding                                                                            | Detail & direction                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **Auto-description: "A community library with 1 members sharing 0 items."** [copy] | Grammar bug ("1 members") AND a deflating zero at the proudest moment. Fresh library: "Just getting started — the shelves are warming up." Pluralize properly after that.                                                               |
| E2  | **4 items fragmented across 3 full-size category sections** [mech]                 | Giant per-category headers for 1–2 items each shreds a small shelf. Flatten to a single grid below ~8 items total (or 2+ categories with <3 each); categories earn their place at scale.                                                |
| E3  | **Map dominance**: viewport-scale map for 1 member [struct-lite]                   | With one located member the map spends the page's best real estate saying "you are here." Consider: compact map (~half height) until ≥2 located members, then grow. Discuss.                                                            |
| E4  | Trust hint isn't state-aware [mech]                                                | Profile shows "Complete your profile and return items on time to raise your score" to a _completed_ profile. Make the hint reflect state.                                                                                               |
| E5  | **Trust as a big number ("Trust 51 New")** [struct — discuss]                      | Credit-score energy; for the anti-capitalist/community persona, numbers-about-me can read as surveillance. Tier-word-only ("New neighbor") with the number tucked behind a tap? Needs a real conversation — 1B built this deliberately. |

### F. Watercolor pipeline

| #   | Finding                                                                                                                     | Detail & direction                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Text/watermark leak — a drill render shipped with a **misspelled "StuffLibary" watermark**; a bottle with a hex code [mech] | Fixed in #393 (prompts said colors as hex codes; model painted them). Merge + verify on next renders.                                                                              |
| F2  | Generation wait is unmasked [mech, with add-item flow]                                                                      | Latency is model-side (~5–15s); the fix is theater — progress copy in brand voice ("mixing the washes…"), skeleton frames, optimistic layout. Tackle with the add-item audit pass. |

---

## Recommended batches

**Batch 1 — words & small mechanics (no fresh glue, ~1 day):**
A1, B1*, D2, E1, E4, C1, A2. (*B1's exact words depend on D1 — if naming isn't decided yet, fix only the subtitle and keep "Welcome, Sam!")

**Batch 2 — the jank track:** B2 (stacks skeleton), B3 (root redirect), + CLS reporting to PostHog so "zero jump" is measured, not vibes.

**Decide-first (structural):** D1 naming ladder → then the sweep. E3 map sizing. E5 trust presentation. Add-item camera-first posture (not yet walked).

**Next audit pass:** add-item (camera + describe + watercolor wait), invite send/accept, borrow/lend handshake.

---

_Test data created during the audit (prod): user `marc+ux01@cull.ventures` ("Sam Tester") + library "Sam's Test Shelf" — reusable for future walkthroughs, or delete freely._
