import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - StuffLibrary',
  description:
    'Terms of Service for StuffLibrary - A civic utility for community resource sharing',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
