import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The page component is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: 'About',
  description:
    "StuffLibrary is an open-source civic project by Marc Cull, a neighbor in Berkeley — a neighborhood lending library for the things we all own and rarely use. Here's why it exists.",
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
