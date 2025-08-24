import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Avatar,
} from '@mui/material';
import Link from 'next/link';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function LibraryComponentsDemo() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: brandColors.warmCream,
        py: spacing.lg / 16,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: spacing.xl / 16 }}>
          <Button
            component={Link}
            href="/demo"
            startIcon={<ArrowBackIcon />}
            sx={{
              mb: spacing.md / 16,
              color: brandColors.inkBlue,
              textTransform: 'none',
            }}
          >
            Back to Demos
          </Button>

          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: spacing.sm / 16,
            }}
          >
            Library-Inspired Components
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
            }}
          >
            Checkout cards, library stamps, book spine navigation, and other
            elements that bring the warm familiarity of traditional libraries to
            digital sharing.
          </Typography>
        </Box>

        <Stack spacing={spacing.xl / 16}>
          {/* Vintage Checkout Card */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Vintage Checkout Card
            </Typography>

            <Card
              sx={{
                maxWidth: 400,
                backgroundColor: '#F8F6F0', // Aged paper color
                border: '1px solid #D4C4A8',
                boxShadow:
                  '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23D4C4A8" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  opacity: 0.3,
                  pointerEvents: 'none',
                },
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                {/* Library Header */}
                <Box sx={{ textAlign: 'center', mb: spacing.md / 16 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'serif',
                      fontWeight: 700,
                      color: brandColors.inkBlue,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontSize: '0.875rem',
                    }}
                  >
                    Stuff Library
                  </Typography>
                  <Box
                    sx={{
                      width: 60,
                      height: 1,
                      backgroundColor: brandColors.inkBlue,
                      mx: 'auto',
                      mt: spacing.xs / 16,
                    }}
                  />
                </Box>

                {/* Item Info */}
                <Box sx={{ mb: spacing.md / 16 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'serif',
                      fontSize: '0.75rem',
                      color: brandColors.charcoal,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: spacing.xs / 16,
                    }}
                  >
                    Title
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'serif',
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      borderBottom: '1px solid #D4C4A8',
                      pb: spacing.xs / 16,
                    }}
                  >
                    Power Drill - DeWalt 20V
                  </Typography>
                </Box>

                {/* Borrower Info */}
                <Stack
                  direction="row"
                  spacing={spacing.sm / 16}
                  alignItems="center"
                  sx={{ mb: spacing.md / 16 }}
                >
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                    JD
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: brandColors.charcoal }}
                    >
                      John Doe
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                    >
                      Member #A7B2C4
                    </Typography>
                  </Box>
                </Stack>

                {/* Checkout Stamps */}
                <Box sx={{ mb: spacing.md / 16 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'serif',
                      fontSize: '0.75rem',
                      color: brandColors.charcoal,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: spacing.sm / 16,
                    }}
                  >
                    Checkout History
                  </Typography>

                  <Stack spacing={spacing.xs / 16}>
                    {[
                      {
                        date: 'DEC 15 2024',
                        status: 'returned',
                        color: '#27AE60',
                      },
                      {
                        date: 'NOV 22 2024',
                        status: 'returned',
                        color: '#27AE60',
                      },
                      {
                        date: 'OCT 08 2024',
                        status: 'returned',
                        color: '#27AE60',
                      },
                      {
                        date: 'JAN 12 2025',
                        status: 'due soon',
                        color: brandColors.mustardYellow,
                      },
                    ].map((stamp, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm / 16,
                          opacity: index === 3 ? 1 : 0.7,
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 20,
                            backgroundColor: stamp.color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            letterSpacing: '0.05em',
                            transform: `rotate(${Math.random() * 6 - 3}deg)`,
                            borderRadius: 2,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        >
                          {stamp.date}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: stamp.color,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontSize: '0.625rem',
                          }}
                        >
                          {stamp.status}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                {/* Signature Line */}
                <Box
                  sx={{
                    borderTop: '1px solid #D4C4A8',
                    pt: spacing.sm / 16,
                    mt: spacing.md / 16,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.7,
                      fontSize: '0.625rem',
                      fontFamily: 'serif',
                    }}
                  >
                    Borrower&apos;s Signature:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'cursive',
                      color: brandColors.inkBlue,
                      mt: spacing.xs / 16,
                      fontSize: '1rem',
                    }}
                  >
                    John Doe
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Library Stamp Collection */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Library Stamp Collection
            </Typography>

            <Stack
              direction="row"
              spacing={spacing.md / 16}
              flexWrap="wrap"
              useFlexGap
            >
              {[
                {
                  label: 'CHECKED OUT',
                  color: brandColors.inkBlue,
                  rotation: -3,
                },
                {
                  label: 'DUE SOON',
                  color: brandColors.mustardYellow,
                  rotation: 2,
                },
                { label: 'RETURNED', color: '#27AE60', rotation: -1 },
                { label: 'OVERDUE', color: brandColors.tomatoRed, rotation: 4 },
                { label: 'AVAILABLE', color: '#27AE60', rotation: -2 },
                { label: 'RESERVED', color: '#9B59B6', rotation: 1 },
              ].map((stamp) => (
                <Box
                  key={stamp.label}
                  sx={{
                    backgroundColor: stamp.color,
                    color: 'white',
                    padding: `${spacing.sm / 16}rem ${spacing.md / 16}rem`,
                    borderRadius: 2,
                    transform: `rotate(${stamp.rotation}deg)`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: `rotate(${stamp.rotation}deg) scale(1.05)`,
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {stamp.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Book Spine Navigation */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Book Spine Navigation
            </Typography>

            <Box sx={{ display: 'flex', height: 200, gap: 2 }}>
              {[
                { title: 'Tools', color: brandColors.inkBlue, items: 23 },
                { title: 'Kitchen', color: brandColors.tomatoRed, items: 18 },
                { title: 'Garden', color: '#27AE60', items: 31 },
                {
                  title: 'Sports',
                  color: brandColors.mustardYellow,
                  items: 15,
                },
                { title: 'Electronics', color: '#9B59B6', items: 12 },
              ].map((book, _index) => (
                <Box
                  key={book.title}
                  sx={{
                    width: 80,
                    height: '100%',
                    backgroundColor: book.color,
                    borderRadius: '8px 8px 0 0',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      zIndex: 10,
                    },
                  }}
                >
                  {/* Book spine text */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: spacing.md / 16,
                      left: '50%',
                      transform: 'translateX(-50%) rotate(90deg)',
                      transformOrigin: 'center',
                      color: 'white',
                      textAlign: 'center',
                      width: 120,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {book.title}
                    </Typography>
                  </Box>

                  {/* Item count badge */}
                  <Chip
                    label={book.items}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: spacing.sm / 16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: book.color,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
