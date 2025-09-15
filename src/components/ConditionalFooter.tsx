'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show footer on auth pages
  const isAuthPage = pathname.startsWith('/auth/');

  if (isAuthPage) {
    return null;
  }

  // Pass the logged-in state to Footer
  return <Footer isLoggedIn={!!session?.user} />;
}
