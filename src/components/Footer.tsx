import {
  Box,
  Container,
  Typography,
  Link,
  Stack,
  Divider,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#' },
      { label: 'Features', href: '#' },
      { label: 'Safety', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Mission', href: '#' },
      { label: 'Success Stories', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Community Guidelines', href: '#' },
      { label: 'Contact Us', href: 'mailto:hello@stufflibrary.org' },
      { label: 'Report Issue', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: brandColors.charcoal,
        color: brandColors.white,
        pt: { xs: spacing.sm, md: spacing.md },
        pb: { xs: spacing.xs, md: spacing.sm },
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {/* Brand Column */}
          <Box>
            <Stack spacing={2}>
              <Typography
                variant="h6"
                sx={{
                  color: brandColors.white,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                StuffLibrary
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: brandColors.white,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  maxWidth: '300px',
                }}
              >
                Make stuff sharing simple and safe in your neighborhood.
              </Typography>
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
            my: { xs: 2, md: 3 },
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
              href="/privacy"
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
              href="/terms"
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
              href="/cookies"
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
