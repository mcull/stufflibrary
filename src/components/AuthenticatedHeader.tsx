'use client';

import { Person as PersonIcon } from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  IconButton,
  Avatar,
} from '@mui/material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useProfileDraftCleanup } from '@/hooks/useProfileDraftCleanup';
import { brandColors } from '@/theme/brandTokens';

import { NotificationBell } from './notifications/NotificationBell';
import { Wordmark } from './Wordmark';

export function AuthenticatedHeader() {
  const { data: session } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);

  // Clean up profile drafts when user signs out
  useProfileDraftCleanup();

  // Fetch user's current profile image
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user?.image) {
            setUserImage(data.user.image);
          }
        })
        .catch((err) => console.error('Failed to fetch user image:', err));
    }
  }, [session?.user?.email]);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: brandColors.warmCream,
        borderBottom: `1px solid ${brandColors.softGray}`,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 56, md: 64 }, // Smaller than marketing header
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          {/* Wordmark */}
          <Box sx={{ flexGrow: 0, transform: 'rotate(-1.2deg)' }}>
            <Link href="/lobby" style={{ textDecoration: 'none' }}>
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                <Wordmark size="small" color="primary" />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Wordmark size="medium" color="primary" />
              </Box>
            </Link>
          </Box>

          {/* Right Side - Notifications & User Photo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Photo - Links to Profile */}
            <IconButton
              component={Link}
              href="/profile"
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              <Avatar
                src={userImage || session?.user?.image || ''}
                alt={session?.user?.name || 'User'}
                sx={{
                  width: 32,
                  height: 32,
                  border: `2px solid ${brandColors.inkBlue}`,
                }}
              >
                {!userImage && !session?.user?.image && <PersonIcon />}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
