import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
} from '@mui/material';
import Link from 'next/link';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function DemoPage() {
  const demos = [
    {
      title: 'Library Components',
      description:
        'Checkout cards, stamps, book spine navigation, and library-inspired elements',
      href: '/demo/library-components',
      color: brandColors.inkBlue,
    },
    {
      title: 'Item Cards Redesign',
      description:
        'Library pocket styling, borrowing history, and community story cards',
      href: '/demo/item-cards',
      color: brandColors.mustardYellow,
    },
    {
      title: 'Dashboard Concepts',
      description:
        'Community-first interfaces, activity feeds, and neighborhood visualization',
      href: '/demo/dashboard-concepts',
      color: brandColors.tomatoRed,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: brandColors.warmCream,
        py: spacing.xxxl / 16,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: spacing.xxxl / 16 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: spacing.md / 16,
              letterSpacing: '-0.02em',
            }}
          >
            Visual UX{' '}
            <Box component="span" sx={{ color: brandColors.inkBlue }}>
              Spruce-Up
            </Box>
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.5,
            }}
          >
            Transforming StuffLibrary into a &quot;friendly librarian with
            analog soul&quot; through library-inspired design components and
            community-first interfaces.
          </Typography>
        </Box>

        {/* Demo Cards */}
        <Stack spacing={spacing.lg / 16} sx={{ maxWidth: '800px', mx: 'auto' }}>
          {demos.map((demo) => (
            <Card
              key={demo.href}
              sx={{
                backgroundColor: brandColors.white,
                borderRadius: spacing.md / 16,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                border: '1px solid',
                borderColor: brandColors.softGray,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  borderColor: demo.color,
                },
              }}
            >
              <CardContent sx={{ p: spacing.lg / 16 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: spacing.md / 16,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: '250px' }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: brandColors.charcoal,
                        mb: spacing.sm / 16,
                      }}
                    >
                      {demo.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: brandColors.charcoal,
                        opacity: 0.8,
                        lineHeight: 1.5,
                      }}
                    >
                      {demo.description}
                    </Typography>
                  </Box>

                  <Button
                    component={Link}
                    href={demo.href}
                    variant="contained"
                    sx={{
                      backgroundColor: demo.color,
                      color: brandColors.white,
                      fontWeight: 600,
                      px: spacing.lg / 16,
                      py: spacing.sm / 16,
                      borderRadius: spacing.sm / 16,
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: demo.color,
                        opacity: 0.9,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      },
                    }}
                  >
                    View Demo
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Analysis Link */}
        <Box sx={{ textAlign: 'center', mt: spacing.xxxl / 16 }}>
          <Typography
            variant="body2"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.6,
              mb: spacing.md / 16,
            }}
          >
            Read the complete design analysis and recommendations
          </Typography>
          <Button
            component={Link}
            href="/visual-ux-spruce-up-analysis.md"
            target="_blank"
            variant="outlined"
            sx={{
              borderColor: brandColors.inkBlue,
              color: brandColors.inkBlue,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: brandColors.inkBlue,
                color: brandColors.white,
              },
            }}
          >
            Read Analysis Document
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
