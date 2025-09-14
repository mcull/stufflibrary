'use client';

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  Box,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface NavigationItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  showBadge?: boolean;
  badgeCount?: number;
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch notification count for badge
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/notifications/unread-count')
        .then((res) => {
          if (!res.ok) {
            // API doesn't exist yet, silently fail
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success) {
            setNotificationCount(data.count || 0);
          }
        })
        .catch(() => {
          // Silently fail - API not implemented yet
          setNotificationCount(0);
        });
    }
  }, [session?.user?.email]);

  const navigationItems: NavigationItem[] = [
    {
      label: '', // No label
      value: 'lobby',
      icon: (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
          }}
        >
          <img
            src="/noun-hall-1689482-FF6347.svg"
            alt="Our Stuff"
            style={{
              width: '32px',
              height: '32px',
              filter: 'brightness(0) saturate(100%)',
            }}
          />
        </Box>
      ),
      href: '/stacks',
    },
    {
      label: '', // No label
      value: 'add-stuff',
      icon: (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
          }}
        >
          <img
            src="/noun-add-7046174-FF6347.svg"
            alt="Add Stuff"
            style={{
              width: '36px',
              height: '36px',
              filter: 'brightness(0) saturate(100%)',
            }}
          />
        </Box>
      ),
      href: '/add-item',
    },
    {
      label: '', // No label
      value: 'notifications',
      icon:
        notificationCount > 0 ? (
          <Badge badgeContent={notificationCount} color="error">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
            >
              <img
                src="/noun-messages-1016108-FF6347.svg"
                alt="Message Center"
                style={{
                  width: '32px',
                  height: '32px',
                  filter: 'brightness(0) saturate(100%)',
                }}
              />
            </Box>
          </Badge>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
            }}
          >
            <img
              src="/noun-messages-1016108-FF6347.svg"
              alt="Message Center"
              style={{
                width: '32px',
                height: '32px',
                filter: 'brightness(0) saturate(100%)',
              }}
            />
          </Box>
        ),
      href: '/notifications',
    },
  ];

  // Determine current value based on pathname
  const getCurrentValue = () => {
    if (pathname.startsWith('/stacks')) return 'lobby';
    if (pathname.startsWith('/add-item')) return 'add-stuff';
    if (pathname.startsWith('/notifications')) return 'notifications';
    return 'lobby'; // Default fallback
  };

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    const item = navigationItems.find((item) => item.value === newValue);
    if (item) {
      router.push(item.href);
    }
  };

  // Only show on authenticated pages and mobile screens
  if (!session?.user) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: { xs: 'block', md: 'none' }, // Only show on mobile
        borderTop: `1px solid ${brandColors.softGray}`,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        sx={{
          backgroundColor: brandColors.white,
          height: 64,
          '& .MuiBottomNavigationAction-root': {
            color: brandColors.charcoal,
            minWidth: 'auto',
            padding: '12px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1, // Equal distribution

            // Selected state with SVG color change
            '&.Mui-selected': {
              color: brandColors.inkBlue,
              '& .MuiBottomNavigationAction-icon': {
                '& img': {
                  filter: `brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(197deg) brightness(93%) contrast(88%) !important`, // Ink blue
                },
              },
            },

            // Center "Add Stuff" button - SPECIAL STYLING
            '&[value="add-stuff"]': {
              '& .MuiBottomNavigationAction-icon': {
                width: '52px',
                height: '52px',
                padding: '8px',
                borderRadius: '50%',
                backgroundColor: brandColors.mustardYellow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  '0 2px 8px rgba(227, 181, 5, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1)',
                border: `2px solid ${brandColors.white}`,

                '& img': {
                  width: '28px !important',
                  height: '28px !important',
                  filter: 'brightness(0) saturate(100%) !important',
                },
              },
              '&.Mui-selected .MuiBottomNavigationAction-icon': {
                backgroundColor: brandColors.mustardYellow,
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            fontWeight: 500,
            fontFamily: 'var(--font-inter)',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              fontSize: '0.7rem',
              fontWeight: 600,
            },
          },
        }}
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
