// FAQ content for /faq — transcribed from docs/content/faq.md (July 2026,
// Marc's answers). Answers are markdown. Entries with `published: false`
// exist in the source doc but are held back from the page (and its JSON-LD)
// until their noted blocker clears.

export interface FaqEntry {
  question: string;
  answer: string;
  published: boolean;
  /** Why an unpublished entry is held back. */
  holdReason?: string;
}

export interface FaqCategory {
  title: string;
  entries: FaqEntry[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: 'The basics',
    entries: [
      {
        question: 'What is StuffLibrary?',
        answer:
          'A neighborhood lending library, but for stuff. Ladders, stand mixers, bar clamps, board games — the things we all own and rarely use. Your neighborhood forms a library, members put items on the shelves (the items stay in their garages; the shelves are the app), and neighbors borrow and return them. Like a book library: things go out, things come back, everyone can see the checkout card.',
        published: true,
      },
      {
        question: 'Is this a rental app? Do I pay to borrow?',
        answer:
          "No. Nothing on StuffLibrary is rented. No fees, no deposits, no money changing hands in the app at all. The lending is neighbor-to-neighbor generosity with good bookkeeping. Using StuffLibrary is free right now; if it someday grows big enough that hosting costs matter, we'll figure out community funding together (think library dues, not subscription tiers). What will never change: no ads, and nothing here is for sale.",
        published: true,
      },
      {
        question: 'How is this different from a Buy Nothing group?',
        answer:
          'We love Buy Nothing groups (and Freecycle, and swap meets — see [our field guide to that whole world](/sharing-world)). The main difference: in gifting and swap groups, stuff changes hands *permanently*. StuffLibrary is about *lending and returning* — a persistent pool of shared things that stays in the neighborhood, gets used dozens of times, and belongs to the same people it always did. Overlapping spirit, different verb.',
        published: true,
      },
      {
        question: 'How is this different from Nextdoor?',
        answer:
          "Nextdoor is social-first: conversations, recommendations, occasionally arguments about fireworks. StuffLibrary is stuff-first. There's no feed to win, no comments section — just a catalog of things, checkout cards, and quiet reciprocity. We think stuff is a better icebreaker than opinions.",
        published: true,
      },
      {
        question: 'Why "library"? Where\'d the name come from?',
        answer:
          "It's a library for stuff. That's it, that's the name. But the choice of *library* is doing real work: the public library is the best idea civilization has had about sharing — a commons with rules gentle enough to feel like trust and firm enough to work. We borrowed the whole aesthetic on purpose — cards, stamps, due dates — as a reminder that this isn't a marketplace. It's a library where the books are ladders.",
        published: true,
      },
    ],
  },
  {
    title: 'Borrowing & lending',
    entries: [
      {
        question: 'Do I have to lend things to borrow things?',
        answer:
          'No hard rule. But joining a library is a visible, reciprocal act — your member card quietly shows what you share. Most people find that after a borrow or two, they start eyeing their own garage differently.',
        published: true,
      },
      {
        question: 'Can I control who borrows my stuff?',
        answer:
          'Yes. You decide what to share, and you set the bar per item — a one-tap request might be fine for a $15 hand tool, while your $400 camera can require a video handshake and established trust. You can always decline a request. Lending should never feel like exposure.',
        published: true,
      },
      // Merged from the retired Features & FAQ page, rewritten and
      // fact-checked July 2026 (the old page's other twelve questions were
      // already covered — usually better — by the answers above and below).
      {
        question: 'What kinds of things can I share?',
        answer:
          "Almost anything with a handle, a plug, or a box: tools, ladders, kitchen gear, camping equipment, board games, puzzles, garden stuff. The platform automatically screens out what doesn't belong on a neighborhood shelf — weapons, alcohol, tobacco, and anything unsafe or age-restricted — so you don't have to memorize a rulebook.",
        published: true,
      },
      {
        question: 'Can I charge for lending my stuff?',
        answer:
          "No — and that's on purpose. StuffLibrary is a library, not a rental marketplace; no money changes hands here, in either direction. If you want to rent things out commercially, other platforms do that. Here, the return on lending is a neighborhood where you can borrow too.",
        published: true,
      },
      {
        question: 'How do pickup and return actually happen?',
        answer:
          "You two work it out directly, like neighbors do. When an owner approves a request, their reply includes pickup details — most handoffs are a porch pickup or a doorstep exchange. Returns work the same way, with the app keeping the record (who has what, when it's due) while you keep it human.",
        published: true,
      },
      {
        question: 'How long can I borrow something?',
        answer:
          'You propose a return date with your request, and the owner can adjust it when they approve — a ladder might be a weekend, a jigsaw puzzle might be a month. The due date goes on the checkout card for both of you, and if you need longer, ask; owners are neighbors, not late-fee machines.',
        published: true,
      },
      {
        question: "What if nobody's shared the thing I need?",
        answer:
          'Say so! Use the feedback button (bottom-right corner, on every page) and tell us what you were hoping to find — it helps your library learn what\'s worth putting on the shelves. And mention it to your neighbors: "does anyone have a tile cutter?" is exactly the conversation this whole thing exists to start.',
        published: true,
      },
      {
        question:
          "What happens if something comes back broken — or doesn't come back?",
        answer:
          "It happens; we designed for it instead of pretending otherwise. Items get condition photos at checkout and check-in, so there's a shared record instead of a memory contest. Outcomes are logged plainly (returned clean / returned with damage / lost), there's a lightweight dispute record if the two of you see it differently, and consequences flow through reputation — a dent in the borrower's trust score — rather than through money. And lenders always have the simplest protection: don't lend your most precious things to people who haven't earned trust yet.",
        published: true,
      },
      {
        question:
          "What's a trust score? Is one mistake going to haunt me forever?",
        answer:
          "Your library card carries a quiet record of care: borrows, returns, on-time stamps. Good history accumulates slowly; slip-ups count against you more sharply but *fade with time* — a late return fades in weeks, and even losing an item fades after about a year of good behavior. Trust here is hard to earn, easy to dent, and always possible to repair. There's no public shaming, no star ratings, no leaderboard.",
        published: true,
      },
      {
        question: 'Why does borrowing involve a selfie video?',
        answer:
          "For items where the owner wants it, a borrow request includes a short video — a hello, not a hoop. It turns an app notification into a human asking a neighbor for a ladder, which is what's actually happening. It's also a gentle accountability signal: real faces borrow more carefully than usernames do. Videos are visible only within your library, never public.",
        published: true,
      },
      {
        question: 'What if someone gets hurt using something they borrowed?',
        answer:
          "The honest answer: StuffLibrary facilitates the lending and borrowing between neighbors that we all want more of — and when neighbors lend to each other, the same real-world common sense and rules apply that applied before we existed. We don't inspect items, and we don't vouch for the safety of anything in a library. Lenders share things they believe are in good working order; borrowers use their own judgment, like you would with anything handed over a fence. If you're curious what the actual rules are where you live (a fair question — most of us don't know!), we're working on collecting pointers to good reference material.",
        published: false,
        holdReason:
          'Attorney review required before shipping (docs/content/faq.md editorial notes, July 2026).',
      },
    ],
  },
  {
    title: 'Trust & privacy',
    entries: [
      {
        question: 'Why do you verify my address?',
        answer:
          'Because "neighborhood library" only means something if everyone in it is actually a neighbor. Address verification (GPS match, license OCR, or a mailed postcard with a code) is how the boundary of the commons stays real. Verification is tiered — you can browse after a minimal signup, and the heavier checks only kick in before your first borrow.',
        published: true,
      },
      {
        question: 'Who can see my profile, my items, my photos?',
        answer:
          'Members of your library. Nothing is public or indexed — no search engine sees your garage. Identity data, photos, and videos stay within the library you share them with.',
        published: true,
      },
      {
        question: 'Is my data sold? Are there ads?',
        answer:
          'No, and no — not now, not ever. StuffLibrary exists to be a non-commercial space: no ads, no data brokerage, and the platform itself is never for sale. If it ever gets big enough that running it costs real money, the answer will be community funding — neighbors chipping in like Friends of the Library — not monetization.',
        published: true,
      },
      {
        question: 'Is there an age requirement?',
        answer:
          "We don't have an enforceable age gate, so we don't pretend to have one. What we do instead: the platform automatically screens out categories that minors can't legally borrow — firearms, alcohol, tobacco — so the shelves stay appropriate for everyone in the household.",
        published: true,
      },
    ],
  },
  {
    title: 'The project',
    entries: [
      {
        question: "What's with the watercolors?",
        answer:
          "Three reasons, in increasing order of importance. They're pretty. They make the whole thing more fun to use. And — the real reason — they *normalize everyone's stuff*. A watercolor of your torque wrench shares the torque wrench without sharing your messy garage; nobody's private space leaks into public view, and nobody's browsing the catalog judging photography or backdrops. It also deliberately fuzzes condition — the illustration is not documentation, so nobody's arguing from a photo about a scratch. The condition record happens properly, at checkout and check-in. The watercolor just says: here's all our stuff.",
        published: true,
      },
      {
        question: "Who's behind this? Is it a company?",
        answer:
          "It's not a company. StuffLibrary is an open-source civic project built by Marc Cull — a neighbor in Berkeley who wanted this to exist for his own neighborhood, and figured other neighborhoods might want it too. (Day jobs, for the trust-but-verify crowd: CTO of FreeWorld, a nonprofit helping justice-impacted Americans launch living-wage trucking careers, and principal of Next Horizon Collective, a design/build agency helping nonprofits do more with thoughtful, ethical tech.) The code is AGPL-licensed and the long-term plan is for the project to be community-governed and community-funded — see the rest of this FAQ.",
        published: true,
      },
      {
        question: 'Is StuffLibrary open source?',
        answer:
          'Yes — the whole platform, under AGPLv3. That license means anyone can inspect, run, or improve the code, and nobody — including a company, including us — can take it private, wrap it in ads, and sell it back to you. The code is part of the commons too. (Longer version: see "Why We Chose AGPLv3" in the repo.)',
        published: true,
      },
      {
        question: 'Is there an app?',
        answer:
          'StuffLibrary is a web app that installs to your phone like a native one (a PWA) — no app store required. A store-bought native app may come later if the web version ever falls short where it counts.',
        published: true,
      },
      {
        question: 'How do I bring StuffLibrary to my neighborhood?',
        answer:
          "Just start. The beta is live everywhere — sign up, start your neighborhood's library, add a few things from your own garage, and invite the neighbors you know (postcard invites exist for the ones you don't). It's beta software built by a small team of approximately one, so expect rough edges and tell us about them — early libraries are shaping what this becomes.",
        published: true,
      },
      {
        question: 'Why would this work? People are flaky.',
        answer:
          "Fair question — and we didn't answer it with optimism. The platform is deliberately built around Elinor Ostrom's Nobel-winning research on what makes real-world commons endure: clear membership, local rules, visible checkouts, gentle graduated consequences, and quick low-drama dispute handling. Communities have run shared resources this way for centuries. We just wrote it into software. *(Full story: see [The Tragedy of the Commons Is Optional](/why-this-works).)*",
        published: true,
      },
    ],
  },
];

/** Only what actually ships — the page and its JSON-LD both use this. */
export function publishedFaq(): FaqCategory[] {
  return FAQ_CATEGORIES.map((c) => ({
    title: c.title,
    entries: c.entries.filter((e) => e.published),
  })).filter((c) => c.entries.length > 0);
}

/** Markdown → plain text for FAQPage JSON-LD answers. */
export function faqPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]/g, '')
    .trim();
}
