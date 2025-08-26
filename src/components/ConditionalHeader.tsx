'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { AuthenticatedHeader } from './AuthenticatedHeader';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't show header on auth pages or profile creation
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');

  if (isAuthPage || isProfileCreation) {
    return null;
  }

  // Don't render anything while loading to prevent flash
  if (status === 'loading') {
    return null;
  }

  // Show authenticated header for logged in users
  if (session?.user) {
    return <AuthenticatedHeader />;
  }

  // Show marketing header for logged out users
  return <Header />;
}
