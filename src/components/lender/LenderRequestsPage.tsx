'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  AccessTime,
  CheckCircle,
  Cancel,
  PlayArrow,
  Person,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useSession } from 'next-auth/react';

interface BorrowRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
  requestMessage?: string;
  lenderMessage?: string;
  videoUrl?: string;
  requestedReturnDate: string;
  createdAt: string;
  borrower: {
    id: string;
    name: string;
    image?: string;
  };
  item: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

type TabValue = 'pending' | 'active' | 'completed';

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
  ACTIVE: 'info',
  RETURNED: 'success',
  CANCELLED: 'default',
} as const;

const statusIcons = {
  PENDING: <AccessTime />,
  APPROVED: <CheckCircle />,
  DECLINED: <Cancel />,
  ACTIVE: <PlayArrow />,
  RETURNED: <CheckCircle />,
  CANCELLED: <Cancel />,
};

export function LenderRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<TabValue>('pending');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchRequests();
    }
  }, [status, router]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/borrow-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await response.json();
      // Filter to show only requests received by this user (as lender)
      setRequests(data.receivedRequests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setTabValue(newValue);
  };

  const filterRequestsByTab = (requests: BorrowRequest[], tab: TabValue) => {
    switch (tab) {
      case 'pending':
        return requests.filter(req => req.status === 'PENDING');
      case 'active':
        return requests.filter(req => ['APPROVED', 'ACTIVE'].includes(req.status));
      case 'completed':
        return requests.filter(req => ['DECLINED', 'RETURNED', 'CANCELLED'].includes(req.status));
      default:
        return requests;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const filteredRequests = filterRequestsByTab(requests, tabValue);
  const pendingCount = requests.filter(req => req.status === 'PENDING').length;
  const activeCount = requests.filter(req => ['APPROVED', 'ACTIVE'].includes(req.status)).length;
  const completedCount = requests.filter(req => ['DECLINED', 'RETURNED', 'CANCELLED'].includes(req.status)).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Lending Requests
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Review and respond to borrowing requests for your items
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="request tabs">
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="error" max={99}>
                <Box sx={{ px: 1 }}>Pending</Box>
              </Badge>
            }
            value="pending"
          />
          <Tab
            label={
              <Badge badgeContent={activeCount} color="info" max={99}>
                <Box sx={{ px: 1 }}>Active</Box>
              </Badge>
            }
            value="active"
          />
          <Tab
            label={
              <Badge badgeContent={completedCount} color="default" max={99}>
                <Box sx={{ px: 1 }}>Completed</Box>
              </Badge>
            }
            value="completed"
          />
        </Tabs>
      </Box>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {tabValue === 'pending' && 'No pending requests'}
            {tabValue === 'active' && 'No active borrowing'}
            {tabValue === 'completed' && 'No completed requests'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {tabValue === 'pending' && 'New borrowing requests will appear here'}
            {tabValue === 'active' && 'Approved and active borrowing will appear here'}
            {tabValue === 'completed' && 'Completed requests will appear here'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {filteredRequests.map((request) => (
            <Box key={request.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                {/* Item Image */}
                {request.item.imageUrl && (
                  <Box
                    component="img"
                    src={request.item.imageUrl}
                    alt={request.item.name}
                    sx={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Status Chip */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={statusIcons[request.status]}
                      label={request.status}
                      color={statusColors[request.status]}
                      size="small"
                    />
                  </Box>

                  {/* Item Name */}
                  <Typography variant="h6" component="h3" gutterBottom>
                    {request.item.name}
                  </Typography>

                  {/* Borrower Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      {...(request.borrower.image && { src: request.borrower.image })}
                      alt={request.borrower.name}
                      sx={{ width: 32, height: 32, mr: 1 }}
                    >
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {request.borrower.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Return Date */}
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    <strong>Requested return:</strong>{' '}
                    {new Date(request.requestedReturnDate).toLocaleDateString()}
                  </Typography>

                  {/* Request Message Preview */}
                  {request.requestMessage && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      "{request.requestMessage}"
                    </Typography>
                  )}

                  {/* Video indicator */}
                  {request.videoUrl && (
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        icon={<PlayArrow />}
                        label="Video message"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    component={Link}
                    href={`/lender/requests/${request.id}`}
                    variant={request.status === 'PENDING' ? 'contained' : 'outlined'}
                    fullWidth
                    color={request.status === 'PENDING' ? 'primary' : 'inherit'}
                  >
                    {request.status === 'PENDING' ? 'Review & Respond' : 'View Details'}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
}