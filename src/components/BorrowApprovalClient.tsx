'use client';

import {
  Check as CheckIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import MuxPlayer from '@mux/mux-player-react';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface BorrowRequest {
  id: string;
  videoUrl: string | null;
  promiseText: string | null;
  promisedReturnBy: Date | null;
  requestedAt: Date;
  borrower: {
    id: string;
    name: string | null;
    image: string | null;
    phone: string | null;
  };
  lender: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  item: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
}

interface BorrowApprovalClientProps {
  borrowRequest: BorrowRequest;
}

export function BorrowApprovalClient({
  borrowRequest,
}: BorrowApprovalClientProps) {
  const [decision, setDecision] = useState<'approve' | 'decline' | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate response based on decision
  const handleDecisionChange = (newDecision: 'approve' | 'decline') => {
    setDecision(newDecision);
    if (newDecision === 'approve') {
      setResponse(
        `No problem! When would work for pickup? I'm usually available _____ around _____`
      );
    } else {
      setResponse(
        `I'm sorry, I can't lend this right now. Thanks for asking though!`
      );
    }
  };

  const handleSubmit = async () => {
    if (!decision || !response.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const responseData = await fetch('/api/borrow-requests/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowRequestId: borrowRequest.id,
          decision,
          response: response.trim(),
        }),
      });

      if (!responseData.ok) {
        const error = await responseData.json();
        throw new Error(error.message || 'Failed to send response');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit response:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: 'success.main', mb: 2 }}>
            ✅
          </Typography>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 600, color: brandColors.charcoal }}
          >
            Response Sent!
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: brandColors.charcoal, opacity: 0.7 }}
          >
            {borrowRequest.borrower.name} has been notified of your response via
            SMS.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: brandColors.charcoal,
            mb: 2,
          }}
        >
          Borrow Request
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: brandColors.charcoal, opacity: 0.7 }}
        >
          Someone wants to borrow your item
        </Typography>
      </Box>

      {/* Borrower Info */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              {...(borrowRequest.borrower.image && {
                src: borrowRequest.borrower.image,
              })}
              sx={{
                width: 50,
                height: 50,
                mr: 2,
                bgcolor: brandColors.inkBlue,
              }}
            >
              {borrowRequest.borrower.name?.[0] || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {borrowRequest.borrower.name || 'Anonymous User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                wants to borrow your <strong>{borrowRequest.item.name}</strong>
              </Typography>
            </Box>
          </Box>

          {/* Item Info */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {borrowRequest.item.imageUrl && (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  backgroundImage: `url(${borrowRequest.item.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
            )}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {borrowRequest.item.name}
              </Typography>
              {borrowRequest.item.description && (
                <Typography variant="body2" color="text.secondary">
                  {borrowRequest.item.description}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Promise Info */}
          <Box sx={{ bgcolor: brandColors.warmCream, p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Their Promise:
            </Typography>
            <Typography variant="body2">
              &ldquo;{borrowRequest.promiseText || 'No promise text provided'}
              &rdquo;
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              Promised return date:{' '}
              {borrowRequest.promisedReturnBy
                ? new Date(borrowRequest.promisedReturnBy).toLocaleDateString()
                : 'No date specified'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Video Request */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Their Video Request
          </Typography>
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'black',
            }}
          >
            {borrowRequest.videoUrl ? (
              (() => {
                const url = borrowRequest.videoUrl || '';
                if (url.includes('stream.mux.com/')) {
                  const match = url.match(/stream\.mux\.com\/([^\.]+)/);
                  const playbackId = match ? match[1] : null;
                  if (playbackId) {
                    return (
                      <MuxPlayer
                        style={{ width: '100%', height: 'auto' }}
                        streamType="on-demand"
                        playbackId={playbackId}
                        accentColor="#1f2937"
                      />
                    );
                  }
                }
                return (
                  <video
                    src={borrowRequest.videoUrl}
                    controls
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                );
              })()
            ) : (
              <Box sx={{ p: 4, textAlign: 'center', color: 'white' }}>
                <Typography>No video available</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Response Form */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Your Response
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Decision Radio Buttons */}
          <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
              Decision
            </FormLabel>
            <RadioGroup
              value={decision || ''}
              onChange={(e) =>
                handleDecisionChange(e.target.value as 'approve' | 'decline')
              }
            >
              <FormControlLabel
                value="approve"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon sx={{ color: 'success.main', mr: 1 }} />
                    <Typography>Approve - They can borrow it</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="decline"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CloseIcon sx={{ color: 'error.main', mr: 1 }} />
                    <Typography>Politely Decline</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Response Message */}
          <TextField
            label="Your Message"
            multiline
            rows={4}
            fullWidth
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            helperText={
              decision === 'approve'
                ? 'Let them know when and where they can pick it up'
                : 'A polite decline message'
            }
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
              },
            }}
          />

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={!decision || !response.trim() || isSubmitting}
              startIcon={
                isSubmitting ? <CircularProgress size={20} /> : <SendIcon />
              }
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {isSubmitting ? 'Sending...' : 'Send Response'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
