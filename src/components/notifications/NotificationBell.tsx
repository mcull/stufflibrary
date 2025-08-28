'use client';

import { useState, useEffect } from 'react';
import { NotificationsOutlined } from '@mui/icons-material';
import { IconButton, Badge, Popover, Typography, Box } from '@mui/material';
import { useSession } from 'next-auth/react';

import { NotificationList } from './NotificationList';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread count
  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/count');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationUpdate = () => {
    // Refresh unread count when notifications are updated
    if (session?.user) {
      fetch('/api/notifications/count')
        .then(response => response.json())
        .then(data => setUnreadCount(data.count || 0))
        .catch(console.error);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        {...(className && { className })}
        color="inherit"
        size="large"
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          max={99}
          overlap="circular"
        >
          <NotificationsOutlined />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: '90vw',
            maxHeight: 500,
            mt: 1,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="h2">
            Notifications
          </Typography>
        </Box>
        
        <NotificationList
          onUpdate={handleNotificationUpdate}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </Popover>
    </>
  );
}