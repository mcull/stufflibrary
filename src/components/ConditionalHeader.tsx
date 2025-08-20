'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { AuthenticatedHeader } from './AuthenticatedHeader';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show header on auth pages
  const isAuthPage = pathname.startsWith('/auth/');

  if (isAuthPage) {
    return null;
  }

  // Show authenticated header for logged in users
  if (session?.user) {
    return <AuthenticatedHeader />;
  }

  // Show marketing header for logged out users
  return <Header />;
}
