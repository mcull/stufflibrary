# Build Spec: Turning These Docs into Pages

> For Claude Code (or any implementer) working in the main codebase. This spec describes
> _what to build_ from the content docs in this folder; it deliberately avoids prescribing
> component-level details that should follow the codebase's existing MUI/Tailwind patterns
> and the Brand Brief (docs/BrandBrief.md).

## What's in this folder

| File                                    | Becomes                                                               | Audience                |
| --------------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| `directory-lending-libraries.md`        | `/borrow-nearby` (or `/lending-libraries`) — state-by-state directory | Public, SEO-significant |
| `further-reading.md`                    | `/further-reading` — annotated bibliography                           | Public, SEO-significant |
| `sharing-ecosystem.md`                  | `/sharing-world` (or `/friends`) — field guide to other networks      | Public, SEO-significant |
| `commons-not-tragedy.md`                | `/commons` (or `/why-this-works`) — Ostrom page                       | Public                  |
| `faq.md`                                | `/faq`                                                                | Public                  |
| `../internal/funding-sustainability.md` | **Not a page.** Internal decision doc.                                | Marc                    |

Each content doc has three sections: a _framing intro_ (publish), the _body_ (publish), and _editorial notes_ (do NOT publish — they contain implementation hints and fact-check caveats).

## Placement & navigation

- These are quiet civic pages, not marketing. Suggest a footer group titled **"The Commons"** or **"Learn"**: Directory · Further Reading · The Sharing World · Why This Works · FAQ.
- Cross-links between the five pages are noted inline in each doc (italicized _"see our..."_ references). Wire them as internal links.
- Keep global nav uncluttered; FAQ may deserve a header slot, the rest live in the footer.

## Page-specific notes

### Directory (`directory-lending-libraries.md`)

- Structure: intro → state accordion or state-anchor index (A–Z) → entries.
- Each entry renders: name (linked), city, type badge, 1–2 sentence description, address/hours where present, and a small "verified July 2026" note where marked. Entries marked UNVERIFIED get a subtle "unverified" badge or are held back — implementer's choice, but never present UNVERIFIED as verified.
- Include the "snapshot, not registry" disclaimer from the doc's intro and the "know one we missed?" invitation (mailto or feedback link).
- SEO: this page should ship with per-state anchors (`#california`), descriptive `<title>`/meta ("Tool libraries and Libraries of Things in [state] — a July 2026 directory"), and JSON-LD `ItemList` markup if cheap to add. It is the most search-relevant page of the set.
- Consider `generateStaticParams`-style static rendering; content changes rarely.

### Further Reading (`further-reading.md`)

- Render threads as sections; each work as a card or definition-list item: title (em), author, year, annotation. "⭐ start here" works get a visual flag.
- No affiliate links, no bookstore links — deliberately. If any link is added per work, prefer the reader's public library: a WorldCat search link is acceptable.
- The "ideas alive today" org list renders as a simple linked list.

### Sharing World (`sharing-ecosystem.md`)

- One section per network with the "Find yours:" line rendered prominently as the action.
- The closing "So where does StuffLibrary fit?" section is the differentiation content — keep its humble tone intact; do not let it become a competitive matrix.

### Commons page (`commons-not-tragedy.md`)

- Long-form prose page. The 8 numbered principle-mappings could render as a two-column or stacked pattern: Ostrom's principle (plain-English gloss) → what StuffLibrary does.
- Sources render as a modest footnote/further-sources block at the bottom.

### FAQ (`faq.md`)

- Standard FAQ page; consider `FAQPage` JSON-LD for SEO.
- **BLOCKERS:** three answers contain `[PLACEHOLDER]` markers (watercolors, who's-behind-this, bring-it-to-my-neighborhood) pending Marc's answers to the "Questions for Marc" section. Do not ship the page until those are resolved; either get answers or drop those entries for v1.
- The "Questions for Marc" section is not publishable content.

## Voice & style guardrails (from the Brand Brief)

- Plainspoken, warm, wry. No "seminal," no "paradigm," no exclamation-point marketing.
- The brand recedes: these pages should read like a good librarian's handout, not a startup's content-marketing hub.
- Formatting: generous prose, minimal bold, no walls of bullets on the public pages (the directory is the exception — it's reference material).
- Watercolor/library visual accents welcome but light; these pages should be fast and text-first.

## Freshness

- Directory and ecosystem pages carry a visible "Snapshot: July 2026" date line. Add a repo TODO/issue to re-verify annually.
- If a "report a stale link" mechanism exists (the feedback system in the repo), point both pages' invitations at it.
