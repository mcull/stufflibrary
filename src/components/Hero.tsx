import { Box, Container, Typography } from '@mui/material';

export function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        backgroundColor: '#FDF2D6',
        height: {
          xs: '100vw', // 0px+: height = 100% of viewport width (square on mobile)
          sm: '90vw', // 600px+: height = 90% of viewport width
          md: '70vw', // 900px+: height = 70% of viewport width
          lg: '60vw', // 1200px+: height = 60% of viewport width
          xl: '50vw', // 1536px+: height = 50% of viewport width (wide on desktop)
        },
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/hero-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      {/* Content Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'flex-start', // Always pin text at the top
          justifyContent: 'center',
          pt: { xs: 3, sm: 4, md: 8 }, // Consistent top padding across devices
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: 'center',
              color: '#3F342B',
              px: { xs: 2, md: 0 },
              // Remove extra top margin since we're centering vertically
            }}
          >
            {/* Hero Headline */}
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontFamily:
                  'var(--font-primary, "Special Elite"), "Courier New", Monaco, Consolas, "Liberation Mono", monospace',
                fontSize: {
                  xs: '1.75rem', // Slightly smaller on mobile
                  sm: '2.25rem',
                  md: '3.5rem',
                  lg: '4.5rem',
                  xl: '5.5rem',
                },
                fontWeight: 400, // Special Elite doesn't have bold weight
                lineHeight: 1.1,
                mb: { xs: 2, sm: 3, md: 4 },
                letterSpacing: '-0.01em',
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
              }}
            >
              Borrow, Lend, Belong.
            </Typography>

            {/* Subheadline */}
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: {
                  xs: '0.875rem',
                  sm: '1rem',
                  md: '1.125rem',
                  lg: '1.25rem',
                },
                fontWeight: 400,
                lineHeight: 1.4,
                maxWidth: { xs: '320px', sm: '380px', md: '450px' },
                mx: 'auto',
                textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
              }}
            >
              A neighborly way to share what you have,
              <br />
              find what you need, and rediscover community.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
