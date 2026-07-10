import type { Metadata } from 'next';

import { CivicMarkdown } from '@/components/civic/CivicMarkdown';
import { CivicPage } from '@/components/civic/CivicPage';
import { readCivicContent } from '@/lib/civic-content';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'A Field Guide to the Sharing World — StuffLibrary',
  description:
    'Buy Nothing, Freecycle, repair cafés, timebanks, toy libraries — a July 2026 field guide to the neighborhood-sharing ecosystem, with how to find your local branch of each.',
};

export default function SharingWorldPage() {
  const content = readCivicContent('sharing-world');
  return (
    <CivicPage kicker="OUR COUSINS" title="A Field Guide to the Sharing World">
      <CivicMarkdown content={content} />
    </CivicPage>
  );
}
