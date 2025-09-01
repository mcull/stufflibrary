import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - StuffLibrary',
  description:
    'Privacy Policy for StuffLibrary - Understanding data collection, protection, and privacy limitations in community resource sharing',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
