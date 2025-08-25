import { Box, Container, Typography } from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

export function Hero() {
  return (
    <Box
      component="section"
      sx={{
        backgroundColor: brandColors.warmCream,
        py: { xs: spacing.xxxl / 3, md: spacing.xxxl / 3 }, // Much tighter spacing
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: '800px',
            mx: 'auto',
            px: { xs: 2, md: 0 },
          }}
        >
          {/* Hero Headline */}
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              lineHeight: 1.1,
              mb: { xs: 3, md: 4 },
              letterSpacing: '-0.02em',
            }}
          >
            Share more,{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.inkBlue,
              }}
            >
              buy less
            </Box>
          </Typography>

          {/* Subheadline */}
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 400,
              color: brandColors.charcoal,
              lineHeight: 1.4,
              mb: { xs: 4, md: 6 },
              opacity: 0.9,
            }}
          >
            A neighborhood platform for safely sharing stuff.
            <br />
            Build community. Reduce clutter. Save money.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
