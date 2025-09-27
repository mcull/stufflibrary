'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense } from 'react';

import { BottomNav } from './BottomNav';
import { GlobalHeader } from './GlobalHeader';
import { Header } from './Header';

interface ConditionalNavigationProps {
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

function NavigationContent({
  title,
  showBackButton = false,
  backUrl,
}: ConditionalNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Don't show navigation on auth pages or profile creation
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');

  // Don't show navigation for guest users on collection pages
  const isCollectionPage = pathname.startsWith('/collection/');
  const isGuest = searchParams.get('guest') === '1';

  if (isAuthPage || isProfileCreation || (isCollectionPage && isGuest)) {
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

export function ConditionalNavigation(props: ConditionalNavigationProps) {
  return (
    <Suspense fallback={null}>
      <NavigationContent {...props} />
    </Suspense>
  );
}
