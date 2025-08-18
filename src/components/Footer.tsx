import { Email, Twitter, GitHub, LinkedIn } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Link,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

import { Wordmark } from './Wordmark';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#' },
      { label: 'Features', href: '#' },
      { label: 'Safety', href: '#' },
      { label: 'Pricing', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Our Mission', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Community Guidelines', href: '#' },
      { label: 'Contact Us', href: 'mailto:hello@stufflibrary.org' },
      { label: 'Report Issue', href: '#' },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: GitHub, href: '#', label: 'GitHub' },
  { icon: LinkedIn, href: '#', label: 'LinkedIn' },
  { icon: Email, href: 'mailto:hello@stufflibrary.org', label: 'Email' },
];

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: brandColors.charcoal,
        color: brandColors.white,
        pt: { xs: spacing.xxxl / 4, md: spacing.xxxl / 2 },
        pb: { xs: spacing.lg, md: spacing.xl },
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Brand Column */}
          <Box>
            <Stack spacing={3}>
              <Wordmark size="medium" color="white" />

              <Typography
                variant="body1"
                sx={{
                  color: brandColors.white,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  maxWidth: '300px',
                }}
              >
                Building stronger communities through sharing. Connect with
                neighbors, save money, and reduce waste together.
              </Typography>

              {/* Social Links */}
              <Stack direction="row" spacing={1}>
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon;

                  return (
                    <IconButton
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      sx={{
                        color: brandColors.white,
                        opacity: 0.7,
                        '&:hover': {
                          opacity: 1,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <IconComponent fontSize="small" />
                    </IconButton>
                  );
                })}
              </Stack>
            </Stack>
          </Box>

          {/* Navigation Columns */}
          {footerSections.map((section, index) => (
            <Box
              key={index}
              sx={{ gridColumn: { xs: 'span 1', md: 'span 1' } }}
            >
              <Stack spacing={2}>
                <Typography
                  variant="h6"
                  sx={{
                    color: brandColors.white,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    mb: 1,
                  }}
                >
                  {section.title}
                </Typography>

                <Stack spacing={1.5}>
                  {section.links.map((link, linkIndex) => (
                    <Link
                      key={linkIndex}
                      href={link.href}
                      underline="none"
                      sx={{
                        color: brandColors.white,
                        opacity: 0.7,
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        '&:hover': {
                          opacity: 1,
                          color: brandColors.mustardYellow,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>

        {/* Divider */}
        <Divider
          sx={{
            my: { xs: 4, md: 6 },
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />

        {/* Bottom Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          spacing={2}
        >
          {/* Copyright */}
          <Typography
            variant="body2"
            sx={{
              color: brandColors.white,
              opacity: 0.6,
              fontSize: '0.875rem',
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            © {new Date().getFullYear()} StuffLibrary. All rights reserved.
          </Typography>

          {/* Legal Links */}
          <Stack
            direction="row"
            spacing={3}
            sx={{
              textAlign: { xs: 'center', sm: 'right' },
            }}
          >
            <Link
              href="#"
              underline="none"
              sx={{
                color: brandColors.white,
                opacity: 0.6,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                },
                transition: 'opacity 0.2s ease',
              }}
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              underline="none"
              sx={{
                color: brandColors.white,
                opacity: 0.6,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                },
                transition: 'opacity 0.2s ease',
              }}
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              underline="none"
              sx={{
                color: brandColors.white,
                opacity: 0.6,
                fontSize: '0.875rem',
                '&:hover': {
                  opacity: 1,
                },
                transition: 'opacity 0.2s ease',
              }}
            >
              Cookie Policy
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
