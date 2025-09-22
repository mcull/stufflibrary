'use client';

import {
  ArrowBack,
  Person,
  AccessTime,
  CheckCircle,
  CalendarToday,
  Message,
  AssignmentReturned,
  WarningAmber,
} from '@mui/icons-material';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

interface BorrowRequest {
  id: string;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'DECLINED'
    | 'ACTIVE'
    | 'RETURNED'
    | 'CANCELLED';
  requestMessage?: string;
  lenderMessage?: string;
  videoUrl?: string;
  requestedReturnDate: string;
  createdAt: string;
  approvedAt?: string;
  returnedAt?: string;
  borrower: {
    id: string;
    name: string;
    image?: string;
    email?: string;
  };
  lender: {
    id: string;
    name: string;
    image?: string;
  };
  item: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    watercolorUrl?: string;
    watercolorThumbUrl?: string;
    condition: string;
  };
}

interface BorrowRequestDetailProps {
  requestId: string;
}

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
  ACTIVE: 'info',
  RETURNED: 'success',
  CANCELLED: 'default',
} as const;

export function BorrowRequestDetail({ requestId }: BorrowRequestDetailProps) {
  const { status } = useSession();
  const router = useRouter();
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/borrow-requests/${requestId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Request not found');
        } else if (response.status === 403) {
          setError('You do not have permission to view this request');
        } else {
          throw new Error('Failed to fetch request');
        }
        return;
      }

      const data = await response.json();
      setRequest(data.borrowRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchRequest();
    }
  }, [status, requestId, router, fetchRequest]);

  const handleMarkReturned = async () => {
    if (!request) return;

    setReturning(true);

    try {
      const response = await fetch(`/api/borrow-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'return',
          message: returnNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as returned');
      }

      // Refresh the request data
      await fetchRequest();
      setReturnDialog(false);
      setReturnNotes('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to mark as returned'
      );
    } finally {
      setReturning(false);
    }
  };

  const openReturnDialog = () => {
    setReturnDialog(true);
    setReturnNotes('');
    setError(null);
  };

  const closeReturnDialog = () => {
    setReturnDialog(false);
    setReturnNotes('');
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
        <Container maxWidth="lg" sx={{ py: spacing.lg / 16 }}>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="50vh"
          >
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
        <Container maxWidth="lg" sx={{ py: spacing.lg / 16 }}>
          <Button
            component={Link}
            href="/stacks"
            startIcon={<ArrowBack />}
            sx={{ mb: 2 }}
          >
            Back to Lobby
          </Button>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!request) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
        <Container maxWidth="lg" sx={{ py: spacing.lg / 16 }}>
          <Alert severity="info">Request not found</Alert>
        </Container>
      </Box>
    );
  }

  const isActive = request.status === 'ACTIVE';
  const isReturned = request.status === 'RETURNED';
  const canReturn = isActive;

  // Check if return date has passed
  const returnDate = new Date(request.requestedReturnDate);
  const isOverdue = returnDate < new Date() && isActive;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
      <Container maxWidth="lg" sx={{ py: spacing.lg / 16 }}>
        {/* Navigation */}
        <Button
          component={Link}
          href="/lobby"
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
        >
          Back to Lobby
        </Button>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Your Borrow Request
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip label={request.status} color={statusColors[request.status]} />
            {isOverdue && (
              <Chip
                icon={<WarningAmber />}
                label="OVERDUE"
                color="error"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 4,
          }}
        >
          {/* Main Content */}
          <Box sx={{ flex: { lg: 2 } }}>
            {/* Item Details */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Borrowed Item
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 3,
                  }}
                >
                  <Box sx={{ flex: { sm: 1 } }}>
                    {(request.item.watercolorThumbUrl ||
                      request.item.watercolorUrl ||
                      request.item.imageUrl) && (
                      <Box
                        component="img"
                        src={
                          request.item.watercolorThumbUrl ||
                          request.item.watercolorUrl ||
                          request.item.imageUrl!
                        }
                        alt={request.item.name}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: { sm: 2 } }}>
                    <Typography variant="h6" gutterBottom>
                      {request.item.name}
                    </Typography>
                    {request.item.description && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        paragraph
                      >
                        {request.item.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Condition:</strong> {request.item.condition}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Your Request Message */}
            {request.requestMessage && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Message sx={{ mr: 1 }} />
                    Your Request Message
                  </Typography>
                  <Typography variant="body1">
                    &quot;{request.requestMessage}&quot;
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Lender's Response */}
            {request.lenderMessage && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    {request.lender.name}&apos;s Response
                  </Typography>
                  <Typography variant="body1">
                    &quot;{request.lenderMessage}&quot;
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Return Instructions */}
            {isActive && (
              <Card
                sx={{
                  mb: 3,
                  bgcolor: 'info.light',
                  color: 'info.contrastText',
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Return Instructions
                  </Typography>
                  <Typography variant="body2" paragraph>
                    When you&apos;re ready to return this item:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                    1. Return the item to {request.lender.name} in the same
                    condition
                    <br />
                    2. Click &quot;Mark as Returned&quot; below
                    <br />
                    3. Add any notes about the condition or return process
                    <br />
                    4. {request.lender.name} will be notified and can confirm
                    the return
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Return Confirmation */}
            {isReturned && (
              <Card
                sx={{
                  mb: 3,
                  bgcolor: 'success.light',
                  color: 'success.contrastText',
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <CheckCircle sx={{ mr: 1 }} />
                    Item Returned
                  </Typography>
                  <Typography variant="body2">
                    You marked this item as returned on{' '}
                    {formatDistanceToNow(new Date(request.returnedAt!), {
                      addSuffix: true,
                    })}
                    .{request.lender.name} has been notified.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Sidebar */}
          <Box sx={{ flex: { lg: 1 } }}>
            {/* Lender Profile */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Lender
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    {...(request.lender.image && {
                      src: request.lender.image,
                    })}
                    alt={request.lender.name}
                    sx={{ width: 56, height: 56, mr: 2 }}
                  >
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{request.lender.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Item owner
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    <CalendarToday
                      sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }}
                    />
                    Requested:{' '}
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                    })}
                  </Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="body2"
                    color={isOverdue ? 'error' : 'textSecondary'}
                    sx={{ fontWeight: isOverdue ? 600 : 400 }}
                  >
                    <AccessTime
                      sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }}
                    />
                    {isOverdue ? 'Was due: ' : 'Return by: '}
                    {new Date(request.requestedReturnDate).toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                  </Typography>
                </Box>

                {request.approvedAt && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      <CheckCircle
                        sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }}
                      />
                      Approved:{' '}
                      {formatDistanceToNow(new Date(request.approvedAt), {
                        addSuffix: true,
                      })}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Action Button */}
            {canReturn && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ready to Return?
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Mark this item as returned when you&apos;ve given it back to{' '}
                    {request.lender.name}.
                  </Typography>

                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    startIcon={<AssignmentReturned />}
                    onClick={openReturnDialog}
                    sx={{ mb: isOverdue ? 2 : 0 }}
                  >
                    Mark as Returned
                  </Button>

                  {isOverdue && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      This item is overdue. Please return it as soon as
                      possible.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>

        {/* Return Confirmation Dialog */}
        <Dialog
          open={returnDialog}
          onClose={closeReturnDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Mark &quot;{request.item.name}&quot; as Returned
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Confirm that you have returned this item to {request.lender.name}
              in good condition. They will receive a notification.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Return notes (optional)"
              placeholder="Item returned in good condition. Thanks for letting me borrow it!"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                ✓ {request.lender.name} will be notified that you&apos;ve
                returned the item
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={closeReturnDialog}>Cancel</Button>
            <Button
              onClick={handleMarkReturned}
              variant="contained"
              color="success"
              disabled={returning}
              startIcon={
                returning ? (
                  <CircularProgress size={20} />
                ) : (
                  <AssignmentReturned />
                )
              }
            >
              {returning ? 'Marking as Returned...' : 'Mark as Returned'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
