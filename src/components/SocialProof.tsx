'use client';

import { FormatQuote } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

const testimonials = [
  {
    quote:
      "I love being able to borrow a pressure washer when I need it without having to buy and store one. It's saved me hundreds of dollars!",
    name: 'Sarah M.',
    location: 'Portland, OR',
    avatar: 'S',
    color: brandColors.inkBlue,
  },
  {
    quote:
      "StuffLibrary helped me connect with my neighbors in ways I never expected. We've built real friendships through sharing.",
    name: 'Mike T.',
    location: 'Austin, TX',
    avatar: 'M',
    color: brandColors.mustardYellow,
  },
  {
    quote:
      "As someone who cares about the environment, I love that we're maximizing the use of existing items instead of buying new.",
    name: 'Jennifer L.',
    location: 'Seattle, WA',
    avatar: 'J',
    color: brandColors.tomatoRed,
  },
];

export function SocialProof() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: spacing.xxxl / 4, md: spacing.xxxl / 2 },
        backgroundColor: brandColors.warmCream,
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 3,
              letterSpacing: '-0.01em',
            }}
          >
            Trusted by neighbors{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.inkBlue,
              }}
            >
              everywhere
            </Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Real stories from communities already building connections through
            sharing.
          </Typography>
        </Box>

        {/* Testimonials Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 3, md: 4 },
          }}
        >
          {testimonials.map((testimonial, index) => (
            <Box key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  backgroundColor: brandColors.white,
                  border: `1px solid ${brandColors.softGray}`,
                  borderRadius: 3,
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px 0 rgba(30, 58, 95, 0.1)',
                    borderColor: testimonial.color,
                  },
                }}
              >
                {/* Quote Icon */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: 24,
                    width: 40,
                    height: 40,
                    backgroundColor: testimonial.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FormatQuote
                    sx={{ color: brandColors.white, fontSize: 20 }}
                  />
                </Box>

                <CardContent
                  sx={{
                    p: { xs: 3, md: 4 },
                    pt: 4,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Quote */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                      fontSize: '1rem',
                      fontStyle: 'italic',
                      mb: 3,
                      flexGrow: 1,
                    }}
                  >
                    &ldquo;{testimonial.quote}&rdquo;
                  </Typography>

                  {/* Author */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        backgroundColor: `${testimonial.color}20`,
                        color: testimonial.color,
                        width: 48,
                        height: 48,
                        fontWeight: 600,
                      }}
                    >
                      {testimonial.avatar}
                    </Avatar>

                    <Box>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          fontSize: '1rem',
                        }}
                      >
                        {testimonial.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: brandColors.charcoal,
                          opacity: 0.7,
                          fontSize: '0.875rem',
                        }}
                      >
                        {testimonial.location}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 8 } }}>
          <Chip
            label="Coming to your neighborhood soon"
            sx={{
              backgroundColor: brandColors.inkBlue,
              color: brandColors.white,
              fontWeight: 500,
              px: 2,
              py: 1,
              fontSize: '0.95rem',
            }}
          />
        </Box>
      </Container>
    </Box>
  );
}
