'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show the marketing footer on focused flows (auth + onboarding),
  // or under the admin console's own chrome.
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');
  const isAdminConsole = pathname.startsWith('/admin');

  if (isAuthPage || isProfileCreation || isAdminConsole) {
    return null;
  }

  // Member home gets the slim one-liner (#429); everywhere else keeps the
  // full marketing footer.
  return <Footer isLoggedIn={!!session?.user} slim={pathname === '/home'} />;
}
