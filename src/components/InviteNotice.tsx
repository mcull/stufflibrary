'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

import { brandColors } from '@/theme/brandTokens';

export type InviteNoticeStatus =
  | 'wrong_account'
  | 'invalid'
  | 'expired'
  | 'error';

/** The four ways an invitation link can end without opening a door. */
const COPY: Record<
  Exclude<InviteNoticeStatus, 'wrong_account'>,
  { heading: string; body: string }
> = {
  invalid: {
    heading: 'That link is no longer on file',
    body: 'It may have been replaced by a newer invitation, or already used. Ask whoever invited you to send another — it takes them a moment.',
  },
  expired: {
    heading: 'That invitation has expired',
    body: 'Invitations are good for seven days. Ask whoever invited you for a fresh one and the new link will work straight away.',
  },
  error: {
    heading: 'Something went wrong opening that invitation',
    body: 'Nothing was lost. Try the link again in a moment, and if it still stalls, ask for a new one.',
  },
};

/**
 * The dead end at the other side of a refused invitation.
 *
 * `wrong_account` is the one that matters: someone is signed in as themselves
 * and holding a link addressed to somebody else. It names the addressee masked
 * — enough to recognize, not enough to harvest — and offers the only recovery
 * there is, which is to come back as that person. The invite cookies are
 * deliberately still there, so signing in as the right address finishes the
 * job it started.
 *
 * `maskedEmail` comes off the cookie server-side, never a query parameter, and
 * is shown only for `wrong_account` — the other three have no addressee to
 * name.
 */
export function InviteNotice({
  status,
  maskedEmail,
}: {
  status: InviteNoticeStatus;
  maskedEmail: string | null;
}) {
  const wrongAccount = status === 'wrong_account';
  const heading = wrongAccount
    ? 'This invitation was issued to someone else'
    : COPY[status].heading;
  const body = wrongAccount
    ? maskedEmail
      ? `It was sent to ${maskedEmail}. Sign in with that address and it is yours to accept.`
      : 'It was sent to a different address than the one you are signed in with. Sign in as the invited address to accept it.'
    : COPY[status].body;

  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
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
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 2 }}
            >
              {heading}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              {body}
            </Typography>

            {wrongAccount && (
              <Button
                fullWidth
                variant="contained"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                sx={{
                  backgroundColor: brandColors.inkBlue,
                  color: brandColors.white,
                  py: 1.5,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  mb: 2,
                  '&:hover': { backgroundColor: '#1a2f4f' },
                }}
              >
                {maskedEmail
                  ? `Sign in as ${maskedEmail}`
                  : 'Sign in as the invited address'}
              </Button>
            )}

            <Button
              component={Link}
              href={wrongAccount ? '/home' : '/'}
              fullWidth
              variant="text"
              sx={{
                color: brandColors.inkBlue,
                textTransform: 'none',
                textDecoration: 'underline',
                '&:hover': {
                  textDecoration: 'none',
                  backgroundColor: 'transparent',
                },
              }}
            >
              {wrongAccount
                ? 'Stay signed in as you are'
                : 'Back to the front desk'}
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
