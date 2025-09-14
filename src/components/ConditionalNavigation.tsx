'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { BottomNav } from './BottomNav';
import { GlobalHeader } from './GlobalHeader';
import { Header } from './Header';

interface ConditionalNavigationProps {
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

export function ConditionalNavigation({
  title,
  showBackButton = false,
  backUrl,
}: ConditionalNavigationProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't show navigation on auth pages or profile creation
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');

  if (isAuthPage || isProfileCreation) {
    return null;
  }

  // Don't render anything while loading to prevent flash
  if (status === 'loading') {
    return null;
  }

  // Show unified navigation for authenticated users
  if (session?.user) {
    return (
      <>
        <GlobalHeader
          title={title || undefined}
          showBackButton={showBackButton}
          backUrl={backUrl || undefined}
        />
        <BottomNav />
      </>
    );
  }

  // Show marketing header for unauthenticated users
  return <Header />;
}
