import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - StuffLibrary',
  description:
    'Cookie Policy for StuffLibrary - Essential cookies for sign-in, cookieless analytics, no cross-context advertising',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
