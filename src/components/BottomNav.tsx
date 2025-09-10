'use client';

import {
  Home as HomeIcon,
  Inventory as InventoryIcon,
  RequestPage as RequestPageIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
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
      label: 'Lobby',
      value: 'lobby',
      icon: <HomeIcon />,
      href: '/lobby',
    },
    {
      label: 'Inventory',
      value: 'inventory',
      icon: <InventoryIcon />,
      href: '/inventory',
    },
    {
      label: 'Requests',
      value: 'requests',
      icon: <RequestPageIcon />,
      href: '/requests',
    },
    {
      label: 'Notifications',
      value: 'notifications',
      icon:
        notificationCount > 0 ? (
          <Badge badgeContent={notificationCount} color="error">
            <NotificationsIcon />
          </Badge>
        ) : (
          <NotificationsIcon />
        ),
      href: '/notifications',
    },
    {
      label: 'Profile',
      value: 'profile',
      icon: <PersonIcon />,
      href: '/profile',
    },
  ];

  // Determine current value based on pathname
  const getCurrentValue = () => {
    if (pathname.startsWith('/lobby')) return 'lobby';
    if (pathname.startsWith('/inventory')) return 'inventory';
    if (pathname.startsWith('/requests')) return 'requests';
    if (pathname.startsWith('/notifications')) return 'notifications';
    if (pathname.startsWith('/profile')) return 'profile';
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
