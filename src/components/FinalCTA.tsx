import { Email, Launch } from '@mui/icons-material';
import { Box, Container, Typography, Button, Stack } from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

export function FinalCTA() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: spacing.xxxl / 2, md: spacing.xxxl },
        background: `linear-gradient(135deg, ${brandColors.inkBlue} 0%, #2D4A70 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, rgba(227, 181, 5, 0.15) 0%, transparent 50%)`,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
          {/* Main Headline */}
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
              fontWeight: 700,
              color: brandColors.white,
              mb: 3,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Ready to transform your{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.mustardYellow,
              }}
            >
              neighborhood?
            </Box>
          </Typography>

          {/* Subheadline */}
          <Typography
            variant="h4"
            component="h3"
            sx={{
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 400,
              color: brandColors.white,
              opacity: 0.9,
              lineHeight: 1.4,
              mb: { xs: 4, md: 6 },
            }}
          >
            Join the movement toward smarter, more connected communities.
            <br />
            Be the first to know when we launch in your area.
          </Typography>

          {/* CTA Buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            justifyContent="center"
            alignItems="center"
            sx={{ mb: { xs: 4, md: 6 } }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<Email />}
              sx={{
                backgroundColor: brandColors.mustardYellow,
                color: brandColors.charcoal,
                fontSize: '1.125rem',
                fontWeight: 600,
                px: { xs: 4, md: 6 },
                py: { xs: 1.5, md: 2 },
                borderRadius: '12px',
                textTransform: 'none',
                boxShadow: '0 4px 14px 0 rgba(227, 181, 5, 0.4)',
                '&:hover': {
                  backgroundColor: '#C19E04',
                  boxShadow: '0 6px 20px 0 rgba(227, 181, 5, 0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
                minWidth: { xs: '280px', sm: 'auto' },
              }}
            >
              Get Early Access
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<Launch />}
              sx={{
                borderColor: brandColors.white,
                color: brandColors.white,
                fontSize: '1.125rem',
                fontWeight: 500,
                px: { xs: 4, md: 6 },
                py: { xs: 1.5, md: 2 },
                borderRadius: '12px',
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: brandColors.mustardYellow,
                  color: brandColors.mustardYellow,
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
                minWidth: { xs: '280px', sm: 'auto' },
              }}
            >
              Learn More
            </Button>
          </Stack>

          {/* Value Props */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 6 }}
            justifyContent="center"
            alignItems="center"
            sx={{ opacity: 0.9 }}
          >
            <Typography
              variant="body1"
              sx={{
                color: brandColors.white,
                fontSize: '1rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                '&:before': {
                  content: '"✓"',
                  color: brandColors.mustardYellow,
                  fontWeight: 'bold',
                  mr: 1,
                  fontSize: '1.2rem',
                },
              }}
            >
              Always free to use
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: brandColors.white,
                fontSize: '1rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                '&:before': {
                  content: '"✓"',
                  color: brandColors.mustardYellow,
                  fontWeight: 'bold',
                  mr: 1,
                  fontSize: '1.2rem',
                },
              }}
            >
              Verified neighbors
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: brandColors.white,
                fontSize: '1rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                '&:before': {
                  content: '"✓"',
                  color: brandColors.mustardYellow,
                  fontWeight: 'bold',
                  mr: 1,
                  fontSize: '1.2rem',
                },
              }}
            >
              Built for community
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
