'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show the marketing footer on focused flows (auth + onboarding).
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');

  if (isAuthPage || isProfileCreation) {
    return null;
  }

  // Pass the logged-in state to Footer
  return <Footer isLoggedIn={!!session?.user} />;
}
