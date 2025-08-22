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
import { Suspense, useState, useEffect } from 'react';

import { AuthLayout } from '@/components/AuthLayout';
import { Wordmark } from '@/components/Wordmark';
import { brandColors } from '@/theme/brandTokens';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationContext, setInvitationContext] = useState<{
    branchName: string;
    inviterName: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  const isMagicLink = searchParams.get('magic') === 'true';
  const isAutoComplete = searchParams.get('auto') === 'true';
  const prefilledEmail = searchParams.get('email');
  const prefilledCode = searchParams.get('code');

  // Default to server-side callback that decides destination post-auth
  const branchId = searchParams.get('branch');
  const callbackUrl =
    searchParams.get('callbackUrl') ||
    (() => {
      if (invitationToken) {
        const params = new URLSearchParams();
        params.set('invitation', invitationToken);
        if (branchId) params.set('branch', branchId);
        return `/auth/callback?${params.toString()}`;
      }
      return '/auth/callback';
    })();

  // Auto-complete magic link sign-in
  useEffect(() => {
    if (
      isMagicLink &&
      isAutoComplete &&
      prefilledEmail &&
      prefilledCode &&
      !isLoading
    ) {
      setEmail(decodeURIComponent(prefilledEmail));
      setCode(prefilledCode);
      setStep('code');

      // Auto-submit the code
      const autoSignIn = async () => {
        setIsLoading(true);
        setError('');

        try {
          const signInResult = await signIn('email-code', {
            email: decodeURIComponent(prefilledEmail),
            code: prefilledCode,
            callbackUrl,
            redirect: true,
          });

          if (signInResult?.error) {
            setError(
              signInResult.error || 'Authentication failed. Please try again.'
            );
            setIsLoading(false);
          }
        } catch {
          setError('Something went wrong. Please try again.');
          setIsLoading(false);
        }
      };

      autoSignIn();
    }
  }, [
    isMagicLink,
    isAutoComplete,
    prefilledEmail,
    prefilledCode,
    isLoading,
    callbackUrl,
  ]);

  // Load invitation context if invitation token exists
  useEffect(() => {
    if (invitationToken) {
      fetch(`/api/invitations/${invitationToken}/details`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.invitation) {
            setInvitationContext({
              branchName: data.invitation.branch?.name || 'Unknown Branch',
              inviterName: data.invitation.sender?.name || 'Someone',
            });
            // Pre-fill email if invitation has one (but don't override magic link email)
            if (data.invitation.email && !prefilledEmail) {
              setEmail(data.invitation.email);
            }
          }
        })
        .catch(console.error);
    }
  }, [invitationToken, prefilledEmail]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setStep('code');
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Use NextAuth's signIn with automatic redirect
      // This ensures proper session synchronization
      const signInResult = await signIn('email-code', {
        email,
        code,
        // Let the callback page decide dashboard vs. profile/create
        callbackUrl,
        redirect: true, // Let NextAuth handle the redirect
      });

      // If we get here, there was an error (redirect didn't happen)
      if (signInResult?.error) {
        setError(signInResult.error || 'Invalid code. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (step === 'code') {
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
                Enter your code
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
                We&apos;ve sent a 6-digit code to{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 500, color: brandColors.inkBlue }}
                >
                  {email}
                </Box>
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    backgroundColor: '#fef2f2',
                    border: `1px solid #fecaca`,
                    '& .MuiAlert-icon': {
                      color: '#dc2626',
                    },
                    '& .MuiAlert-message': {
                      color: brandColors.charcoal,
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleCodeSubmit}>
                <TextField
                  fullWidth
                  id="code"
                  name="code"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  variant="outlined"
                  inputProps={{
                    maxLength: 6,
                    pattern: '[0-9]{6}',
                    inputMode: 'numeric',
                  }}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: brandColors.white,
                      borderRadius: 2,
                      fontSize: '1.25rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      textAlign: 'center',
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
                      textAlign: 'center',
                    },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading || code.length !== 6}
                  sx={{
                    backgroundColor: brandColors.inkBlue,
                    color: brandColors.white,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    mb: 2,
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
                  {isLoading ? 'Verifying...' : 'Sign in'}
                </Button>

                <Button
                  variant="text"
                  fullWidth
                  onClick={() => setStep('email')}
                  sx={{
                    color: brandColors.inkBlue,
                    textDecoration: 'underline',
                    '&:hover': {
                      textDecoration: 'none',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  Back to email
                </Button>
              </Box>
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
            {/* Invitation Context */}
            {invitationContext && (
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  p: 2,
                  backgroundColor: '#f0f9ff',
                  borderRadius: 2,
                  border: `1px solid #bfdbfe`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: brandColors.inkBlue,
                    fontWeight: 500,
                    mb: 0.5,
                  }}
                >
                  You&apos;ve been invited to join
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: brandColors.charcoal,
                    fontWeight: 600,
                  }}
                >
                  {invitationContext.branchName}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: brandColors.charcoal,
                    opacity: 0.8,
                  }}
                >
                  by {invitationContext.inviterName}
                </Typography>
              </Box>
            )}

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
              {invitationContext
                ? 'Enter your email to join'
                : 'Enter your email to sign in'}
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  backgroundColor: '#fef2f2',
                  border: `1px solid #fecaca`,
                  '& .MuiAlert-icon': {
                    color: '#dc2626',
                  },
                  '& .MuiAlert-message': {
                    color: brandColors.charcoal,
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Email Form */}
            <Box component="form" onSubmit={handleEmailSubmit}>
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
                {isLoading ? 'Sending code...' : 'Continue'}
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
