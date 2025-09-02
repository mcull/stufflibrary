import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';

const testimonials = [
  {
    initials: 'SM',
    quote:
      '"I borrowed a pressure washer from my neighbor instead of buying one. Saved $200 and got to chat with someone I\'d never met!"',
    name: 'Sarah M.',
    role: 'Beta User',
  },
  {
    initials: 'JD',
    quote:
      '"My camping gear sits unused 11 months a year. Now it helps three families enjoy the outdoors while I feel good about sharing."',
    name: 'James D.',
    role: 'Beta User',
  },
  {
    initials: 'AL',
    quote:
      '"Our neighborhood group has become so much closer. We&apos;re actually helping each other and it feels like a real community again."',
    name: 'Ana L.',
    role: 'Beta User',
  },
];

export function InBeta() {
  return (
    <Box
      component="section"
      sx={{
        backgroundColor: 'rgba(76, 161, 170, 0.05)',
        py: { xs: 8, md: 16 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center' }}>
          {/* In Beta Label */}
          <Typography
            sx={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              color: '#DE703A',
              fontWeight: 500,
              mb: 6,
              fontSize: { xs: '1rem', md: '1.125rem' },
            }}
          >
            In Beta
          </Typography>

          {/* Title */}
          <Typography
            variant="h2"
            sx={{
              fontFamily:
                'var(--font-primary, "Special Elite"), "Courier New", Monaco, Consolas, "Liberation Mono", monospace',
              fontSize: { xs: '1.875rem', md: '3rem' },
              fontWeight: 400,
              color: '#3F342B',
              mb: 6,
            }}
          >
            We&apos;re Still Building Something Special
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              color: 'rgba(63, 52, 43, 0.8)',
              lineHeight: 1.6,
              mb: 8,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            StuffLibrary is currently in beta as we perfect the experience of
            neighborly sharing. Join our early community to help shape the
            future of how we borrow, lend, and belong together.
          </Typography>

          {/* CTA Button */}
          <Box sx={{ mb: 16 }}>
            <Button
              component={Link}
              href="/about"
              variant="outlined"
              sx={{
                border: '1px solid #3F342B',
                color: '#3F342B',
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '1rem',
                fontWeight: 400,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: '#3F342B',
                  color: 'white',
                },
              }}
            >
              Learn More
            </Button>
          </Box>

          {/* Testimonials */}
          <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, 1fr)',
                },
                gap: { xs: 6, md: 8 },
              }}
            >
              {testimonials.map((testimonial, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      border: '2px solid black',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 4,
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'black',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                      }}
                    >
                      {testimonial.initials}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                      color: 'rgba(63, 52, 43, 0.8)',
                      fontStyle: 'italic',
                      mb: 3,
                      lineHeight: 1.5,
                    }}
                  >
                    {testimonial.quote}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                      color: '#3F342B',
                      fontWeight: 500,
                    }}
                  >
                    {testimonial.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily:
                        'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                      color: 'rgba(63, 52, 43, 0.6)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {testimonial.role}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
