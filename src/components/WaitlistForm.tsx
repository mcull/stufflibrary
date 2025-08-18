'use client';

import { Email } from '@mui/icons-material';
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface WaitlistFormProps {
  variant?: 'inline' | 'modal';
  onSuccess?: () => void;
}

export function WaitlistForm({
  variant = 'inline',
  onSuccess,
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setErrorMessage('Email is required');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join waitlist');
      }

      setStatus('success');
      setEmail('');
      setName('');
      onSuccess?.();
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <Alert
        severity="success"
        sx={{
          borderRadius: 2,
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          border: `1px solid rgba(76, 175, 80, 0.3)`,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Welcome to the waitlist! 🎉
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          We&apos;ll notify you when StuffLibrary launches in your area.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        maxWidth: variant === 'inline' ? '500px' : '400px',
        mx: 'auto',
      }}
    >
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: brandColors.white,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                  borderWidth: 2,
                },
              },
            },
          }}
        />

        <TextField
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: brandColors.white,
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: brandColors.inkBlue,
                  borderWidth: 2,
                },
              },
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Email />
            )
          }
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 4px 14px 0 rgba(30, 58, 95, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px 0 rgba(30, 58, 95, 0.3)',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              transform: 'none',
              boxShadow: '0 4px 14px 0 rgba(30, 58, 95, 0.1)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? 'Joining...' : 'Join the Waitlist'}
        </Button>
      </Stack>

      <Typography
        variant="body2"
        sx={{
          mt: 2,
          textAlign: 'center',
          color: brandColors.charcoal,
          opacity: 0.7,
          fontSize: '0.85rem',
        }}
      >
        We&apos;ll only send you updates about StuffLibrary. No spam, ever.
      </Typography>
    </Box>
  );
}
