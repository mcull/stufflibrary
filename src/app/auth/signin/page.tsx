'use client';

import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';

import { AuthLayout } from '@/components/AuthLayout';
import { Wordmark } from '@/components/Wordmark';
import { brandColors } from '@/theme/brandTokens';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.ok) {
        setIsSubmitted(true);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            elevation={0}
            sx={{
              backgroundColor: brandColors.white,
              borderRadius: 2,
              border: `1px solid ${brandColors.softGray}`,
              p: { xs: 3, sm: 5 },
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                  <Wordmark size="medium" color="primary" />
                </Link>
              </Box>

              <Typography
                variant="h4"
                component="h1"
                sx={{
                  textAlign: 'center',
                  mb: 2,
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                Check your email
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  textAlign: 'center',
                  color: brandColors.charcoal,
                  opacity: 0.8,
                  mb: 4,
                  lineHeight: 1.6,
                }}
              >
                We&apos;ve sent a magic link to{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 500, color: brandColors.inkBlue }}
                >
                  {email}
                </Box>
              </Typography>

              <Alert
                severity="info"
                sx={{
                  backgroundColor: '#f0f9ff',
                  border: `1px solid #e0f2fe`,
                  '& .MuiAlert-icon': {
                    color: brandColors.inkBlue,
                  },
                  '& .MuiAlert-message': {
                    color: brandColors.charcoal,
                  },
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Click the link in your email to sign in to your account.
                </Typography>
                <Typography variant="body2">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setIsSubmitted(false)}
                    sx={{
                      p: 0,
                      minWidth: 'auto',
                      textDecoration: 'underline',
                      color: brandColors.inkBlue,
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'none',
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    try again
                  </Button>
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        py: 4,
        px: 2,
      }}
    >
      {/* Logo outside the card */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Wordmark size="medium" color="primary" />
        </Link>
      </Box>

      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            backgroundColor: brandColors.white,
            borderRadius: 2,
            border: `1px solid ${brandColors.softGray}`,
            p: { xs: 3, sm: 5 },
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Title */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                textAlign: 'center',
                mb: 4,
                fontWeight: 600,
                color: brandColors.charcoal,
                fontSize: { xs: '1.75rem', sm: '2rem' },
              }}
            >
              Enter your email to sign in
            </Typography>

            {/* Email Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@work-email.com"
                variant="outlined"
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: brandColors.white,
                    borderRadius: 2,
                    fontSize: '1rem',
                    '& fieldset': {
                      borderColor: brandColors.softGray,
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: brandColors.inkBlue,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: brandColors.inkBlue,
                      borderWidth: 2,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 1.5,
                    px: 2,
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  backgroundColor: brandColors.inkBlue,
                  color: brandColors.white,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#1a2f4f',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: brandColors.softGray,
                    color: brandColors.charcoal,
                    opacity: 0.6,
                  },
                }}
              >
                {isLoading ? 'Sending magic link...' : 'Continue'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default function SignIn() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
