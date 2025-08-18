import { Search, HandshakeOutlined, SwapHoriz } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

const steps = [
  {
    number: '1',
    icon: Search,
    title: 'Find What You Need',
    description:
      'Browse items in your neighborhood or post a request for something specific.',
    color: brandColors.inkBlue,
  },
  {
    number: '2',
    icon: HandshakeOutlined,
    title: 'Connect Safely',
    description:
      'Message verified neighbors and arrange pickup times that work for everyone.',
    color: brandColors.mustardYellow,
  },
  {
    number: '3',
    icon: SwapHoriz,
    title: 'Share & Return',
    description:
      'Use the item when you need it, then return it in good condition. Build trust!',
    color: brandColors.tomatoRed,
  },
];

export function HowItWorks() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: spacing.xxxl / 4, md: spacing.xxxl / 2 },
        backgroundColor: brandColors.white,
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
            How{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.inkBlue,
              }}
            >
              it works
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
            Three simple steps to start sharing with your neighbors
          </Typography>
        </Box>

        {/* Steps */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(3, 1fr)',
            },
            gap: { xs: 4, md: 3 },
            position: 'relative',
            mt: 2, // Add top margin for badge overflow space
          }}
        >
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isLastStep = index === steps.length - 1;

            return (
              <Box key={index} sx={{ position: 'relative' }}>
                {/* Step Number - Outside container */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -16,
                    left: 24,
                    width: 48,
                    height: 32,
                    backgroundColor: step.color,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: brandColors.white,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    zIndex: 3,
                  }}
                >
                  {step.number}
                </Box>

                {/* Connecting Line (desktop only) */}
                {!isLastStep && (
                  <Box
                    sx={{
                      display: { xs: 'none', md: 'block' },
                      position: 'absolute',
                      top: 60,
                      right: -24,
                      width: 48,
                      height: 2,
                      backgroundColor: brandColors.softGray,
                      zIndex: 0,
                    }}
                  />
                )}

                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    backgroundColor: brandColors.warmCream,
                    border: `1px solid ${brandColors.softGray}`,
                    borderRadius: 3,
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px 0 rgba(30, 58, 95, 0.1)',
                      borderColor: step.color,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: { xs: 3, md: 4 },
                      pt: { xs: 4, md: 5 }, // Extra top padding to accommodate the badge
                      textAlign: 'center',
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: `${step.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        mt: 2,
                      }}
                    >
                      <IconComponent
                        sx={{
                          fontSize: 32,
                          color: step.color,
                        }}
                      />
                    </Box>

                    {/* Content */}
                    <Stack spacing={2}>
                      <Typography
                        variant="h5"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          fontSize: { xs: '1.25rem', md: '1.375rem' },
                        }}
                      >
                        {step.title}
                      </Typography>

                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          opacity: 0.8,
                          lineHeight: 1.6,
                          fontSize: '1rem',
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 8 } }}>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.1rem',
              color: brandColors.charcoal,
              opacity: 0.8,
              fontStyle: 'italic',
            }}
          >
            Simple, safe, and built for community
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
