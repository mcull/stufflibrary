import { People, AttachMoney, Recycling, Shield } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

const features = [
  {
    icon: People,
    title: 'Build Community',
    description:
      'Connect with neighbors and build meaningful relationships through sharing and mutual trust.',
    color: brandColors.inkBlue,
  },
  {
    icon: AttachMoney,
    title: 'Save Money',
    description:
      'Access tools and items when you need them without the cost of ownership or storage.',
    color: brandColors.mustardYellow,
  },
  {
    icon: Recycling,
    title: 'Reduce Waste',
    description:
      'Maximize the utility of existing items and reduce environmental impact through sharing.',
    color: brandColors.tomatoRed,
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    description:
      'Verified neighbors, secure transactions, and community-driven accountability.',
    color: brandColors.inkBlue,
  },
];

export function FeatureShowcase() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: spacing.xxxl / 4, md: spacing.xxxl / 2 }, // 16px to 32px scale
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
            Why neighbors love{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.inkBlue,
              }}
            >
              StuffLibrary
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
            Sharing builds stronger communities while creating value for
            everyone involved.
          </Typography>
        </Box>

        {/* Features Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(2, 1fr)',
              xl: 'repeat(4, 1fr)',
            },
            gap: { xs: 3, md: 4 },
            maxWidth: { lg: '800px', xl: 'none' },
            mx: { lg: 'auto', xl: '0' },
          }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;

            return (
              <Box key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    minHeight: '280px', // Fixed minimum height for consistency
                    backgroundColor: brandColors.warmCream,
                    border: `1px solid ${brandColors.softGray}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px 0 rgba(30, 58, 95, 0.1)',
                      borderColor: feature.color,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: { xs: 3, md: 4 },
                      textAlign: 'center',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        backgroundColor: `${feature.color}15`, // 15% opacity
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <IconComponent
                        sx={{
                          fontSize: 36,
                          color: feature.color,
                        }}
                      />
                    </Box>

                    {/* Content */}
                    <Stack spacing={2} sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h5"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          fontSize: { xs: '1.25rem', md: '1.375rem' },
                        }}
                      >
                        {feature.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: brandColors.charcoal,
                          opacity: 0.8,
                          lineHeight: 1.6,
                          fontSize: '0.95rem',
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>

        {/* Call to Action */}
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
            Join the movement toward more sustainable, connected communities
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
