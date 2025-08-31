'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function AboutPage() {
  return (
    <Box
      sx={{
        backgroundColor: brandColors.warmCream,
        minHeight: '100vh',
        py: { xs: spacing.sm, md: spacing.lg },
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 3,
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            Share more, buy less.
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              lineHeight: 1.6,
              maxWidth: '600px',
              mx: 'auto',
            }}
          >
            The idea behind stuff libraries
          </Typography>
        </Box>

        {/* Main Content */}
        <Stack spacing={4}>
          {/* The Problem */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🏠 Too Much Stuff, Not Enough Use
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                Think about your garage or closet. How many things do you have
                that you only use once in a while? Maybe it&apos;s a drill for
                hanging pictures, or a fancy cake pan for birthdays, or camping
                gear you use twice a year.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                Now think about your neighbors. They probably have the same
                problem! Everyone buying the same things, using them rarely, and
                running out of space to store them all.
              </Typography>
            </CardContent>
          </Card>

          {/* The Solution */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🤝 So let&apos;s make it easier to share.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                What if it were easier for us to pool our stuff among friends
                and neighbors? What if it were easier to see what the folks
                around us have and are willing to share?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                When communities work together to use things more wisely,
                everyone wins. Instead of everyone owning everything, we share
                what we have.
              </Typography>
            </CardContent>
          </Card>

          {/* The Research */}
          <Card sx={{ backgroundColor: brandColors.inkBlue, color: 'white' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  mb: 3,
                }}
              >
                🏛️ But does sharing actually work?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                A lot of people are skeptical about sharing in practice.
                Won&apos;t things get broken, or unfairly used if there&apos;s
                no central authority to supervise?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                Nobel Prize-winning economist Elinor Ostrom discovered that
                communities all over the world are great at sharing common
                resources. When it works well, it&apos;s because these
                principles are in place: clear boundaries, collective choice,
                monitoring, graduated sanctions, conflict resolution,
                recognition of rights, nested enterprises, and accountable
                governance.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                Inspired by her research, we&apos;ve designed this app to help
                communities of friends and neighbors share well and buy less
                stuff.
              </Typography>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card sx={{ backgroundColor: brandColors.mustardYellow }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                ✨ How Stuff Libraries Work
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    📱
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Share Your Stuff
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Take pictures of things you don&apos;t use often and share
                    them with neighbors
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    🔍
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Find What You Need
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Look for things you need instead of buying them new
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    🤝
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Make Friends
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Get to know your neighbors while helping each other out
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Platform Features Mapped to Ostrom's Principles */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🔧 How the platform supports good sharing
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🏠 Clear Boundaries
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Library membership defines who can participate and
                        access shared items.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🗳️ Collective Choice
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        [Placeholder for community governance features]
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        👀 Monitoring
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Borrow/return tracking and item condition reporting
                        provide transparency.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        ⚖️ Graduated Sanctions
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        [Placeholder for community moderation system]
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🤝 Conflict Resolution
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Direct messaging and community guidelines help resolve
                        issues.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🏅 Recognition of Rights
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Clear ownership records and borrower/lender protections
                        respect everyone&apos;s rights.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🌐 Nested Enterprises
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Multiple libraries can connect and coordinate at
                        different scales.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        📋 Accountable Governance
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        [Placeholder for community leadership and accountability
                        features]
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card
            sx={{
              backgroundColor: brandColors.charcoal,
              color: 'white',
              textAlign: 'center',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  mb: 3,
                }}
              >
                ✨ Share more, buy less, see how it goes!
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                Communities are pretty good at sharing when they have the right
                tools and structure. We&apos;re building those tools.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Want to try it out with your friends and neighbors?
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
