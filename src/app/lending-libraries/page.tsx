import type { Metadata } from 'next';

import { readCivicContent } from '@/lib/civic-content';
import { LENDING_DIRECTORY as directory } from '@/lib/lending-libraries';

import { DirectoryContent } from './DirectoryContent';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title:
    'Tool Libraries and Libraries of Things, State by State — a July 2026 Directory',
  description:
    'A verified July 2026 directory of tool libraries, Libraries of Things, toy libraries, and gear libraries across all 50 states and DC — real places where you can borrow instead of buy.',
};

export default function LendingLibrariesPage() {
  const intro = readCivicContent('lending-libraries-intro');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Lending Libraries of Things: A State-by-State Directory (July 2026)',
    numberOfItems: directory.states.reduce((n, s) => n + s.entries.length, 0),
    itemListElement: directory.states.flatMap((state) =>
      state.entries.map((entry) => ({
        '@type': 'ListItem',
        name: entry.name,
        ...(entry.url ? { url: entry.url } : {}),
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DirectoryContent intro={intro} states={directory.states} />
    </>
  );
}
