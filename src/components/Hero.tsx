import { Box, Container, Typography } from '@mui/material';

export function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        backgroundColor: '#FDF2D6',
        aspectRatio: { xs: '4/3', md: '16/9' }, // Maintain aspect ratio
        minHeight: { xs: '400px', md: '500px' },
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
          alignItems: 'flex-start',
          justifyContent: 'center',
          pt: { xs: 4, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              textAlign: 'center',
              color: '#3F342B',
              px: { xs: 2, md: 0 },
              // Position text over the lighter, upper portion of the image
              mt: { xs: 2, md: 4 },
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
                  xs: '2rem',
                  sm: '2.5rem',
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
