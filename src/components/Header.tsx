'use client';

import { AppBar, Toolbar, Container, Box, Button, Stack } from '@mui/material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

import { brandColors } from '@/theme/brandTokens';

import { Wordmark } from './Wordmark';

export function Header() {
  const { data: session } = useSession();

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: brandColors.warmCream,
        borderBottom: `1px solid ${brandColors.softGray}`,
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
          {/* Wordmark */}
          <Box sx={{ flexGrow: 0 }}>
            <Wordmark size="medium" color="primary" />
          </Box>

          {/* Navigation */}
          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2 }}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
            }}
          >
            <Button
              color="inherit"
              sx={{
                color: brandColors.charcoal,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              How It Works
            </Button>
            <Button
              color="inherit"
              sx={{
                color: brandColors.charcoal,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              About
            </Button>
            {session ? (
              <Button
                onClick={() => signOut()}
                variant="outlined"
                color="primary"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href="/auth/signin"
                  variant="outlined"
                  color="primary"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href="/profile/create"
                  variant="contained"
                  color="primary"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Get Started
                </Button>
              </Stack>
            )}
          </Stack>

          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
            {session ? (
              <Button
                onClick={() => signOut()}
                variant="outlined"
                color="primary"
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href="/auth/signin"
                  variant="outlined"
                  color="primary"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href="/profile/create"
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                  }}
                >
                  Get Started
                </Button>
              </Stack>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
