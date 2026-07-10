'use client';

import { Box, Container, Stack, Toolbar, AppBar } from '@mui/material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

import { brandColors } from '@/theme/brandTokens';

const MONO = '"Roboto Mono", monospace';

/** Marketing header (#430): label-chip wordmark + typed nav + Get a card. */
export function Header() {
  const { data: session } = useSession();

  const navLink = {
    fontFamily: MONO,
    fontSize: '15px',
    color: brandColors.inkBlue,
    textDecoration: 'none',
    '&:hover': { color: brandColors.tomatoRed },
  } as const;

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: brandColors.warmCream,
        borderBottom: `2px solid ${brandColors.inkBlue}`,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 64, md: 80 },
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Box
              component="span"
              className="vintage-impact-label"
              sx={{
                fontSize: { xs: '20px', sm: '26px' },
                color: brandColors.warmCream,
                background: brandColors.tomatoRed,
                padding: '3px 8px',
                transform: 'rotate(-1.2deg)',
                display: 'inline-block',
                lineHeight: 1.2,
              }}
            >
              STUFFLIBRARY
            </Box>
          </Link>

          <Stack
            direction="row"
            spacing={{ xs: 2, md: '28px' }}
            alignItems="center"
          >
            {session ? (
              <Box
                component="button"
                onClick={() => signOut()}
                sx={{
                  ...navLink,
                  background: 'none',
                  border: `2px solid ${brandColors.inkBlue}`,
                  padding: '8px 18px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  '&:hover': {
                    background: brandColors.inkBlue,
                    color: brandColors.warmCream,
                  },
                }}
              >
                Sign out
              </Box>
            ) : (
              <>
                <Box
                  component={Link}
                  href="/#how"
                  sx={{ ...navLink, display: { xs: 'none', sm: 'inline' } }}
                >
                  How it works
                </Box>
                <Box component={Link} href="/auth/signin" sx={navLink}>
                  Sign in
                </Box>
                <Box
                  component={Link}
                  href="/auth/signin"
                  sx={{
                    ...navLink,
                    border: `2px solid ${brandColors.inkBlue}`,
                    padding: '8px 18px',
                    borderRadius: '3px',
                    transition: 'background 0.2s ease, color 0.2s ease',
                    '&:hover': {
                      background: brandColors.inkBlue,
                      color: brandColors.warmCream,
                    },
                  }}
                >
                  Get a card
                </Box>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
