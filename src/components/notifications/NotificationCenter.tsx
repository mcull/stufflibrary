'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { NotificationList } from './NotificationList';

type TabValue = 'all' | 'unread' | 'borrow' | 'library';

const tabLabels: Record<TabValue, string> = {
  all: 'All',
  unread: 'Unread',
  borrow: 'Borrowing',
  library: 'Libraries',
};

const tabTypes: Record<TabValue, string[] | undefined> = {
  all: undefined,
  unread: undefined, // Special case handled in component
  borrow: [
    'BORROW_REQUEST_RECEIVED',
    'BORROW_REQUEST_APPROVED', 
    'BORROW_REQUEST_DECLINED',
    'BORROW_REQUEST_CANCELLED',
    'ITEM_DUE_TOMORROW',
    'ITEM_OVERDUE',
    'ITEM_RETURNED',
    'RETURN_CONFIRMED',
  ],
  library: [
    'LIBRARY_INVITATION',
    'SYSTEM_ANNOUNCEMENT',
  ],
};

export function NotificationCenter() {
  const [tabValue, setTabValue] = useState<TabValue>('all');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setTabValue(newValue);
  };

  const handleUpdate = () => {
    // Force refresh of notification list
    window.location.reload();
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!session?.user) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
          variant="text"
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Notifications
        </Typography>
        
        <Typography variant="body1" color="textSecondary">
          Stay updated on your borrowing activity and library updates
        </Typography>
      </Box>

      {/* Main Content */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="notification tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {Object.entries(tabLabels).map(([value, label]) => (
              <Tab
                key={value}
                label={label}
                value={value}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Notification List */}
        <Box sx={{ minHeight: 400 }}>
          <NotificationList
            key={`${tabValue}-${isLoading}`} // Force re-render on tab change
            showHeader={false}
            limit={50}
            onUpdate={handleUpdate}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </Box>
      </Paper>

      {/* Help Text */}
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            💡 <strong>Tip:</strong> You'll receive notifications for borrow requests, 
            approvals, return reminders, and library updates. You can also receive 
            email notifications for important updates.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}