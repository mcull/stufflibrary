'use client';

import {
  MarkEmailReadOutlined,
  AccessTimeOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  ReplyOutlined,
  InventoryOutlined,
  AnnouncementOutlined,
  GroupAddOutlined,
} from '@mui/icons-material';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationListProps {
  onUpdate?: () => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
  showHeader?: boolean;
  limit?: number;
}

const notificationIcons: Record<string, React.ReactNode> = {
  BORROW_REQUEST_RECEIVED: <ReplyOutlined color="primary" />,
  BORROW_REQUEST_APPROVED: <CheckCircleOutlined color="success" />,
  BORROW_REQUEST_DECLINED: <CancelOutlined color="error" />,
  BORROW_REQUEST_CANCELLED: <CancelOutlined color="warning" />,
  ITEM_DUE_TOMORROW: <AccessTimeOutlined color="warning" />,
  ITEM_OVERDUE: <AccessTimeOutlined color="error" />,
  ITEM_RETURNED: <InventoryOutlined color="success" />,
  RETURN_CONFIRMED: <CheckCircleOutlined color="success" />,
  LIBRARY_INVITATION: <GroupAddOutlined color="info" />,
  SYSTEM_ANNOUNCEMENT: <AnnouncementOutlined color="info" />,
};

const notificationColors: Record<string, string> = {
  BORROW_REQUEST_RECEIVED: '#e3f2fd',
  BORROW_REQUEST_APPROVED: '#e8f5e8',
  BORROW_REQUEST_DECLINED: '#ffebee',
  BORROW_REQUEST_CANCELLED: '#fff3e0',
  ITEM_DUE_TOMORROW: '#fff3e0',
  ITEM_OVERDUE: '#ffebee',
  ITEM_RETURNED: '#e8f5e8',
  RETURN_CONFIRMED: '#e8f5e8',
  LIBRARY_INVITATION: '#e3f2fd',
  SYSTEM_ANNOUNCEMENT: '#f3e5f5',
};

export function NotificationList({
  onUpdate,
  isLoading = false,
  setIsLoading,
  showHeader = false,
  limit = 20,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setHasMore(data.hasMore || false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load notifications'
      );
    } finally {
      setLoading(false);
    }
  }, [limit, onUpdate]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, limit]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading?.(true);
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsLoading?.(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Box>
      {showHeader && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">
            Notifications
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllAsRead}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <MarkEmailReadOutlined />
                )
              }
            >
              Mark all read
            </Button>
          )}
        </Box>
      )}

      {!showHeader && unreadCount > 0 && (
        <Box sx={{ p: 2, pt: 0 }}>
          <Button
            size="small"
            onClick={markAllAsRead}
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={16} />
              ) : (
                <MarkEmailReadOutlined />
              )
            }
            fullWidth
            variant="text"
          >
            Mark all as read ({unreadCount})
          </Button>
        </Box>
      )}

      {notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No notifications yet</Typography>
        </Box>
      ) : (
        <List sx={{ pt: 0 }}>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              <ListItem
                sx={{
                  cursor: notification.actionUrl ? 'pointer' : 'default',
                  backgroundColor: notification.isRead
                    ? 'transparent'
                    : notificationColors[notification.type] || '#f5f5f5',
                  '&:hover': {
                    backgroundColor: notification.actionUrl
                      ? 'rgba(0, 0, 0, 0.04)'
                      : 'transparent',
                  },
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent' }}>
                    {notificationIcons[notification.type] || (
                      <AnnouncementOutlined />
                    )}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notification.isRead ? 'normal' : 'bold',
                          flexGrow: 1,
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.isRead && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box component="div">
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        component="div"
                        sx={{ mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        component="div"
                      >
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < notifications.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}

      {hasMore && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/notifications"
            size="small"
            variant="text"
          >
            View all notifications
          </Button>
        </Box>
      )}
    </Box>
  );
}
