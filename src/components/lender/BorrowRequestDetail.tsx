'use client';

import {
  ArrowBack,
  Person,
  AccessTime,
  CheckCircle,
  Cancel,
  PlayArrow,
  CalendarToday,
  Message,
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
  FormControlLabel,
  Switch,
  Stack,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { VideoPlayer } from './VideoPlayer';

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
    condition: string;
  };
}

interface BorrowRequestDetailProps {
  requestId: string;
}

type ResponseType = 'approve' | 'decline' | null;

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
  ACTIVE: 'info',
  RETURNED: 'success',
  CANCELLED: 'default',
} as const;

const suggestedDeclineReasons = [
  'I need the item during that time period',
  'The item needs maintenance before lending',
  "I'm not comfortable lending this particular item",
  'The requested time period is too long',
  'I have other plans for the item',
];

export function BorrowRequestDetail({ requestId }: BorrowRequestDetailProps) {
  const { status } = useSession();
  const router = useRouter();
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responseDialog, setResponseDialog] = useState<ResponseType>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [modifyReturnDate, setModifyReturnDate] = useState(false);
  const [newReturnDate, setNewReturnDate] = useState('');

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
      setNewReturnDate(data.borrowRequest.requestedReturnDate.split('T')[0]);
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
  }, [status, requestId, router]);

  const handleResponse = async (decision: 'approve' | 'decline') => {
    if (!request) return;

    setResponding(true);

    try {
      const response = await fetch(`/api/borrow-requests/${request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: decision,
          message: responseMessage || undefined,
          ...(decision === 'approve' &&
            modifyReturnDate && {
              modifiedReturnDate: newReturnDate,
            }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${decision} request`);
      }

      // Refresh the request data
      await fetchRequest();
      setResponseDialog(null);
      setResponseMessage('');
      setModifyReturnDate(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${decision} request`
      );
    } finally {
      setResponding(false);
    }
  };

  const openResponseDialog = (type: ResponseType) => {
    setResponseDialog(type);
    setResponseMessage('');
    setError(null);
  };

  const closeResponseDialog = () => {
    setResponseDialog(null);
    setResponseMessage('');
    setModifyReturnDate(false);
  };

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/lender/requests"
          startIcon={<ArrowBack />}
          sx={{ mb: 2 }}
        >
          Back to Requests
        </Button>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!request) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Request not found</Alert>
      </Container>
    );
  }

  const isPending = request.status === 'PENDING';
  const canRespond = isPending;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Navigation */}
      <Button
        component={Link}
        href="/lender/requests"
        startIcon={<ArrowBack />}
        sx={{ mb: 3 }}
      >
        Back to Requests
      </Button>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Borrowing Request
        </Typography>
        <Chip
          label={request.status}
          color={statusColors[request.status]}
          sx={{ mb: 2 }}
        />
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
          {/* Borrower Video */}
          {request.videoUrl && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <PlayArrow sx={{ mr: 1 }} />
                  Borrower&apos;s Video Message
                </Typography>
                <VideoPlayer videoUrl={request.videoUrl} />
              </CardContent>
            </Card>
          )}

          {/* Item Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Item Details
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 3,
                }}
              >
                <Box sx={{ flex: { sm: 1 } }}>
                  {request.item.imageUrl && (
                    <Box
                      component="img"
                      src={request.item.imageUrl}
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
                    <Typography variant="body2" color="textSecondary" paragraph>
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

          {/* Request Message */}
          {request.requestMessage && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <Message sx={{ mr: 1 }} />
                  Request Message
                </Typography>
                <Typography variant="body1">
                  &quot;{request.requestMessage}&quot;
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Response Message */}
          {request.lenderMessage && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Your Response
                </Typography>
                <Typography variant="body1">
                  &quot;{request.lenderMessage}&quot;
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: { lg: 1 } }}>
          {/* Borrower Profile */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Borrower Profile
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  {...(request.borrower.image && {
                    src: request.borrower.image,
                  })}
                  alt={request.borrower.name}
                  sx={{ width: 56, height: 56, mr: 2 }}
                >
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h6">{request.borrower.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Member since 2024
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
                <Typography variant="body2" color="textSecondary">
                  <AccessTime
                    sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }}
                  />
                  Return by:{' '}
                  {new Date(request.requestedReturnDate).toLocaleDateString()}
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

          {/* Action Buttons */}
          {canRespond && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Respond to Request
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Review the borrower&apos;s request and video message, then
                  approve or decline.
                </Typography>

                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    startIcon={<CheckCircle />}
                    onClick={() => openResponseDialog('approve')}
                  >
                    Approve Request
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    fullWidth
                    startIcon={<Cancel />}
                    onClick={() => openResponseDialog('decline')}
                  >
                    Decline Request
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Response Dialog */}
      <Dialog
        open={responseDialog !== null}
        onClose={closeResponseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {responseDialog === 'approve' ? 'Approve Request' : 'Decline Request'}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            {responseDialog === 'approve'
              ? "Let the borrower know you're happy to lend your item."
              : "Let the borrower know you can't lend your item right now."}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label={
              responseDialog === 'approve'
                ? 'Approval message (optional)'
                : 'Decline message (optional)'
            }
            placeholder={
              responseDialog === 'approve'
                ? 'Sure! Just bring it back in good condition by Tuesday evening.'
                : 'Sorry, I need this item during that time period.'
            }
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            sx={{ mb: 2 }}
          />

          {responseDialog === 'decline' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Suggested responses:
              </Typography>
              <Stack spacing={1}>
                {suggestedDeclineReasons.map((reason, index) => (
                  <Button
                    key={index}
                    variant="text"
                    size="small"
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                    onClick={() => setResponseMessage(reason)}
                  >
                    &quot;{reason}&quot;
                  </Button>
                ))}
              </Stack>
            </Box>
          )}

          {responseDialog === 'approve' && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={modifyReturnDate}
                    onChange={(e) => setModifyReturnDate(e.target.checked)}
                  />
                }
                label="Modify return date"
              />

              {modifyReturnDate && (
                <TextField
                  fullWidth
                  type="date"
                  label="New return date"
                  value={newReturnDate}
                  onChange={(e) => setNewReturnDate(e.target.value)}
                  sx={{ mt: 2 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>
          )}

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {responseDialog === 'approve'
                ? '✓ The borrower will receive a notification that you approved their request'
                : "✓ The borrower will receive a polite notification that the item isn't available"}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeResponseDialog}>Cancel</Button>
          <Button
            onClick={() => handleResponse(responseDialog!)}
            variant="contained"
            color={responseDialog === 'approve' ? 'success' : 'error'}
            disabled={responding}
            startIcon={responding ? <CircularProgress size={20} /> : null}
          >
            {responding
              ? 'Sending...'
              : responseDialog === 'approve'
                ? 'Approve'
                : 'Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
