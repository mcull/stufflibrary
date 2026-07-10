import type { Metadata } from 'next';

import { faqPlainText, publishedFaq } from '@/data/faq';

import { FaqContent } from './FaqContent';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FAQ — StuffLibrary',
  description:
    'What StuffLibrary is, how borrowing and lending work, what happens when things break, and why a neighborhood lending library works at all. Plain answers, no fine print.',
};

export default function FaqPage() {
  const categories = publishedFaq();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: categories.flatMap((c) =>
      c.entries.map((e) => ({
        '@type': 'Question',
        name: e.question,
        acceptedAnswer: { '@type': 'Answer', text: faqPlainText(e.answer) },
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqContent categories={categories} />
    </>
  );
}
