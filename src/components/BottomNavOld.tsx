'use client';

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
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
        <img
          src="/library.png"
          alt="Our Stuff"
          style={{ width: '24px', height: '24px' }}
        />
      ),
      href: '/stacks',
    },
    {
      label: 'Add Stuff',
      value: 'add-stuff',
      icon: (
        <img
          src="/add.png"
          alt="Add Stuff"
          style={{ width: '24px', height: '24px' }}
        />
      ),
      href: '/add-item',
    },
    {
      label: 'Message Center',
      value: 'notifications',
      icon:
        notificationCount > 0 ? (
          <Badge badgeContent={notificationCount} color="error">
            <img
              src="/chitchat.png"
              alt="Message Center"
              style={{ width: '24px', height: '24px' }}
            />
          </Badge>
        ) : (
          <img
            src="/chitchat.png"
            alt="Message Center"
            style={{ width: '24px', height: '24px' }}
          />
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
            padding: '6px 12px 8px',
            '&.Mui-selected': {
              color: brandColors.inkBlue,
            },
            // Style for the center "Add Stuff" button
            '&[value="add-stuff"]': {
              position: 'relative',
              '& .MuiBottomNavigationAction-icon': {
                width: '56px',
                height: '56px',
                padding: '16px',
                borderRadius: '50%',
                backgroundColor: brandColors.inkBlue,
                color: brandColors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px', // Lift it up slightly
                '& img': {
                  width: '24px !important',
                  height: '24px !important',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                color: brandColors.inkBlue,
                fontWeight: 600,
                fontSize: '0.75rem',
              },
              '&.Mui-selected .MuiBottomNavigationAction-icon': {
                backgroundColor: brandColors.inkBlue,
                boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)',
              },
              '&:hover .MuiBottomNavigationAction-icon': {
                backgroundColor: '#152B47',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(30, 58, 95, 0.4)',
              },
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'var(--font-inter)',
            '&.Mui-selected': {
              fontSize: '0.75rem',
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
