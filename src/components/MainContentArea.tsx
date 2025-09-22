'use client';

import { Box } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface MainContentAreaProps {
  children: ReactNode;
}

export function MainContentArea({ children }: MainContentAreaProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't add bottom padding on auth pages or profile creation
  const isAuthPage = pathname.startsWith('/auth/');
  const isProfileCreation = pathname.startsWith('/profile/create');
  const isUnauthenticated = !session?.user;

  // Add bottom padding for authenticated users on mobile to account for bottom navigation
  const needsBottomPadding =
    !isAuthPage && !isProfileCreation && !isUnauthenticated;

  return (
    <Box
      sx={{
        // Space for bottom nav on mobile + iOS safe area
        pb: needsBottomPadding
          ? { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 }
          : 0,
        // Remove enforced viewport minHeight to allow full-page scrolling
      }}
    >
      {children}
    </Box>
  );
}
