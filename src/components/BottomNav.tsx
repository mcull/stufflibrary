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
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setNotificationCount(data.count || 0);
          }
        })
        .catch((err) =>
          console.error('Failed to fetch notification count:', err)
        );
    }
  }, [session?.user?.email]);

  const navigationItems: NavigationItem[] = [
    {
      label: '', // No label for Our Stuff
      value: 'lobby',
      icon: (
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
      href: '/lobby',
    },
    {
      label: 'Add Stuff',
      value: 'add-stuff',
      icon: (
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
      label: 'Message Center',
      value: 'notifications',
      icon:
        notificationCount > 0 ? (
          <Badge badgeContent={notificationCount} color="error">
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
    if (pathname.startsWith('/lobby')) return 'lobby';
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
          height: 72, // Taller for better proportion
          '& .MuiBottomNavigationAction-root': {
            color: brandColors.charcoal,
            minWidth: 'auto',
            padding: '8px 12px 8px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Josh W Comeau smooth easing
            position: 'relative',
            overflow: 'visible',

            // Selected state with hand-drawn highlight
            '&.Mui-selected': {
              color: brandColors.inkBlue,
              '& .MuiBottomNavigationAction-icon': {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-12px',
                  left: '-12px',
                  right: '-12px',
                  bottom: '-12px',
                  backgroundImage: 'url(/highlight2.png)', // Yellow highlight stroke
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  opacity: 0.7,
                  transform: 'rotate(-2deg)', // Hand-drawn feel
                  zIndex: -1,
                  animation:
                    'highlightFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                },
                '& img': {
                  filter: `brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(197deg) brightness(93%) contrast(88%) !important`, // Ink blue
                  transform: 'translateY(-1px)', // Subtle lift
                },
              },
            },

            // Hover effects with personality
            '&:hover:not(.Mui-selected)': {
              '& .MuiBottomNavigationAction-icon': {
                transform: 'translateY(-2px) scale(1.05)',
                '& img': {
                  filter: 'brightness(0) saturate(100%) opacity(0.8)',
                },
              },
            },

            // Center "Add Stuff" button - SPECIAL STYLING
            '&[value="add-stuff"]': {
              position: 'relative',
              '& .MuiBottomNavigationAction-icon': {
                width: '68px', // Much bigger!
                height: '68px',
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: brandColors.mustardYellow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
                boxShadow:
                  '0 4px 12px rgba(227, 181, 5, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy easing
                border: `3px solid ${brandColors.white}`,

                '& img': {
                  width: '36px !important', // Bigger icon inside
                  height: '36px !important',
                  filter: 'brightness(0) saturate(100%) !important', // Pure black for contrast
                },
              },
              '& .MuiBottomNavigationAction-label': {
                color: brandColors.charcoal,
                fontWeight: 600,
                fontSize: '0.7rem',
                marginTop: '2px',
              },
              '&.Mui-selected .MuiBottomNavigationAction-icon': {
                backgroundColor: brandColors.mustardYellow,
                transform: 'translateY(-3px) scale(1.05)',
                boxShadow:
                  '0 6px 20px rgba(227, 181, 5, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)',
                '&::before': {
                  backgroundImage: 'url(/highlight3.png)', // Different highlight for center
                  transform: 'rotate(1deg) scale(1.2)',
                  opacity: 0.8,
                  top: '-16px',
                  left: '-16px',
                  right: '-16px',
                  bottom: '-16px',
                },
              },
              '&:hover .MuiBottomNavigationAction-icon': {
                backgroundColor: '#C19E04', // Darker yellow on hover
                transform: 'translateY(-4px) scale(1.08)',
                boxShadow:
                  '0 8px 25px rgba(227, 181, 5, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2)',
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

          // Highlight animation keyframes
          '@keyframes highlightFadeIn': {
            '0%': {
              opacity: 0,
              transform: 'rotate(-2deg) scale(0.8)',
            },
            '100%': {
              opacity: 0.7,
              transform: 'rotate(-2deg) scale(1)',
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
