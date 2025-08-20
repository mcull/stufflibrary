'use client';

import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

import { Wordmark } from './Wordmark';

export function AuthenticatedHeader() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSignOut = () => {
    signOut();
    setMobileMenuOpen(false);
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
            minHeight: { xs: 56, md: 64 }, // Smaller than marketing header
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          {/* Wordmark */}
          <Box sx={{ flexGrow: 0 }}>
            <Link href="/lobby" style={{ textDecoration: 'none' }}>
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                <Wordmark size="small" color="primary" />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Wordmark size="medium" color="primary" />
              </Box>
            </Link>
          </Box>

          {/* Right Side - Desktop: Small Sign Out + Hamburger, Mobile: Just Hamburger */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Desktop Sign Out - Small button */}
            <Button
              onClick={handleSignOut}
              variant="text"
              size="small"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                textTransform: 'none',
                fontWeight: 400,
                fontSize: '0.875rem',
                color: brandColors.charcoal,
                minWidth: 'auto',
                px: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              Sign Out
            </Button>

            {/* Hamburger Menu */}
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

      {/* Menu Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            backgroundColor: brandColors.warmCream,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
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

          {/* User Info */}
          {session?.user && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  {...(session.user.image && { src: session.user.image })}
                  alt={session.user.name || 'User'}
                  sx={{ width: 40, height: 40 }}
                >
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {session.user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {session.user.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Menu Items */}
          <List sx={{ pt: 0 }}>
            <ListItem
              component={Link}
              href="/profile"
              onClick={handleMobileMenuToggle}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.5)' },
              }}
            >
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText
                primary="My Profile"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem
              component={Link}
              href="/settings"
              onClick={handleMobileMenuToggle}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.5)' },
              }}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem
              component={Link}
              href="/help"
              onClick={handleMobileMenuToggle}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.5)' },
              }}
            >
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
              <ListItemText
                primary="Help & Support"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <Divider sx={{ my: 2 }} />

            <ListItem
              onClick={handleSignOut}
              sx={{
                borderRadius: 1,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.5)' },
                cursor: 'pointer',
              }}
            >
              <ListItemIcon>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText
                primary="Sign Out"
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
