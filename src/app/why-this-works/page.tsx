import type { Metadata } from 'next';

import { CivicMarkdown } from '@/components/civic/CivicMarkdown';
import { CivicPage } from '@/components/civic/CivicPage';
import { readCivicContent } from '@/lib/civic-content';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'The Tragedy of the Commons Is Optional — StuffLibrary',
  description:
    "Why we trust neighbors (it's not optimism): Elinor Ostrom's Nobel-winning research on commons that endure, and how her eight design principles became StuffLibrary's architecture.",
};

export default function WhyThisWorksPage() {
  const content = readCivicContent('why-this-works');
  return (
    <CivicPage
      kicker="WHY THIS WORKS"
      title="The Tragedy of the Commons Is Optional"
    >
      <CivicMarkdown content={content} />
    </CivicPage>
  );
}
