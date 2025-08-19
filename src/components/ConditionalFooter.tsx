'use client';

import { usePathname } from 'next/navigation';

import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();

  // Don't show footer on auth pages
  const isAuthPage = pathname.startsWith('/auth/');

  if (isAuthPage) {
    return null;
  }

  return <Footer />;
}
