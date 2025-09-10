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
        pb: needsBottomPadding ? { xs: 8, md: 0 } : 0, // 64px bottom padding on mobile for bottom nav
        minHeight: needsBottomPadding ? 'calc(100vh - 64px)' : '100vh', // Adjust for mobile bottom nav
      }}
    >
      {children}
    </Box>
  );
}
