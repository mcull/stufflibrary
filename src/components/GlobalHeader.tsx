'use client';

import {
  ArrowBack as ArrowBackIcon,
  AddAPhotoTwoTone as AddIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  IconButton,
  Typography,
  Avatar,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useProfileDraftCleanup } from '@/hooks/useProfileDraftCleanup';
import { brandColors } from '@/theme/brandTokens';

import { NotificationBell } from './notifications/NotificationBell';
import { Wordmark } from './Wordmark';

interface GlobalHeaderProps {
  title?: string | undefined;
  showBackButton?: boolean | undefined;
  backUrl?: string | undefined;
}

export function GlobalHeader({
  title,
  showBackButton = false,
  backUrl,
}: GlobalHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
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

  const handleBackClick = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

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
            minHeight: { xs: 56, md: 64 },
            justifyContent: 'space-between',
            py: 1,
            gap: 2,
          }}
        >
          {/* Left Section - Logo or Back Button + Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: '0 0 auto',
            }}
          >
            {showBackButton && (
              <IconButton
                onClick={handleBackClick}
                sx={{
                  color: brandColors.charcoal,
                  p: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(30, 58, 95, 0.08)',
                  },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}

            <Box sx={{ transform: 'rotate(-1.2deg)' }}>
              <Link href="/lobby" style={{ textDecoration: 'none' }}>
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                  <Wordmark size="small" color="primary" />
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Wordmark size="medium" color="primary" />
                </Box>
              </Link>
            </Box>
          </Box>

          {/* Center Section - Page Title */}
          <Box
            sx={{
              flex: '1 1 auto',
              display: 'flex',
              justifyContent: 'center',
              minWidth: 0, // Allow shrinking
            }}
          >
            {title && (
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </Typography>
            )}
          </Box>

          {/* Right Section - Add Button, Notifications & User Avatar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: '0 0 auto',
            }}
          >
            {/* Add Stuff Button - Desktop Only */}
            <IconButton
              component={Link}
              href="/add-item"
              sx={{
                backgroundColor: brandColors.mustardYellow,
                color: brandColors.charcoal,
                width: 36,
                height: 36,
                display: { xs: 'none', md: 'flex' }, // Hide on mobile
                '&:hover': {
                  backgroundColor: '#C19E04',
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Avatar - Links to Profile */}
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
                {!userImage &&
                  !session?.user?.image &&
                  session?.user?.name?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
