import type { Metadata } from 'next';

import { CivicMarkdown } from '@/components/civic/CivicMarkdown';
import { CivicPage } from '@/components/civic/CivicPage';
import { readCivicContent } from '@/lib/civic-content';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Further Reading: The Tradition We Borrow From — StuffLibrary',
  description:
    'An annotated bibliography of the commons, mutual aid, gift economies, and neighborhood sharing — the landmark books behind the lending-library idea, from Ostrom to Kimmerer.',
};

export default function FurtherReadingPage() {
  const content = readCivicContent('further-reading');
  return (
    <CivicPage
      kicker="FROM THE REFERENCE DESK"
      title="Further Reading: The Tradition We Borrow From"
    >
      <CivicMarkdown content={content} />
    </CivicPage>
  );
}
