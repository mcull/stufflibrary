'use client';

import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  Stack,
  IconButton,
  Drawer,
  List,
  ListItem,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

import { Wordmark } from './Wordmark';

export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

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
          <Box sx={{ flexGrow: 0, transform: 'rotate(-1.2deg)' }}>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Wordmark size="small" color="primary" />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Wordmark size="medium" color="primary" />
            </Box>
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
              <Stack direction="row" spacing={3} alignItems="center">
                <MuiLink
                  component={Link}
                  href="/auth/signin"
                  underline="none"
                  sx={{
                    fontSize: '1.125rem',
                    fontFamily:
                      'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontWeight: 400,
                    color: brandColors.charcoal,
                    '&:hover': {
                      color: brandColors.inkBlue,
                    },
                  }}
                >
                  Sign In
                </MuiLink>
                <Button
                  component={Link}
                  href="/auth/signin"
                  variant="contained"
                  sx={{
                    backgroundColor: '#DE703A',
                    color: 'white',
                    fontFamily:
                      'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: '1rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    px: 3,
                    py: 1.5,
                    borderRadius: 1,
                    minHeight: 'auto',
                    '&:hover': {
                      backgroundColor: 'rgba(222, 112, 58, 0.9)',
                    },
                  }}
                >
                  Join Now
                </Button>
              </Stack>
            )}
          </Stack>

          {/* Mobile Navigation */}
          <Box
            sx={{
              display: { xs: 'flex', sm: 'none' },
              alignItems: 'center',
              gap: 1,
            }}
          >
            {!session && (
              <Button
                component={Link}
                href="/auth/signin"
                variant="contained"
                color="primary"
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  px: 1.5,
                  py: 0.5,
                  minWidth: 'auto',
                }}
              >
                GET STARTED
              </Button>
            )}

            <IconButton
              onClick={handleMobileMenuToggle}
              sx={{
                color: brandColors.charcoal,
                p: 0.5,
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: '100%',
            backgroundColor: brandColors.warmCream,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Wordmark size="small" color="primary" />
            <IconButton onClick={handleMobileMenuToggle}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List sx={{ pt: 2 }}>
            {!session && (
              <>
                <ListItem sx={{ px: 0 }}>
                  <Button
                    component={Link}
                    href="/auth/signin"
                    fullWidth
                    onClick={handleMobileMenuToggle}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      color: brandColors.charcoal,
                      py: 1.5,
                    }}
                  >
                    Sign In
                  </Button>
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <Button
                    component={Link}
                    href="/auth/signin"
                    fullWidth
                    onClick={handleMobileMenuToggle}
                    variant="contained"
                    color="primary"
                    sx={{
                      justifyContent: 'center',
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      py: 1.5,
                    }}
                  >
                    Get Started
                  </Button>
                </ListItem>
              </>
            )}

            {session && (
              <ListItem sx={{ px: 0 }}>
                <Button
                  onClick={() => {
                    signOut();
                    handleMobileMenuToggle();
                  }}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: brandColors.charcoal,
                    py: 1.5,
                  }}
                >
                  Sign Out
                </Button>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
