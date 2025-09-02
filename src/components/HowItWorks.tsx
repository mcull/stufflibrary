import { Box, Container, Typography, Card, CardContent } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

const steps = [
  {
    number: '1',
    title: 'Buy Less Borrow More',
    description:
      "When you need an infrequently used item, browse what's available nearby. Avoid buying something you'll rarely use and feel resourceful without imposing on anyone.",
    color: '#4CA1AA',
    bgColor: 'rgba(76, 161, 170, 0.1)',
  },
  {
    number: '2',
    title: 'Lend Without Stress',
    description:
      'Make your unused items visible and lendable in a controlled way. Reduce waste, justify keeping things, and feel generous without feeling exposed.',
    color: '#DE703A',
    bgColor: 'rgba(222, 112, 58, 0.1)',
  },
  {
    number: '3',
    title: 'Belong to Your Community',
    description:
      'Join neighbors and friends in a defined group with shared norms. Build trust, know expectations, and rediscover the joy of neighborliness.',
    color: '#4CA1AA',
    bgColor: 'rgba(76, 161, 170, 0.1)',
  },
];

export function HowItWorks() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 12, md: 24 },
        backgroundColor: brandColors.white,
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 16 } }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontFamily:
                'var(--font-primary, "Special Elite"), "Courier New", Monaco, Consolas, "Liberation Mono", monospace',
              fontSize: { xs: '2rem', md: '4rem' },
              fontWeight: 400,
              color: '#3F342B',
            }}
          >
            How It Works
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
            gap: { xs: 4, md: 8 },
          }}
        >
          {steps.map((step, index) => (
            <Card
              key={index}
              elevation={8}
              sx={{
                backgroundColor: step.bgColor,
                border: 'none',
                borderRadius: 2,
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 4, md: 8 },
                  textAlign: 'center',
                }}
              >
                {/* Step Number Circle */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    backgroundColor: step.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 6,
                  }}
                >
                  <Typography
                    sx={{
                      color: 'white',
                      fontSize: '2rem',
                      fontWeight: 500,
                    }}
                  >
                    {step.number}
                  </Typography>
                </Box>

                {/* Title */}
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{
                    fontFamily:
                      'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    fontSize: { xs: '1.25rem', md: '1.25rem' },
                    fontWeight: 500,
                    color: '#3F342B',
                    mb: 4,
                  }}
                >
                  {step.title}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily:
                      'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    color: 'rgba(63, 52, 43, 0.8)',
                    lineHeight: 1.6,
                  }}
                >
                  {step.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
